import {
  BossKind,
  EnemyKind,
  EnemySpawn,
  Platform,
  StageConfig,
  StagePalette,
} from './types';

export const PLAYFIELD_WIDTH = 800;
export const PLAYFIELD_HEIGHT = 600;
export const WALL_THICKNESS = 22;
export const FLOOR_Y = 560;

const PALETTE_COURTYARD: StagePalette = {
  skyTop: '#081126',
  skyBottom: '#16294d',
  brickMain: '#475b7c',
  brickDark: '#233149',
  brickLight: '#6b83a8',
  snowCap: '#f4f9ff',
  snowShadow: '#b6d5f2',
  accentGlow: '#38bdf8',
};

const PALETTE_LANTERN: StagePalette = {
  skyTop: '#130d26',
  skyBottom: '#291f4a',
  brickMain: '#5d4d7a',
  brickDark: '#33274a',
  brickLight: '#8271a3',
  snowCap: '#f5f8ff',
  snowShadow: '#c7cde8',
  accentGlow: '#fbbf24',
};

const PALETTE_CRYSTAL: StagePalette = {
  skyTop: '#061826',
  skyBottom: '#0f364c',
  brickMain: '#346d85',
  brickDark: '#194052',
  brickLight: '#5897b0',
  snowCap: '#f0feff',
  snowShadow: '#a6ecf5',
  accentGlow: '#22d3ee',
};

const PALETTE_CELLAR: StagePalette = {
  skyTop: '#1f0b15',
  skyBottom: '#3c1627',
  brickMain: '#6e3a4a',
  brickDark: '#411c28',
  brickLight: '#945367',
  snowCap: '#fff4f6',
  snowShadow: '#f9c7d0',
  accentGlow: '#fb7185',
};

const PALETTE_OBSERVATORY: StagePalette = {
  skyTop: '#081621',
  skyBottom: '#143645',
  brickMain: '#366877',
  brickDark: '#1a3944',
  brickLight: '#528d9e',
  snowCap: '#f2fdfa',
  snowShadow: '#9eece0',
  accentGlow: '#2dd4bf',
};

const PALETTE_FOUNDRY: StagePalette = {
  skyTop: '#190e09',
  skyBottom: '#361e14',
  brickMain: '#764938',
  brickDark: '#44261b',
  brickLight: '#9b644f',
  snowCap: '#fff9f2',
  snowShadow: '#fbd3ad',
  accentGlow: '#fb923c',
};

const PALETTE_AURORA: StagePalette = {
  skyTop: '#091926',
  skyBottom: '#163640',
  brickMain: '#336b63',
  brickDark: '#193e39',
  brickLight: '#4e948a',
  snowCap: '#effdf7',
  snowShadow: '#a8eed1',
  accentGlow: '#34d399',
};

const PALETTE_SANCTUM: StagePalette = {
  skyTop: '#0a1224',
  skyBottom: '#1c244d',
  brickMain: '#4c596e',
  brickDark: '#1e283b',
  brickLight: '#6e7e96',
  snowCap: '#f2f9ff',
  snowShadow: '#b9e0fa',
  accentGlow: '#a78bfa',
};

const FLOOR_PLAT: Platform = {
  x: 0,
  y: FLOOR_Y,
  w: PLAYFIELD_WIDTH,
  h: 40,
  isFloor: true,
};

interface ChapterTheme {
  name: string;
  palette: StagePalette;
  bossKind: BossKind;
  bossName: string;
}

const CHAPTERS: ChapterTheme[] = [
  { name: 'Castle Courtyard', palette: PALETTE_COURTYARD, bossKind: 'king_scorch', bossName: 'King Scorch' },
  { name: 'Lantern Keep', palette: PALETTE_LANTERN, bossKind: 'frost_warden', bossName: 'Frost Warden' },
  { name: 'Crystal Spire', palette: PALETTE_CRYSTAL, bossKind: 'baron_magma', bossName: 'Baron Magma' },
  { name: 'Clockwork Belfry', palette: PALETTE_OBSERVATORY, bossKind: 'king_scorch', bossName: 'Dread Scorch' },
  { name: 'Obsidian Cellar', palette: PALETTE_CELLAR, bossKind: 'frost_warden', bossName: 'Glacial Knight' },
  { name: 'Frostbite Foundry', palette: PALETTE_FOUNDRY, bossKind: 'baron_magma', bossName: 'Inferno Lord' },
  { name: 'Aurora Bridge', palette: PALETTE_AURORA, bossKind: 'emperor_blizzor', bossName: 'Frost Regent' },
  { name: 'Starlight Dome', palette: PALETTE_OBSERVATORY, bossKind: 'baron_magma', bossName: 'Crimson Sovereign' },
  { name: 'Glacial Gauntlet', palette: PALETTE_CRYSTAL, bossKind: 'frost_warden', bossName: 'Absolute Zero' },
  { name: 'Frost Wyrm Sanctum', palette: PALETTE_SANCTUM, bossKind: 'emperor_blizzor', bossName: 'Emperor Blizzor' },
];

