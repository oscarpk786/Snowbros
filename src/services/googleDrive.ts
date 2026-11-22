import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { ControlScheme, Difficulty } from '../game/types';

export const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.scripts',
];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
for (const scope of SCOPES) {
  provider.addScope(scope);
}

let isSigningIn = false;
// Strictly in-memory OAuth access token cache (never localStorage/sessionStorage)
let cachedAccessToken: string | null = null;

export function initAuth(
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
): () => void {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
}

export async function googleSignIn(): Promise<{ user: User; accessToken: string }> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Drive access token');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
}

export function getAccessToken(): string | null {
  return cachedAccessToken;
}

export async function logoutGoogle(): Promise<void> {
  await auth.signOut();
  cachedAccessToken = null;
}

export interface DriveFileMeta {
  id: string;
  name: string;
  modifiedTime?: string;
  size?: string;
  mimeType?: string;
}

export interface SnowBrosCloudSave {
  app: 'Snow Bros: Frost Castle';
  version: number;
  savedAt: string;
  highScore: number;
  startStageIndex: number;
  difficulty: Difficulty;
  controlScheme: ControlScheme;
}

export const DEFAULT_SAVE_FILENAME = 'snow-bros-frost-castle-save.json';

function requireToken(): string {
  if (!cachedAccessToken) {
    throw new Error('AUTH_REQUIRED');
  }
  return cachedAccessToken;
}

export async function listDriveFiles(onlyGameSaves = true): Promise<DriveFileMeta[]> {
  const token = requireToken();
  const q = onlyGameSaves
    ? "trashed = false and name contains 'snow-bros'"
    : 'trashed = false';
  const params = new URLSearchParams({
    q,
    fields: 'files(id,name,modifiedTime,size,mimeType)',
    orderBy: 'modifiedTime desc',
    pageSize: '20',
  });
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    cachedAccessToken = null;
    throw new Error('AUTH_REQUIRED');
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive list failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { files?: DriveFileMeta[] };
  return data.files ?? [];
}

export async function downloadDriveSave(fileId: string): Promise<SnowBrosCloudSave> {
  const token = requireToken();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (res.status === 401) {
    cachedAccessToken = null;
    throw new Error('AUTH_REQUIRED');
  }
  if (!res.ok) {
    throw new Error(`Drive download failed (${res.status})`);
  }
  const parsed = (await res.json()) as Partial<SnowBrosCloudSave>;
  if (typeof parsed.highScore !== 'number' || typeof parsed.startStageIndex !== 'number') {
    throw new Error('Selected file is not a valid Snow Bros save file.');
  }
  return {
    app: 'Snow Bros: Frost Castle',
    version: typeof parsed.version === 'number' ? parsed.version : 1,
    savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
    highScore: Math.max(0, Math.floor(parsed.highScore)),
    startStageIndex: Math.max(0, Math.min(99, Math.floor(parsed.startStageIndex))),
    difficulty: parsed.difficulty === 'chill' ? 'chill' : 'arcade',
    controlScheme: parsed.controlScheme === 'wasd' ? 'wasd' : 'classic',
  };
}

export async function createDriveSave(saveData: SnowBrosCloudSave, filename = DEFAULT_SAVE_FILENAME): Promise<DriveFileMeta> {
  const token = requireToken();
  const boundary = 'snowbros_drive_boundary_' + Date.now();
  const metadata = JSON.stringify({
    name: filename,
    mimeType: 'application/json',
    description: 'Snow Bros: Frost Castle progress & high score backup',
  });
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${JSON.stringify(saveData, null, 2)}\r\n` +
    `--${boundary}--`;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,size,mimeType',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  if (res.status === 401) {
    cachedAccessToken = null;
    throw new Error('AUTH_REQUIRED');
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive upload failed (${res.status}): ${text}`);
  }
  return (await res.json()) as DriveFileMeta;
}

export async function updateDriveSave(fileId: string, saveData: SnowBrosCloudSave): Promise<DriveFileMeta> {
  const token = requireToken();
  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id,name,modifiedTime,size,mimeType`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(saveData, null, 2),
    }
  );
  if (res.status === 401) {
    cachedAccessToken = null;
    throw new Error('AUTH_REQUIRED');
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive update failed (${res.status}): ${text}`);
  }
  return (await res.json()) as DriveFileMeta;
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  const token = requireToken();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (res.status === 401) {
    cachedAccessToken = null;
    throw new Error('AUTH_REQUIRED');
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive delete failed (${res.status}): ${text}`);
  }
}
