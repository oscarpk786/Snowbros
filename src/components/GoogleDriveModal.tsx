import React, { useCallback, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  AlertTriangle,
  CloudUpload,
  Download,
  FileJson,
  FolderOpen,
  LogOut,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { ControlScheme, Difficulty } from '../game/types';
import {
  createDriveSave,
  DEFAULT_SAVE_FILENAME,
  deleteDriveFile,
  downloadDriveSave,
  DriveFileMeta,
  getAccessToken,
  googleSignIn,
  initAuth,
  listDriveFiles,
  logoutGoogle,
  SnowBrosCloudSave,
  updateDriveSave,
} from '../services/googleDrive';

interface GoogleDriveModalProps {
  open: boolean;
  onClose: () => void;
  currentSave: {
    highScore: number;
    startStageIndex: number;
    difficulty: Difficulty;
    controlScheme: ControlScheme;
  };
  onRestoreSave: (save: SnowBrosCloudSave) => void;
}

type PendingMutation =
  | { kind: 'overwrite'; file: DriveFileMeta; payload: SnowBrosCloudSave }
  | { kind: 'delete'; file: DriveFileMeta };

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  open,
  onClose,
  currentSave,
  onRestoreSave,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [files, setFiles] = useState<DriveFileMeta[]>([]);
  const [showAllFiles, setShowAllFiles] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingMutation, setPendingMutation] = useState<PendingMutation | null>(null);

  const refreshFiles = useCallback(async (allFiles = showAllFiles) => {
    if (!getAccessToken()) {
      setNeedsAuth(true);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const list = await listDriveFiles(!allFiles);
      setFiles(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to fetch Google Drive files';
      if (msg === 'AUTH_REQUIRED') {
        setNeedsAuth(true);
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [showAllFiles]);

  useEffect(() => {
    const unsub = initAuth(
      (authedUser) => {
        setUser(authedUser);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
        setFiles([]);
      }
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (open && !needsAuth && getAccessToken()) {
      void refreshFiles(showAllFiles);
    }
  }, [open, needsAuth, showAllFiles, refreshFiles]);

  if (!open) return null;

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const result = await googleSignIn();
      setUser(result.user);
      setNeedsAuth(false);
      await refreshFiles(showAllFiles);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      setErrorMessage(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logoutGoogle();
    setUser(null);
    setNeedsAuth(true);
    setFiles([]);
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const buildSavePayload = (): SnowBrosCloudSave => ({
    app: 'Snow Bros: Frost Castle',
    version: 1,
    savedAt: new Date().toISOString(),
    highScore: currentSave.highScore,
    startStageIndex: currentSave.startStageIndex,
    difficulty: currentSave.difficulty,
    controlScheme: currentSave.controlScheme,
  });

  const handleSaveToDrive = async () => {
    setErrorMessage(null);
    setStatusMessage(null);
    const payload = buildSavePayload();
    const existing = files.find((f) => f.name === DEFAULT_SAVE_FILENAME);

    if (existing) {
      // Explicit user confirmation required before overwriting existing Drive file
      setPendingMutation({ kind: 'overwrite', file: existing, payload });
      return;
    }

    setLoading(true);
    try {
      await createDriveSave(payload, DEFAULT_SAVE_FILENAME);
      setStatusMessage(`Saved "${DEFAULT_SAVE_FILENAME}" to Google Drive.`);
      await refreshFiles(showAllFiles);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save to Google Drive';
      if (msg === 'AUTH_REQUIRED') setNeedsAuth(true);
      else setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (file: DriveFileMeta) => {
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const save = await downloadDriveSave(file.id);
      onRestoreSave(save);
      setStatusMessage(
        `Restored Floor ${save.startStageIndex + 1} & High Score ${save.highScore.toLocaleString()} from "${file.name}".`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not load save file';
      if (msg === 'AUTH_REQUIRED') setNeedsAuth(true);
      else setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const confirmMutation = async () => {
    if (!pendingMutation) return;
    const action = pendingMutation;
    setPendingMutation(null);
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      if (action.kind === 'overwrite') {
        await updateDriveSave(action.file.id, action.payload);
        setStatusMessage(`Updated "${action.file.name}" in Google Drive.`);
      } else {
        await deleteDriveFile(action.file.id);
        setStatusMessage(`Deleted "${action.file.name}" from Google Drive.`);
      }
      await refreshFiles(showAllFiles);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google Drive operation failed';
      if (msg === 'AUTH_REQUIRED') setNeedsAuth(true);
      else setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#030816]/82 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drive-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-sky-200/25 bg-[#0b1838]/95 p-6 text-slate-100 backdrop-blur-md shadow-[0_28px_80px_rgba(0,0,0,0.85)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-400/15 text-sky-300">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 id="drive-modal-title" className="font-display text-xl font-bold text-white">
                Google Drive Cloud Saves
              </h2>
              <p className="text-xs text-slate-400">
                Back up your high score, unlocked floor &amp; settings
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Google Drive dialog"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Auth Gate or Connected Drive Controls */}
        {needsAuth ? (
          <div className="mt-6 space-y-5 rounded-xl border border-sky-200/15 bg-[#07112a] p-6 text-center">
            <p className="text-sm text-slate-300">
              Sign in with your Google account to save progress to Google Drive and load it on any device.
            </p>

            {/* Official Google Material Sign-In Button */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="gsi-material-button inline-flex h-11 items-center gap-3 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 active:bg-slate-100 disabled:opacity-60 transition-colors cursor-pointer"
              >
                <span className="gsi-material-button-icon h-5 w-5 shrink-0">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ display: 'block' }}
                    aria-hidden="true"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                </span>
                <span className="gsi-material-button-contents font-semibold">
                  {isLoggingIn ? 'Signing in...' : 'Sign in with Google'}
                </span>
              </button>
            </div>

            {errorMessage && (
              <p className="text-xs text-rose-400">{errorMessage}</p>
            )}
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {/* Signed-in account bar */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-sky-200/15 bg-[#07112a] px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {user?.displayName || 'Google Account'}
                </p>
                <p className="truncate text-xs text-slate-400">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-sky-200/15 px-3 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors shrink-0 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>

            {/* Current Local Progress Summary + Save CTA */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200/15 bg-[#0e1f47] px-4 py-3">
              <div className="space-y-0.5 text-xs text-slate-300">
                <div>
                  High Score{' '}
                  <strong className="font-mono-num text-amber-300">
                    {currentSave.highScore.toLocaleString()}
                  </strong>
                  <span aria-hidden="true" className="mx-1.5 text-slate-500">·</span>
                  Start Floor{' '}
                  <strong className="font-mono-num text-sky-300">
                    {String(currentSave.startStageIndex + 1).padStart(3, '0')}
                  </strong>
                </div>
                <div className="text-slate-400">
                  Mode: {currentSave.difficulty === 'chill' ? 'Chill' : 'Arcade'} · Controls:{' '}
                  {currentSave.controlScheme === 'classic' ? 'Arrows + A/S' : 'WASD'}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveToDrive}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-sky-400 px-4 font-display text-sm font-bold text-slate-950 hover:bg-sky-300 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <CloudUpload className="h-4 w-4" />
                Save to Drive
              </button>
            </div>

            {/* Drive File Browser Header */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1 rounded-lg border border-sky-200/15 bg-[#07112a] p-1">
                <button
                  type="button"
                  onClick={() => setShowAllFiles(false)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    !showAllFiles ? 'bg-sky-400 text-slate-950' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Game Saves
                </button>
                <button
                  type="button"
                  onClick={() => setShowAllFiles(true)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    showAllFiles ? 'bg-sky-400 text-slate-950' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  All Drive Files
                </button>
              </div>

              <button
                type="button"
                onClick={() => void refreshFiles(showAllFiles)}
                disabled={loading}
                aria-label="Refresh Google Drive files"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-sky-200/15 px-2.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {/* Status / Error feedback */}
            {statusMessage && (
              <p className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                {statusMessage}
              </p>
            )}
            {errorMessage && (
              <p className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {errorMessage}
              </p>
            )}

            {/* File List */}
            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {loading && files.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  Loading Google Drive files...
                </p>
              ) : files.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  No Snow Bros save files found yet. Click Save to Drive to create one.
                </p>
              ) : (
                files.map((file) => {
                  const isJson =
                    file.mimeType === 'application/json' || file.name.endsWith('.json');
                  return (
                    <div
                      key={file.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-sky-200/10 bg-[#07112a] px-3.5 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <FileJson className="h-4 w-4 shrink-0 text-sky-300" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-100">
                            {file.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {file.modifiedTime
                              ? new Date(file.modifiedTime).toLocaleString()
                              : 'Drive file'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isJson && (
                          <button
                            type="button"
                            onClick={() => void handleRestore(file)}
                            disabled={loading}
                            className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#163168] px-2.5 text-xs font-semibold text-sky-200 hover:bg-sky-400 hover:text-slate-950 transition-colors cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Load
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setPendingMutation({ kind: 'delete', file })}
                          disabled={loading}
                          aria-label={`Delete ${file.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Explicit Confirmation Modal for Overwrite or Delete Operations */}
        {pendingMutation && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#020612]/80 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-amber-300/30 bg-[#0d1c42] p-6 text-slate-100 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display text-lg font-bold text-white">
                    {pendingMutation.kind === 'overwrite'
                      ? 'Overwrite Drive Save?'
                      : 'Delete Drive File?'}
                  </h3>
                  <p className="text-sm text-slate-300">
                    {pendingMutation.kind === 'overwrite'
                      ? `Update the contents of "${pendingMutation.file.name}" in your Google Drive with your current progress?`
                      : `Delete "${pendingMutation.file.name}" from your Google Drive? This action cannot be undone.`}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPendingMutation(null)}
                  className="h-10 rounded-lg border border-sky-200/20 px-4 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void confirmMutation()}
                  className={`h-10 rounded-lg px-4 text-sm font-bold text-slate-950 transition-colors cursor-pointer ${
                    pendingMutation.kind === 'delete'
                      ? 'bg-rose-400 hover:bg-rose-300'
                      : 'bg-amber-400 hover:bg-amber-300'
                  }`}
                >
                  {pendingMutation.kind === 'delete' ? 'Delete' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