interface ArenaTemplate {
  platforms: Platform[];
  playerSpawn: { x: number; y: number };
  slots: Array<{ x: number; y: number; dir: 1 | -1 }>;
}

// 18 sequential Snow Bros arcade-faithful stage layouts (Floors 1-9 map directly to REAL Snow Bros Floors 1-9!)
const REAL_ARCADE_LAYOUTS: ArenaTemplate[] = [
  // FLOOR 1: Classic Snow Bros Stage 1 (side bottom ledges, center bridge, upper wings, top bridge, crown)
  {
    platforms: [
      FLOOR_PLAT,
      { x: 22, y: 472, w: 250, h: 16 },
      { x: 528, y: 472, w: 250, h: 16 },
      { x: 185, y: 384, w: 430, h: 16 },
      { x: 22, y: 296, w: 220, h: 16 },
      { x: 558, y: 296, w: 220, h: 16 },
      { x: 165, y: 208, w: 470, h: 16 },
      { x: 280, y: 126, w: 240, h: 16 },
    ],
    playerSpawn: { x: 400, y: FLOOR_Y },
    slots: [
      { x: 135, y: 472, dir: 1 },
      { x: 665, y: 472, dir: -1 },
      { x: 380, y: 384, dir: 1 },
      { x: 400, y: 208, dir: -1 },
      { x: 120, y: 296, dir: 1 },
      { x: 680, y: 296, dir: -1 },
      { x: 400, y: 126, dir: 1 },
    ],
  },

  // FLOOR 2: Real Snow Bros Stage 2 (Central Stone Pillar Split + Staggered Side Steps)
  {
    platforms: [
      FLOOR_PLAT,
      { x: 386, y: 296, w: 28, h: 176, isWall: true },
      { x: 60, y: 472, w: 260, h: 16 },
      { x: 480, y: 472, w: 260, h: 16 },
      { x: 22, y: 384, w: 220, h: 16 },
      { x: 558, y: 384, w: 220, h: 16 },
      { x: 145, y: 296, w: 510, h: 16 },
      { x: 22, y: 210, w: 210, h: 16 },
      { x: 568, y: 210, w: 210, h: 16 },
      { x: 260, y: 128, w: 280, h: 16 },
    ],
    playerSpawn: { x: 180, y: FLOOR_Y },
    slots: [
      { x: 620, y: FLOOR_Y, dir: -1 },
      { x: 180, y: 472, dir: 1 },
      { x: 620, y: 472, dir: -1 },
      { x: 120, y: 384, dir: 1 },
      { x: 680, y: 384, dir: -1 },
      { x: 260, y: 296, dir: 1 },
      { x: 540, y: 296, dir: -1 },
      { x: 120, y: 210, dir: 1 },
      { x: 680, y: 210, dir: -1 },
      { x: 400, y: 128, dir: 1 },
    ],
  },

  // FLOOR 3: Real Snow Bros Stage 3 (Double Center Platforms & Outer Ledges)
  {
    platforms: [
      FLOOR_PLAT,
      { x: 22, y: 472, w: 220, h: 16 },
      { x: 558, y: 472, w: 220, h: 16 },
      { x: 260, y: 404, w: 280, h: 16 },
      { x: 50, y: 320, w: 200, h: 16 },
      { x: 550, y: 320, w: 200, h: 16 },
      { x: 230, y: 236, w: 340, h: 16 },
      { x: 80, y: 150, w: 200, h: 16 },
      { x: 520, y: 150, w: 200, h: 16 },
    ],
    playerSpawn: { x: 400, y: FLOOR_Y },
    slots: [
      { x: 120, y: 472, dir: 1 },
      { x: 680, y: 472, dir: -1 },
      { x: 400, y: 404, dir: 1 },
      { x: 140, y: 320, dir: 1 },
      { x: 660, y: 320, dir: -1 },
      { x: 330, y: 236, dir: 1 },
      { x: 470, y: 236, dir: -1 },
      { x: 170, y: 150, dir: 1 },
      { x: 630, y: 150, dir: -1 },
      { x: 140, y: FLOOR_Y, dir: 1 },
    ],
  },

  // FLOOR 4: Real Snow Bros Stage 4 (Stepped Twin Towers & Central Drop Shaft)
  {
    platforms: [
      FLOOR_PLAT,
      { x: 22, y: 472, w: 270, h: 16 },
      { x: 508, y: 472, w: 270, h: 16 },
      { x: 110, y: 384, w: 220, h: 16 },
      { x: 470, y: 384, w: 220, h: 16 },
      { x: 22, y: 296, w: 250, h: 16 },
      { x: 528, y: 296, w: 250, h: 16 },
      { x: 200, y: 210, w: 400, h: 16 },
      { x: 300, y: 126, w: 200, h: 16 },
    ],
    playerSpawn: { x: 400, y: FLOOR_Y },
    slots: [
      { x: 140, y: 472, dir: 1 },
      { x: 660, y: 472, dir: -1 },
      { x: 210, y: 384, dir: 1 },
      { x: 590, y: 384, dir: -1 },
      { x: 120, y: 296, dir: 1 },
      { x: 680, y: 296, dir: -1 },
      { x: 310, y: 210, dir: 1 },
      { x: 490, y: 210, dir: -1 },
      { x: 400, y: 126, dir: -1 },
      { x: 120, y: FLOOR_Y, dir: 1 },
    ],
  },

  // FLOOR 5: Real Snow Bros Stage 5 (Wide Middle Bridges + Side Alcoves)
  {
    platforms: [
      FLOOR_PLAT,
      { x: 160, y: 472, w: 480, h: 16 },
      { x: 22, y: 384, w: 200, h: 16 },
      { x: 578, y: 384, w: 200, h: 16 },
      { x: 240, y: 302, w: 320, h: 16 },
      { x: 65, y: 218, w: 220, h: 16 },
      { x: 515, y: 218, w: 220, h: 16 },
      { x: 280, y: 134, w: 240, h: 16 },
    ],
    playerSpawn: { x: 100, y: FLOOR_Y },
    slots: [
      { x: 650, y: FLOOR_Y, dir: -1 },
      { x: 240, y: 472, dir: 1 },
      { x: 560, y: 472, dir: -1 },
      { x: 110, y: 384, dir: 1 },
      { x: 690, y: 384, dir: -1 },
      { x: 400, y: 302, dir: 1 },
      { x: 165, y: 218, dir: 1 },
      { x: 635, y: 218, dir: -1 },
      { x: 400, y: 134, dir: -1 },
      { x: 400, y: 472, dir: 1 },
    ],
  },

  // FLOOR 6: Real Snow Bros Stage 6 (Upper Twin-Wall Castle Chamber)
  {
    platforms: [
      FLOOR_PLAT,
      { x: 196, y: 208, w: 22, h: 176, isWall: true },
      { x: 582, y: 208, w: 22, h: 176, isWall: true },
      { x: 60, y: 472, w: 260, h: 16 },
      { x: 480, y: 472, w: 260, h: 16 },
      { x: 240, y: 384, w: 320, h: 16 },
      { x: 22, y: 296, w: 174, h: 16 },
      { x: 270, y: 296, w: 260, h: 16 },
      { x: 604, y: 296, w: 174, h: 16 },
      { x: 120, y: 208, w: 560, h: 16 },
      { x: 280, y: 126, w: 240, h: 16 },
    ],
    playerSpawn: { x: 400, y: FLOOR_Y },
    slots: [
      { x: 160, y: 472, dir: 1 },
      { x: 640, y: 472, dir: -1 },
      { x: 330, y: 384, dir: 1 },
      { x: 470, y: 384, dir: -1 },
      { x: 100, y: 296, dir: 1 },
      { x: 700, y: 296, dir: -1 },
      { x: 400, y: 296, dir: 1 },
      { x: 280, y: 208, dir: 1 },
      { x: 520, y: 208, dir: -1 },
      { x: 400, y: 126, dir: -1 },
    ],
  },

  // FLOOR 7: Real Snow Bros Stage 7 (Four-Tier Diagonal Cascade)
  {
    platforms: [
      FLOOR_PLAT,
      { x: 220, y: 472, w: 360, h: 16 },
      { x: 50, y: 384, w: 230, h: 16 },
      { x: 520, y: 384, w: 230, h: 16 },
      { x: 240, y: 296, w: 320, h: 16 },
      { x: 40, y: 210, w: 210, h: 16 },
      { x: 550, y: 210, w: 210, h: 16 },
      { x: 190, y: 128, w: 420, h: 16 },
    ],
    playerSpawn: { x: 400, y: 472 },
    slots: [
      { x: 120, y: FLOOR_Y, dir: 1 },
      { x: 680, y: FLOOR_Y, dir: -1 },
      { x: 160, y: 384, dir: 1 },
      { x: 640, y: 384, dir: -1 },
      { x: 340, y: 296, dir: 1 },
      { x: 460, y: 296, dir: -1 },
      { x: 130, y: 210, dir: 1 },
      { x: 670, y: 210, dir: -1 },
      { x: 300, y: 128, dir: 1 },
      { x: 500, y: 128, dir: -1 },
    ],
  },

  // FLOOR 8: Real Snow Bros Stage 8 (Cross-Bridge Keep + Bounce Divider)
  {
    platforms: [
      FLOOR_PLAT,
      { x: 388, y: 128, w: 24, h: 120, isWall: true },
      { x: 80, y: 472, w: 190, h: 16 },
      { x: 320, y: 472, w: 160, h: 16 },
      { x: 530, y: 472, w: 190, h: 16 },
      { x: 22, y: 384, w: 260, h: 16 },
      { x: 518, y: 384, w: 260, h: 16 },
      { x: 200, y: 296, w: 400, h: 16 },
      { x: 50, y: 210, w: 210, h: 16 },
      { x: 540, y: 210, w: 210, h: 16 },
      { x: 230, y: 128, w: 340, h: 16 },
    ],
    playerSpawn: { x: 400, y: FLOOR_Y },
    slots: [
      { x: 170, y: 472, dir: 1 },
      { x: 630, y: 472, dir: -1 },
      { x: 140, y: 384, dir: 1 },
      { x: 660, y: 384, dir: -1 },
      { x: 300, y: 296, dir: 1 },
      { x: 500, y: 296, dir: -1 },
      { x: 150, y: 210, dir: 1 },
      { x: 650, y: 210, dir: -1 },
      { x: 310, y: 128, dir: 1 },
      { x: 490, y: 128, dir: -1 },
    ],
  },

  // FLOOR 9: Real Snow Bros Stage 9 (Twin Fortress Gates)
  {
    platforms: [
      FLOOR_PLAT,
      { x: 226, y: 384, w: 24, h: 104, isWall: true },
      { x: 550, y: 384, w: 24, h: 104, isWall: true },
      { x: 22, y: 472, w: 204, h: 16 },
      { x: 300, y: 472, w: 200, h: 16 },
      { x: 574, y: 472, w: 204, h: 16 },
      { x: 130, y: 384, w: 540, h: 16 },
      { x: 22, y: 296, w: 220, h: 16 },
      { x: 558, y: 296, w: 220, h: 16 },
      { x: 220, y: 210, w: 360, h: 16 },
      { x: 300, y: 128, w: 200, h: 16 },
    ],
    playerSpawn: { x: 400, y: FLOOR_Y },
    slots: [
      { x: 120, y: 472, dir: 1 },
      { x: 680, y: 472, dir: -1 },
      { x: 400, y: 472, dir: 1 },
      { x: 320, y: 384, dir: 1 },
      { x: 480, y: 384, dir: -1 },
      { x: 130, y: 296, dir: 1 },
      { x: 670, y: 296, dir: -1 },
      { x: 310, y: 210, dir: 1 },
      { x: 490, y: 210, dir: -1 },
      { x: 400, y: 128, dir: -1 },
    ],
  },

  // FLOOR 11-style: Zig-Zag Belltower Steps
  {
    platforms: [
      FLOOR_PLAT,
      { x: 22, y: 472, w: 210, h: 16 },
      { x: 568, y: 472, w: 210, h: 16 },
      { x: 140, y: 384, w: 220, h: 16 },
      { x: 440, y: 384, w: 220, h: 16 },
      { x: 270, y: 296, w: 260, h: 16 },
      { x: 90, y: 210, w: 200, h: 16 },
      { x: 510, y: 210, w: 200, h: 16 },
      { x: 240, y: 126, w: 320, h: 16 },
    ],
    playerSpawn: { x: 400, y: FLOOR_Y },
    slots: [
      { x: 120, y: 472, dir: 1 },
      { x: 680, y: 472, dir: -1 },
      { x: 240, y: 384, dir: 1 },
      { x: 560, y: 384, dir: -1 },
      { x: 350, y: 296, dir: 1 },
      { x: 450, y: 296, dir: -1 },
      { x: 180, y: 210, dir: 1 },
      { x: 620, y: 210, dir: -1 },
      { x: 320, y: 126, dir: 1 },
      { x: 480, y: 126, dir: -1 },
      { x: 150, y: FLOOR_Y, dir: 1 },
      { x: 650, y: FLOOR_Y, dir: -1 },
    ],
  },

  // FLOOR 12-style: Three-Crown Antechamber
  {
    platforms: [
      FLOOR_PLAT,
      { x: 80, y: 472, w: 200, h: 16 },
      { x: 520, y: 472, w: 200, h: 16 },
      { x: 230, y: 384, w: 340, h: 16 },
      { x: 22, y: 296, w: 230, h: 16 },
      { x: 548, y: 296, w: 230, h: 16 },
      { x: 150, y: 208, w: 500, h: 16 },
      { x: 40, y: 126, w: 180, h: 16 },
      { x: 310, y: 126, w: 180, h: 16 },
      { x: 580, y: 126, w: 180, h: 16 },
    ],
    playerSpawn: { x: 400, y: FLOOR_Y },
    slots: [
      { x: 170, y: 472, dir: 1 },
      { x: 630, y: 472, dir: -1 },
      { x: 320, y: 384, dir: 1 },
      { x: 480, y: 384, dir: -1 },
      { x: 120, y: 296, dir: 1 },
      { x: 680, y: 296, dir: -1 },
      { x: 260, y: 208, dir: 1 },
      { x: 540, y: 208, dir: -1 },
      { x: 130, y: 126, dir: 1 },
      { x: 400, y: 126, dir: 1 },
      { x: 670, y: 126, dir: -1 },
      { x: 400, y: 208, dir: -1 },
    ],
  },

  // FLOOR 13-style: Avalanche Hall
  {
    platforms: [
      FLOOR_PLAT,
      { x: 22, y: 472, w: 250, h: 16 },
      { x: 528, y: 472, w: 250, h: 16 },
      { x: 160, y: 384, w: 480, h: 16 },
      { x: 22, y: 296, w: 190, h: 16 },
      { x: 290, y: 296, w: 220, h: 16 },
      { x: 588, y: 296, w: 190, h: 16 },
      { x: 120, y: 208, w: 240, h: 16 },
      { x: 440, y: 208, w: 240, h: 16 },
      { x: 260, y: 126, w: 280, h: 16 },
    ],
    playerSpawn: { x: 400, y: FLOOR_Y },
    slots: [
      { x: 130, y: 472, dir: 1 },
      { x: 670, y: 472, dir: -1 },
      { x: 250, y: 384, dir: 1 },
      { x: 550, y: 384, dir: -1 },
      { x: 110, y: 296, dir: 1 },
      { x: 400, y: 296, dir: 1 },
      { x: 690, y: 296, dir: -1 },
      { x: 230, y: 208, dir: 1 },
      { x: 570, y: 208, dir: -1 },
      { x: 340, y: 126, dir: 1 },
      { x: 460, y: 126, dir: -1 },
      { x: 400, y: 384, dir: -1 },
    ],
  },

  // FLOOR 14-style: Staggered Ramparts
  {
    platforms: [
      FLOOR_PLAT,
      { x: 22, y: 472, w: 220, h: 16 },
      { x: 300, y: 472, w: 200, h: 16 },
      { x: 558, y: 472, w: 220, h: 16 },
      { x: 130, y: 384, w: 230, h: 16 },
      { x: 440, y: 384, w: 230, h: 16 },
      { x: 22, y: 296, w: 180, h: 16 },
      { x: 270, y: 296, w: 260, h: 16 },
      { x: 598, y: 296, w: 180, h: 16 },
      { x: 120, y: 208, w: 560, h: 16 },
      { x: 290, y: 128, w: 220, h: 16 },
    ],
    playerSpawn: { x: 400, y: FLOOR_Y },
    slots: [
      { x: 120, y: 472, dir: 1 },
      { x: 680, y: 472, dir: -1 },
      { x: 235, y: 384, dir: 1 },
      { x: 565, y: 384, dir: -1 },
      { x: 105, y: 296, dir: 1 },
      { x: 695, y: 296, dir: -1 },
      { x: 400, y: 296, dir: 1 },
      { x: 240, y: 208, dir: 1 },
      { x: 560, y: 208, dir: -1 },
      { x: 400, y: 128, dir: -1 },
      { x: 400, y: 472, dir: 1 },
      { x: 400, y: 208, dir: 1 },
    ],
  },

  // FLOOR 15-style: Wide Cascade Catacombs
  {
    platforms: [
      FLOOR_PLAT,
      { x: 140, y: 472, w: 520, h: 16 },
      { x: 22, y: 384, w: 240, h: 16 },
      { x: 538, y: 384, w: 240, h: 16 },
      { x: 210, y: 296, w: 380, h: 16 },
      { x: 40, y: 210, w: 220, h: 16 },
      { x: 540, y: 210, w: 220, h: 16 },
      { x: 260, y: 128, w: 280, h: 16 },
    ],
    playerSpawn: { x: 80, y: FLOOR_Y },
    slots: [
      { x: 660, y: FLOOR_Y, dir: -1 },
      { x: 240, y: 472, dir: 1 },
      { x: 560, y: 472, dir: -1 },
      { x: 130, y: 384, dir: 1 },
      { x: 670, y: 384, dir: -1 },
      { x: 400, y: 296, dir: 1 },
      { x: 140, y: 210, dir: 1 },
      { x: 660, y: 210, dir: -1 },
      { x: 340, y: 128, dir: 1 },
      { x: 460, y: 128, dir: -1 },
      { x: 310, y: 296, dir: -1 },
      { x: 490, y: 296, dir: 1 },
    ],
  },

  // FLOOR 16-style: Twin Switchback Drop Chutes
  {
    platforms: [
      FLOOR_PLAT,
      { x: 22, y: 472, w: 300, h: 16 },
      { x: 478, y: 472, w: 300, h: 16 },
      { x: 140, y: 384, w: 520, h: 16 },
      { x: 22, y: 296, w: 230, h: 16 },
      { x: 548, y: 296, w: 230, h: 16 },
      { x: 180, y: 208, w: 440, h: 16 },
      { x: 22, y: 126, w: 210, h: 16 },
      { x: 568, y: 126, w: 210, h: 16 },
    ],
    playerSpawn: { x: 400, y: FLOOR_Y },
    slots: [
      { x: 140, y: 472, dir: 1 },
      { x: 660, y: 472, dir: -1 },
      { x: 270, y: 384, dir: 1 },
      { x: 530, y: 384, dir: -1 },
      { x: 120, y: 296, dir: 1 },
      { x: 680, y: 296, dir: -1 },
      { x: 310, y: 208, dir: 1 },
      { x: 490, y: 208, dir: -1 },
      { x: 120, y: 126, dir: 1 },
      { x: 680, y: 126, dir: -1 },
      { x: 400, y: 384, dir: 1 },
      { x: 400, y: 208, dir: -1 },
    ],
  },

  // FLOOR 17-style: Central Pyramid Fortress
  {
    platforms: [
      FLOOR_PLAT,
      { x: 90, y: 472, w: 620, h: 16 },
      { x: 160, y: 384, w: 480, h: 16 },
      { x: 230, y: 296, w: 340, h: 16 },
      { x: 22, y: 250, w: 120, h: 16 },
      { x: 658, y: 250, w: 120, h: 16 },
      { x: 290, y: 208, w: 220, h: 16 },
      { x: 330, y: 126, w: 140, h: 16 },
    ],
    playerSpawn: { x: 400, y: FLOOR_Y },
    slots: [
      { x: 200, y: 472, dir: 1 },
      { x: 600, y: 472, dir: -1 },
      { x: 260, y: 384, dir: 1 },
      { x: 540, y: 384, dir: -1 },
      { x: 340, y: 296, dir: 1 },
      { x: 460, y: 296, dir: -1 },
      { x: 80, y: 250, dir: 1 },
      { x: 720, y: 250, dir: -1 },
      { x: 400, y: 208, dir: 1 },
      { x: 400, y: 126, dir: -1 },
      { x: 140, y: FLOOR_Y, dir: 1 },
      { x: 660, y: FLOOR_Y, dir: -1 },
    ],
  },

  // FLOOR 18-style: Twin Bounce-Wall Vault
  {
    platforms: [
      FLOOR_PLAT,
      { x: 246, y: 208, w: 24, h: 176, isWall: true },
      { x: 530, y: 208, w: 24, h: 176, isWall: true },
      { x: 22, y: 472, w: 230, h: 16 },
      { x: 310, y: 472, w: 180, h: 16 },
      { x: 548, y: 472, w: 230, h: 16 },
      { x: 120, y: 384, w: 560, h: 16 },
      { x: 22, y: 296, w: 180, h: 16 },
      { x: 300, y: 296, w: 200, h: 16 },
      { x: 598, y: 296, w: 180, h: 16 },
      { x: 120, y: 208, w: 560, h: 16 },
      { x: 290, y: 126, w: 220, h: 16 },
    ],
    playerSpawn: { x: 400, y: FLOOR_Y },
    slots: [
      { x: 130, y: 472, dir: 1 },
      { x: 670, y: 472, dir: -1 },
      { x: 400, y: 472, dir: 1 },
      { x: 190, y: 384, dir: 1 },
      { x: 610, y: 384, dir: -1 },
      { x: 100, y: 296, dir: 1 },
      { x: 400, y: 296, dir: -1 },
      { x: 700, y: 296, dir: -1 },
      { x: 340, y: 208, dir: 1 },
      { x: 460, y: 208, dir: -1 },
      { x: 400, y: 126, dir: 1 },
      { x: 400, y: 384, dir: -1 },
    ],
  },

  // FLOOR 19-style: Diagonal Cascade Terrace
  {
    platforms: [
      FLOOR_PLAT,
      { x: 22, y: 472, w: 260, h: 16 },
      { x: 518, y: 472, w: 260, h: 16 },
      { x: 210, y: 384, w: 380, h: 16 },
      { x: 22, y: 296, w: 200, h: 16 },
      { x: 578, y: 296, w: 200, h: 16 },
      { x: 160, y: 208, w: 210, h: 16 },
      { x: 430, y: 208, w: 210, h: 16 },
      { x: 270, y: 126, w: 260, h: 16 },
    ],
    playerSpawn: { x: 400, y: FLOOR_Y },
    slots: [
      { x: 140, y: 472, dir: 1 },
      { x: 660, y: 472, dir: -1 },
      { x: 310, y: 384, dir: 1 },
      { x: 490, y: 384, dir: -1 },
      { x: 110, y: 296, dir: 1 },
      { x: 690, y: 296, dir: -1 },
      { x: 260, y: 208, dir: 1 },
      { x: 540, y: 208, dir: -1 },
      { x: 340, y: 126, dir: 1 },
      { x: 460, y: 126, dir: -1 },
      { x: 140, y: FLOOR_Y, dir: 1 },
      { x: 660, y: FLOOR_Y, dir: -1 },
    ],
  },

  // FLOOR 20-style: Split Chimney Citadel
  {
    platforms: [
      FLOOR_PLAT,
      { x: 388, y: 384, w: 24, h: 96, isWall: true },
      { x: 80, y: 472, w: 220, h: 16 },
      { x: 500, y: 472, w: 220, h: 16 },
      { x: 22, y: 384, w: 280, h: 16 },
      { x: 498, y: 384, w: 280, h: 16 },
      { x: 180, y: 296, w: 440, h: 16 },
      { x: 22, y: 210, w: 210, h: 16 },
      { x: 568, y: 210, w: 210, h: 16 },
      { x: 220, y: 126, w: 360, h: 16 },
    ],
    playerSpawn: { x: 140, y: FLOOR_Y },
    slots: [
      { x: 650, y: FLOOR_Y, dir: -1 },
      { x: 180, y: 472, dir: 1 },
      { x: 620, y: 472, dir: -1 },
      { x: 150, y: 384, dir: 1 },
      { x: 650, y: 384, dir: -1 },
      { x: 310, y: 296, dir: 1 },
      { x: 490, y: 296, dir: -1 },
      { x: 120, y: 210, dir: 1 },
      { x: 680, y: 210, dir: -1 },
      { x: 330, y: 126, dir: 1 },
      { x: 470, y: 126, dir: -1 },
      { x: 400, y: 296, dir: 1 },
    ],
  },
];

