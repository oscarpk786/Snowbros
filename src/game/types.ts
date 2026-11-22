export type GamePhase =
  | 'TITLE_MENU'
  | 'PLAYING'
  | 'PAUSED'
  | 'STAGE_CLEAR'
  | 'VICTORY'
  | 'GAME_OVER';

export type Difficulty = 'arcade' | 'chill';

export type ControlScheme = 'classic' | 'wasd';

export type EnemyKind = 'gobbo' | 'spitfire' | 'zippy' | 'yeti' | 'ghost';

export type BossKind =
  | 'king_scorch'
  | 'frost_warden'
  | 'baron_magma'
  | 'emperor_blizzor';

export type PickupKind =
  | 'potion_red'    // Speed up
  | 'potion_blue'   // Snow power (bigger shots + faster freeze)
  | 'potion_yellow' // Snow range & shot velocity
  | 'potion_green'  // Frost Giant mode (invincible + giant + crush)
  | 'sushi'         // +500
  | 'cake'          // +1000
  | 'gem'           // +2000
  | 'crown';        // +5000

export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  isFloor?: boolean;
  isWall?: boolean;
}

export interface StagePalette {
  skyTop: string;
  skyBottom: string;
  brickMain: string;
  brickDark: string;
  brickLight: string;
  snowCap: string;
  snowShadow: string;
  accentGlow: string;
}

export interface EnemySpawn {
  kind: EnemyKind;
  x: number;
  y: number;
  dir: 1 | -1;
}

export interface BossSpawn {
  kind: BossKind;
  name: string;
  x: number;
  y: number;
  maxHp: number;
}

export interface StageConfig {
  id: number;
  name: string;
  subtitle: string;
  palette: StagePalette;
  platforms: Platform[];
  playerSpawn: { x: number; y: number };
  enemies: EnemySpawn[];
  boss?: BossSpawn;
}

export interface PlayerState {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  onGround: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
  dropThroughTimer: number;
  shootCooldown: number;
  invulnTimer: number;
  spawnShieldTimer: number;
  walkCycle: number;
  squashX: number;
  squashY: number;
  pushTimer: number;
  pushTargetId: number | null;
  // Power-ups
  speedLevel: number;
  powerLevel: number;
  rangeLevel: number;
  giantTimer: number;
}

export interface EnemyState {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  dir: 1 | -1;
  onGround: boolean;
  snowLevel: number;      // 0 = free, 1..3 = partial snow, 4 = full snowball
  maxSnow: number;        // usually 4 (yeti uses 5 internally mapped or slower melt)
  meltTimer: number;
  stateTimer: number;
  aiPhase: 'patrol' | 'windup' | 'attack' | 'recover' | 'jump_crouch' | 'rolling';
  windupDuration: number;
  hitFlashTimer: number;
  squashX: number;
  squashY: number;
  walkCycle: number;
  // Rolling snowball properties (when snowLevel >= maxSnow and kicked)
  isRolling: boolean;
  rollVx: number;
  chainCount: number;
  floorBounces: number;
  rollAge: number;
  ghostStunTimer: number;
}

export interface BossState {
  kind: BossKind;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  dir: 1 | -1;
  hp: number;
  maxHp: number;
  onGround: boolean;
  aiPhase: 'idle' | 'windup_jump' | 'jumping' | 'windup_breath' | 'breathing' | 'summon' | 'hurt';
  phaseTimer: number;
  hitFlashTimer: number;
  squashX: number;
  squashY: number;
  minionTimer: number;
}

export interface SnowShot {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  power: number;
  life: number;
  maxLife: number;
  fromGiant: boolean;
}

export interface EnemyProjectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  color: string;
  kind: 'fire' | 'ice';
}

export interface PickupItem {
  id: number;
  kind: PickupKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  onGround: boolean;
  life: number;
  bobOffset: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  gravity: number;
  shape: 'circle' | 'square' | 'spark';
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

export interface HudSnapshot {
  score: number;
  highScore: number;
  lives: number;
  stageId: number;
  totalStages: number;
  stageName: string;
  enemiesRemaining: number;
  speedLevel: number;
  powerLevel: number;
  rangeLevel: number;
  giantTimer: number;
  bossName: string | null;
  bossHp: number;
  bossMaxHp: number;
  hurryUp: boolean;
  stageTime: number;
  comboBest: number;
  enemiesCrushedTotal: number;
}