// Classic Snow Bros Boss Arena layouts (Floors 10, 20, ..., 100)
const BOSS_TEMPLATES: ArenaTemplate[] = [
  {
    platforms: [
      FLOOR_PLAT,
      { x: 22, y: 472, w: 190, h: 16 },
      { x: 588, y: 472, w: 190, h: 16 },
      { x: 160, y: 384, w: 480, h: 16 },
      { x: 22, y: 296, w: 180, h: 16 },
      { x: 598, y: 296, w: 180, h: 16 },
      { x: 260, y: 216, w: 280, h: 16 },
    ],
    playerSpawn: { x: 110, y: FLOOR_Y },
    slots: [
      { x: 240, y: 384, dir: 1 },
      { x: 560, y: 384, dir: -1 },
      { x: 400, y: 216, dir: -1 },
    ],
  },
  {
    platforms: [
      FLOOR_PLAT,
      { x: 40, y: 472, w: 180, h: 16 },
      { x: 580, y: 472, w: 180, h: 16 },
      { x: 220, y: 384, w: 360, h: 16 },
      { x: 22, y: 296, w: 170, h: 16 },
      { x: 608, y: 296, w: 170, h: 16 },
      { x: 240, y: 208, w: 320, h: 16 },
    ],
    playerSpawn: { x: 110, y: FLOOR_Y },
    slots: [
      { x: 270, y: 384, dir: 1 },
      { x: 530, y: 384, dir: -1 },
      { x: 400, y: 208, dir: 1 },
    ],
  },
];

const STAGE_ADJECTIVES = [
  'Moonlit',
  'Frozen',
  'Lantern',
  'Crystal',
  'Starlight',
  'Glacial',
  'Obsidian',
  'Aurora',
  'Frostbite',
  'Royal',
];

const STAGE_NOUNS = [
  'Courtyard',
  'Gallery',
  'Ramparts',
  'Parapet',
  'Belfry',
  'Vaults',
  'Bridge',
  'Spire',
  'Hall',
  'Sanctum',
];

function pickEnemyRoster(level: number, count: number): EnemyKind[] {
  // Real Snow Bros Floors 1-5 iconic rosters
  if (level === 1) return ['gobbo', 'gobbo', 'gobbo', 'gobbo'];
  if (level === 2) return ['gobbo', 'gobbo', 'zippy', 'zippy', 'zippy'];
  if (level === 3) return ['spitfire', 'spitfire', 'spitfire', 'gobbo', 'gobbo'];
  if (level === 4) return ['zippy', 'zippy', 'zippy', 'gobbo', 'gobbo'];
  if (level === 5) return ['spitfire', 'spitfire', 'spitfire', 'zippy', 'zippy'];

  const result: EnemyKind[] = [];
  for (let i = 0; i < count; i++) {
    const selector = (level * 7 + i * 5) % 10;
    if (level <= 9) {
      result.push(selector < 3 ? 'spitfire' : selector < 6 ? 'zippy' : 'gobbo');
    } else if (level <= 25) {
      if (selector < 3) result.push('yeti');
      else if (selector < 6) result.push('spitfire');
      else if (selector < 8) result.push('zippy');
      else result.push('gobbo');
    } else if (level <= 60) {
      if (selector < 4) result.push('yeti');
      else if (selector < 7) result.push('spitfire');
      else if (selector < 9) result.push('zippy');
      else result.push('gobbo');
    } else {
      if (selector < 4) result.push('yeti');
      else if (selector < 8) result.push('spitfire');
      else result.push('zippy');
    }
  }
  return result;
}

function buildStages100(): StageConfig[] {
  const list: StageConfig[] = [];
  // Track non-boss floor index so Floors 1..9 match REAL_ARCADE_LAYOUTS[0..8] sequentially!
  let nonBossSeq = 0;

  for (let i = 0; i < 100; i++) {
    const level = i + 1;
    const chapterIdx = Math.floor(i / 10);
    const chapter = CHAPTERS[chapterIdx];
    const isBoss = level % 10 === 0;

    if (isBoss) {
      const bossTemplate = BOSS_TEMPLATES[chapterIdx % BOSS_TEMPLATES.length];
      const minionCount = level >= 50 ? 3 : 2;
      const enemies: EnemySpawn[] = bossTemplate.slots
        .slice(0, minionCount)
        .map((slot, idx) => ({
          kind:
            level >= 60 && idx === 2
              ? 'spitfire'
              : idx % 2 === 1 && level >= 20
                ? 'zippy'
                : 'gobbo',
          x: slot.x,
          y: slot.y,
          dir: slot.dir,
        }));

      list.push({
        id: level,
        name: `${chapter.bossName}'s ${chapter.name}`,
        subtitle: `Floor ${level} Boss! Freeze minions and roll snowballs into ${chapter.bossName}!`,
        palette: chapter.palette,
        platforms: bossTemplate.platforms,
        playerSpawn: bossTemplate.playerSpawn,
        enemies,
        boss: {
          kind: chapter.bossKind,
          name: chapter.bossName,
          x: 620,
          y: FLOOR_Y,
          maxHp: 10 + chapterIdx + (level === 100 ? 4 : 0),
        },
      });
      continue;
    }

    // Sequential real-arcade layout progression for Floors 1..99
    const template = REAL_ARCADE_LAYOUTS[nonBossSeq % REAL_ARCADE_LAYOUTS.length];
    nonBossSeq++;

    const enemyCount =
      level === 1
        ? 4
        : level <= 5
          ? 5
          : Math.min(12, 6 + Math.floor((level - 6) / 14));

    const roster = pickEnemyRoster(level, enemyCount);
    const enemies: EnemySpawn[] = roster.map((kind, idx) => {
      const slot = template.slots[idx % template.slots.length];
      return {
        kind,
        x: slot.x,
        y: slot.y,
        dir: slot.dir,
      };
    });

    const adj = STAGE_ADJECTIVES[(i + chapterIdx) % STAGE_ADJECTIVES.length];
    const noun = STAGE_NOUNS[(i * 3 + chapterIdx) % STAGE_NOUNS.length];
    const stageName = `Floor ${level} · ${adj} ${noun}`;

    list.push({
      id: level,
      name: stageName,
      subtitle: `Area ${chapterIdx + 1}: ${chapter.name} · Clear all ${enemyCount} monsters!`,
      palette: chapter.palette,
      platforms: template.platforms,
      playerSpawn: template.playerSpawn,
      enemies,
    });
  }

  return list;
}

export const STAGES: StageConfig[] = buildStages100();
