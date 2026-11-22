import { FLOOR_Y, PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH, WALL_THICKNESS } from './levels';
import {
  BossState,
  EnemyProjectile,
  EnemyState,
  FloatingText,
  Particle,
  PickupItem,
  PlayerState,
  SnowShot,
  StageConfig,
} from './types';

export interface AmbientFlake {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;
  alpha: number;
}

export interface RenderState {
  stage: StageConfig;
  player: PlayerState;
  enemies: EnemyState[];
  boss: BossState | null;
  snowShots: SnowShot[];
  enemyProjectiles: EnemyProjectile[];
  pickups: PickupItem[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  ambientFlakes: AmbientFlake[];
  time: number;
  shakeX: number;
  shakeY: number;
  hurryUpBannerTimer: number;
  floorBannerTimer: number;
  floorClearBannerTimer: number;
  bonusRainActive: boolean;
  transitionProgress: number;
  renderScale?: number;
}

// Deterministic pseudo-random helper for weathered stonework & snow textures
function hash2d(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

interface StageLayerCache {
  key: string;
  backdrop: HTMLCanvasElement;
  architecture: HTMLCanvasElement;
}

let stageCache: StageLayerCache | null = null;

function createOffscreenCanvas(scale: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(PLAYFIELD_WIDTH * scale);
  canvas.height = Math.round(PLAYFIELD_HEIGHT * scale);
  const c = canvas.getContext('2d')!;
  c.setTransform(scale, 0, 0, scale, 0, 0);
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  return [canvas, c];
}

function getOrBuildStageCache(stage: StageConfig, scale: number): StageLayerCache {
  const key = `${stage.id}_${scale.toFixed(2)}`;
  if (stageCache && stageCache.key === key) {
    return stageCache;
  }

  const [backdrop, bCtx] = createOffscreenCanvas(scale);
  const [architecture, aCtx] = createOffscreenCanvas(scale);

  bakeBackdropLayer(bCtx, stage);
  bakeArchitectureLayer(aCtx, stage);

  stageCache = { key, backdrop, architecture };
  return stageCache;
}

function bakeBackdropLayer(ctx: CanvasRenderingContext2D, stage: StageConfig): void {
  const { palette } = stage;

  // 1. Rich multi-stop atmospheric midnight sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, PLAYFIELD_HEIGHT);
  skyGrad.addColorStop(0, palette.skyTop);
  skyGrad.addColorStop(0.58, palette.skyBottom);
  skyGrad.addColorStop(1, '#050b1a');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);

  // Subtle upper cosmic nebula wash
  const nebula = ctx.createRadialGradient(240, 120, 20, 260, 140, 420);
  nebula.addColorStop(0, 'rgba(56, 189, 248, 0.11)');
  nebula.addColorStop(0.5, 'rgba(99, 102, 241, 0.06)');
  nebula.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);

  // 2. Photorealistic Full Moon with atmospheric bloom & subtle maria craters
  const moonX = 656;
  const moonY = 98;
  const moonHalo = ctx.createRadialGradient(moonX, moonY, 18, moonX, moonY, 155);
  moonHalo.addColorStop(0, 'rgba(224, 242, 254, 0.55)');
  moonHalo.addColorStop(0.3, 'rgba(186, 230, 253, 0.22)');
  moonHalo.addColorStop(0.65, 'rgba(56, 189, 248, 0.06)');
  moonHalo.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = moonHalo;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 155, 0, Math.PI * 2);
  ctx.fill();

  const moonSphere = ctx.createRadialGradient(moonX - 11, moonY - 12, 4, moonX, moonY, 36);
  moonSphere.addColorStop(0, '#ffffff');
  moonSphere.addColorStop(0.6, '#e0f2fe');
  moonSphere.addColorStop(0.88, '#bae6fd');
  moonSphere.addColorStop(1, '#7dd3fc');
  ctx.fillStyle = moonSphere;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 36, 0, Math.PI * 2);
  ctx.fill();

  // Subtle lunar surface craters clipped to moon disc
  ctx.save();
  ctx.beginPath();
  ctx.arc(moonX, moonY, 35.5, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(148, 163, 184, 0.16)';
  for (const [cx, cy, r] of [
    [moonX - 10, moonY + 8, 9],
    [moonX + 14, moonY - 6, 7],
    [moonX + 5, moonY + 15, 5.5],
    [moonX - 16, moonY - 10, 5],
  ]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 3. Distant Alpine Snow-Capped Mountain Ridge (Two parallax ridges for realism)
  const farPeaks: [number, number][] = [
    [0, 395],
    [70, 290],
    [145, 345],
    [235, 225],
    [325, 330],
    [420, 245],
    [515, 340],
    [600, 215],
    [705, 320],
    [800, 260],
  ];
  const farGrad = ctx.createLinearGradient(0, 215, 0, 440);
  farGrad.addColorStop(0, 'rgba(30, 58, 108, 0.55)');
  farGrad.addColorStop(1, 'rgba(10, 18, 40, 0.78)');
  ctx.fillStyle = farGrad;
  ctx.beginPath();
  ctx.moveTo(0, FLOOR_Y);
  for (const [px, py] of farPeaks) ctx.lineTo(px, py);
  ctx.lineTo(PLAYFIELD_WIDTH, FLOOR_Y);
  ctx.closePath();
  ctx.fill();

  // Moonlit snow caps on right flanks of far peaks
  for (let i = 1; i < farPeaks.length - 1; i += 2) {
    const [px, py] = farPeaks[i];
    const [nx, ny] = farPeaks[i + 1];
    ctx.fillStyle = 'rgba(224, 242, 254, 0.22)';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + (nx - px) * 0.42, py + (ny - py) * 0.42);
    ctx.lineTo(px + 8, py + 28);
    ctx.lineTo(px - 14, py + 22);
    ctx.closePath();
    ctx.fill();
  }

  // Midground Castle Keep Battlements & Spires Silhouette
  ctx.fillStyle = 'rgba(6, 11, 26, 0.62)';
  ctx.beginPath();
  ctx.moveTo(0, FLOOR_Y);
  ctx.lineTo(0, 395);
  ctx.lineTo(95, 395);
  ctx.lineTo(95, 315);
  ctx.lineTo(148, 252);
  ctx.lineTo(202, 315);
  ctx.lineTo(202, 375);
  ctx.lineTo(345, 375);
  ctx.lineTo(345, 292);
  ctx.lineTo(400, 232);
  ctx.lineTo(455, 292);
  ctx.lineTo(455, 368);
  ctx.lineTo(605, 368);
  ctx.lineTo(605, 286);
  ctx.lineTo(656, 224);
  ctx.lineTo(708, 286);
  ctx.lineTo(708, 388);
  ctx.lineTo(PLAYFIELD_WIDTH, 388);
  ctx.lineTo(PLAYFIELD_WIDTH, FLOOR_Y);
  ctx.closePath();
  ctx.fill();

  // 4. Recessed Gothic Castle Interior Wall & Ashlar Stonework
  // Faint interior stone block grid for physical castle depth
  const blockH = 26;
  const blockW = 54;
  for (let row = 0; row < 22; row++) {
    const by = row * blockH;
    const offset = (row % 2) * (blockW * 0.5);
    for (let col = -1; col < 16; col++) {
      const bx = col * blockW + offset;
      const n = hash2d(col + stage.id * 7, row);
      if (n > 0.35) {
        ctx.fillStyle = `rgba(15, 23, 42, ${0.07 + n * 0.08})`;
        ctx.fillRect(bx + 1, by + 1, blockW - 2, blockH - 2);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.022)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 0.5, by + 0.5, blockW - 1, blockH - 1);
    }
  }

  // Three Tall Gothic Arched Castle Windows letting in cool night glow
  for (const wx of [220, 400, 580]) {
    // Deep recessed stone frame shadow
    ctx.fillStyle = 'rgba(3, 7, 18, 0.35)';
    ctx.beginPath();
    ctx.moveTo(wx - 34, 304);
    ctx.lineTo(wx - 34, 165);
    ctx.quadraticCurveTo(wx, 110, wx + 34, 165);
    ctx.lineTo(wx + 34, 304);
    ctx.closePath();
    ctx.fill();

    // Soft glass moonlight glow
    const winGlow = ctx.createLinearGradient(wx, 120, wx, 300);
    winGlow.addColorStop(0, 'rgba(186, 230, 253, 0.14)');
    winGlow.addColorStop(1, 'rgba(56, 189, 248, 0.04)');
    ctx.fillStyle = winGlow;
    ctx.beginPath();
    ctx.moveTo(wx - 28, 298);
    ctx.lineTo(wx - 28, 168);
    ctx.quadraticCurveTo(wx, 120, wx + 28, 168);
    ctx.lineTo(wx + 28, 298);
    ctx.closePath();
    ctx.fill();

    // Gothic mullion tracery lines
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.08)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(wx, 138);
    ctx.lineTo(wx, 298);
    ctx.moveTo(wx - 28, 210);
    ctx.lineTo(wx + 28, 210);
    ctx.moveTo(wx - 28, 254);
    ctx.lineTo(wx + 28, 254);
    ctx.stroke();
  }

  // Vertical Carved Castle Pillars with Base Pedestals & Lit Left Edges
  for (const px of [148, 389, 630]) {
    const colGrad = ctx.createLinearGradient(px, 0, px + 24, 0);
    colGrad.addColorStop(0, 'rgba(255, 255, 255, 0.055)');
    colGrad.addColorStop(0.25, 'rgba(10, 16, 36, 0.34)');
    colGrad.addColorStop(1, 'rgba(2, 6, 18, 0.5)');
    ctx.fillStyle = colGrad;
    ctx.fillRect(px, 32, 24, FLOOR_Y - 32);

    // Chiseled capital & pedestal rings
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(px - 3, 32, 30, 7);
    ctx.fillRect(px - 3, FLOOR_Y - 12, 30, 12);
  }

  // Subtle carved Floor Number Crest in stone wall
  ctx.save();
  ctx.globalAlpha = 0.065;
  ctx.font = '700 44px "Fredoka", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e0f2fe';
  ctx.fillText(`FLOOR ${String(stage.id).padStart(2, '0')}`, PLAYFIELD_WIDTH / 2, 102);
  ctx.restore();
}

function bakeArchitectureLayer(ctx: CanvasRenderingContext2D, stage: StageConfig): void {
  const { palette } = stage;

  // Bake all platforms & stone pillars
  for (const plat of stage.platforms) {
    bakeSinglePlatform(ctx, plat, palette, stage.id);
  }

  // Bake Left & Right Castle Boundary Stone Walls (static masonry + iron sconce brackets)
  bakeSideWall(ctx, 0, WALL_THICKNESS, palette, true, stage.id);
  bakeSideWall(ctx, PLAYFIELD_WIDTH - WALL_THICKNESS, WALL_THICKNESS, palette, false, stage.id);
}

function bakeSinglePlatform(
  ctx: CanvasRenderingContext2D,
  plat: { x: number; y: number; w: number; h: number; isFloor?: boolean; isWall?: boolean },
  palette: StageConfig['palette'],
  stageId: number
): void {
  const { x, y, w, h, isFloor, isWall } = plat;

  // Deep ambient occlusion drop shadow under floating ledges
  if (!isFloor && !isWall) {
    const dropShadow = ctx.createLinearGradient(0, y + h, 0, y + h + 18);
    dropShadow.addColorStop(0, 'rgba(2, 6, 18, 0.52)');
    dropShadow.addColorStop(1, 'rgba(2, 6, 18, 0)');
    ctx.fillStyle = dropShadow;
    ctx.fillRect(x + 4, y + h - 2, w - 8, 18);
  }

  // 3D Chiseled Stone Body
  const stoneGrad = ctx.createLinearGradient(x, y, x, y + h);
  stoneGrad.addColorStop(0, palette.brickLight);
  stoneGrad.addColorStop(0.22, palette.brickMain);
  stoneGrad.addColorStop(1, palette.brickDark);
  ctx.fillStyle = stoneGrad;
  drawRoundedRect(ctx, x, y + 2, w, h - 2, isFloor || isWall ? 2 : 5);
  ctx.fill();

  // Individual stone block tonal variation + weathered texture speckles
  const brickW = 28;
  ctx.save();
  drawRoundedRect(ctx, x, y + 2, w, h - 2, isFloor || isWall ? 2 : 5);
  ctx.clip();

  const rows = isFloor || isWall ? Math.ceil(h / 18) : 1;
  for (let r = 0; r < rows; r++) {
    const by = y + 2 + r * 18;
    const rowH = rows === 1 ? h - 2 : 18;
    const shift = (r % 2) * (brickW * 0.5);
    for (let bx = x - shift; bx < x + w; bx += brickW) {
      const n = hash2d(Math.round(bx), Math.round(by) + stageId * 13);
      if (n > 0.5) {
        ctx.fillStyle = `rgba(255, 255, 255, ${(n - 0.5) * 0.14})`;
        ctx.fillRect(bx + 1, by + 1, brickW - 2, rowH - 2);
      } else {
        ctx.fillStyle = `rgba(2, 6, 20, ${(0.5 - n) * 0.2})`;
        ctx.fillRect(bx + 1, by + 1, brickW - 2, rowH - 2);
      }

      // Chiseled upper-left highlight & lower-right mortar recess
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(bx + 1, by + 1, brickW - 3, 1.4);
      ctx.fillStyle = palette.brickDark;
      ctx.fillRect(bx + brickW - 1.5, by, 1.5, rowH);
      ctx.fillRect(bx, by + rowH - 1.5, brickW, 1.5);
    }
  }

  // Subtle carved underside rim on floating ledges
  if (!isFloor && !isWall) {
    ctx.fillStyle = 'rgba(2, 6, 18, 0.38)';
    ctx.fillRect(x, y + h - 3.5, w, 3.5);
  }
  ctx.restore();

  // Polished Glacier Ice Surface along Floor_Y
  if (isFloor) {
    const iceTop = ctx.createLinearGradient(0, y, 0, y + 14);
    iceTop.addColorStop(0, '#ffffff');
    iceTop.addColorStop(0.3, '#e0f2fe');
    iceTop.addColorStop(0.75, '#93c5fd');
    iceTop.addColorStop(1, 'rgba(59, 130, 246, 0.15)');
    ctx.fillStyle = iceTop;
    ctx.fillRect(x, y, w, 14);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(x, y, w, 2);
    return;
  }

  // Vertical wall stone edge highlights
  if (isWall) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(x + 1.5, y + 4, 2.5, h - 8);
    ctx.fillStyle = 'rgba(2, 6, 18, 0.35)';
    ctx.fillRect(x + w - 3.5, y + 4, 2.5, h - 8);
  }

  // Sculpted Organic 3D Snowdrift Cap along platform top
  const snowGrad = ctx.createLinearGradient(0, y - 3, 0, y + 11);
  snowGrad.addColorStop(0, '#ffffff');
  snowGrad.addColorStop(0.55, palette.snowCap);
  snowGrad.addColorStop(1, palette.snowShadow);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - 1, y + 6);
  ctx.quadraticCurveTo(x - 1, y - 2, x + 5, y - 2);
  ctx.lineTo(x + w - 5, y - 2);
  ctx.quadraticCurveTo(x + w + 1, y - 2, x + w + 1, y + 6);
  // Organic scalloped snow mounds along bottom edge of snowcap
  const stepW = 16;
  for (let sx = x + w - stepW * 0.5; sx >= x + 4; sx -= stepW) {
    const bulge = 6.5 + hash2d(sx, y) * 3.5;
    ctx.quadraticCurveTo(sx, y + bulge, sx - stepW * 0.5, y + 5.5);
  }
  ctx.closePath();
  ctx.fillStyle = snowGrad;
  ctx.fill();

  // Crisp backlit moonlight rim along top of snowdrift
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x + 3, y - 1);
  ctx.lineTo(x + w - 3, y - 1);
  ctx.stroke();

  // Subtle icy shadow under snow lips
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  // Crystalline Faceted Icicles hanging beneath floating ledges
  if (!isWall) {
    for (let ix = x + 15; ix < x + w - 15; ix += 26) {
      const n = hash2d(ix, y + stageId);
      const len = 7 + n * 8;
      // Outer translucent ice crystal
      const iceGrad = ctx.createLinearGradient(ix, y + 5, ix, y + 5 + len);
      iceGrad.addColorStop(0, palette.snowShadow);
      iceGrad.addColorStop(0.55, 'rgba(186, 230, 253, 0.85)');
      iceGrad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
      ctx.fillStyle = iceGrad;
      ctx.beginPath();
      ctx.moveTo(ix - 4.2, y + 5.5);
      ctx.lineTo(ix + 4.2, y + 5.5);
      ctx.lineTo(ix + 0.6, y + 5.5 + len);
      ctx.lineTo(ix - 0.6, y + 5.5 + len);
      ctx.closePath();
      ctx.fill();

      // Left facet highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.beginPath();
      ctx.moveTo(ix - 2.2, y + 5.5);
      ctx.lineTo(ix + 0.3, y + 5.5);
      ctx.lineTo(ix - 0.2, y + 4 + len * 0.82);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function bakeSideWall(
  ctx: CanvasRenderingContext2D,
  x: number,
  w: number,
  palette: StageConfig['palette'],
  isLeft: boolean,
  stageId: number
): void {
  const wallGrad = ctx.createLinearGradient(x, 0, x + w, 0);
  if (isLeft) {
    wallGrad.addColorStop(0, palette.brickDark);
    wallGrad.addColorStop(0.62, palette.brickMain);
    wallGrad.addColorStop(1, palette.brickLight);
  } else {
    wallGrad.addColorStop(0, palette.brickLight);
    wallGrad.addColorStop(0.38, palette.brickMain);
    wallGrad.addColorStop(1, palette.brickDark);
  }
  ctx.fillStyle = wallGrad;
  ctx.fillRect(x, 0, w, PLAYFIELD_HEIGHT);

  for (let wy = 0; wy < PLAYFIELD_HEIGHT; wy += 26) {
    const n = hash2d(wy, isLeft ? stageId : stageId + 99);
    ctx.fillStyle = n > 0.5 ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.14)';
    ctx.fillRect(x + 1, wy + 1, w - 2, 24);

    ctx.strokeStyle = palette.brickDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, wy);
    ctx.lineTo(x + w, wy);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 2, wy + 2);
    ctx.lineTo(x + w - 2, wy + 2);
    ctx.stroke();
  }

  // Chiseled frost rim facing arena
  ctx.fillStyle = 'rgba(224, 242, 254, 0.28)';
  ctx.fillRect(isLeft ? x + w - 2.5 : x, 0, 2.5, PLAYFIELD_HEIGHT);

  // Wrought-iron sconce brackets
  for (const sy of [150, 340, 500]) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(isLeft ? x + w - 3 : x - 7, sy + 1, 10, 5);
    ctx.fillStyle = '#334155';
    ctx.fillRect(isLeft ? x + w - 2 : x - 6, sy + 2, 8, 2);
  }
}

export function renderArena(ctx: CanvasRenderingContext2D, state: RenderState): void {
  const { stage, time, shakeX, shakeY } = state;
  const { palette } = stage;
  const scale = state.renderScale || 2;
  const cached = getOrBuildStageCache(stage, scale);

  ctx.save();
  ctx.clearRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
  ctx.translate(shakeX, shakeY);

  // 1. Blit pre-rendered HD Castle Sky, Moon, Mountains & Gothic Stone Interior
  ctx.drawImage(cached.backdrop, 0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);

  // 2. Live Shimmering Northern Lights Aurora Ribbon
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const auroraGrad = ctx.createLinearGradient(0, 20, PLAYFIELD_WIDTH, 195);
  auroraGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
  auroraGrad.addColorStop(0.28, 'rgba(34, 211, 238, 0.14)');
  auroraGrad.addColorStop(0.55, 'rgba(167, 139, 250, 0.12)');
  auroraGrad.addColorStop(0.8, 'rgba(52, 211, 153, 0.1)');
  auroraGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = auroraGrad;
  ctx.beginPath();
  ctx.moveTo(0, 130);
  for (let ax = 0; ax <= PLAYFIELD_WIDTH; ax += 28) {
    const wave =
      Math.sin(ax * 0.011 + time * 0.65) * 20 +
      Math.cos(ax * 0.023 - time * 0.45) * 10;
    ctx.lineTo(ax, 88 + wave);
  }
  ctx.lineTo(PLAYFIELD_WIDTH, 215);
  ctx.lineTo(0, 215);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 3. Twinkling High-Altitude Stars
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 42; i++) {
    const sx = ((i * 137 + stage.id * 53) % (PLAYFIELD_WIDTH - 64)) + 32;
    const sy = ((i * 89 + stage.id * 37) % 245) + 18;
    const twinkle = 0.2 + 0.8 * Math.abs(Math.sin(time * 1.7 + i * 0.9));
    ctx.globalAlpha = twinkle * 0.72;
    ctx.beginPath();
    ctx.arc(sx, sy, i % 5 === 0 ? 1.5 : 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 4. Diagonal Volumetric Moonlight Beams & Floating Luminous Dust Motes
  ctx.save();
  const shaftGrad = ctx.createLinearGradient(610, 20, 290, FLOOR_Y);
  shaftGrad.addColorStop(0, 'rgba(224, 242, 254, 0.13)');
  shaftGrad.addColorStop(0.65, 'rgba(186, 230, 253, 0.05)');
  shaftGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
  ctx.fillStyle = shaftGrad;
  ctx.beginPath();
  ctx.moveTo(555, 0);
  ctx.lineTo(745, 0);
  ctx.lineTo(485, FLOOR_Y);
  ctx.lineTo(270, FLOOR_Y);
  ctx.closePath();
  ctx.fill();

  for (let m = 0; m < 18; m++) {
    const mx = 340 + ((m * 97 + Math.sin(time * 0.55 + m) * 32) % 310);
    const my = 65 + ((m * 63 + time * 11) % (FLOOR_Y - 110));
    const ma = 0.12 + 0.24 * Math.abs(Math.sin(time * 2.1 + m));
    ctx.fillStyle = `rgba(224, 242, 254, ${ma})`;
    ctx.beginPath();
    ctx.arc(mx, my, 1.3 + (m % 2) * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Swaying Embroidered Medieval Castle Banners
  const bannerXs = [275, 515];
  for (let i = 0; i < bannerXs.length; i++) {
    const bx = bannerXs[i];
    const sway = Math.sin(time * 1.5 + i * 2.1) * 3.2;
    const bGrad = ctx.createLinearGradient(bx - 16, 56, bx + 16, 150);
    bGrad.addColorStop(0, 'rgba(15, 23, 42, 0.62)');
    bGrad.addColorStop(1, 'rgba(30, 41, 59, 0.45)');
    ctx.fillStyle = bGrad;
    ctx.beginPath();
    ctx.moveTo(bx - 16, 56);
    ctx.lineTo(bx + 16, 56);
    ctx.lineTo(bx + 16 + sway, 134);
    ctx.lineTo(bx + sway, 152);
    ctx.lineTo(bx - 16 + sway, 134);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = palette.accentGlow;
    ctx.globalAlpha = 0.34;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Small snowflake emblem stitched on banner
    ctx.beginPath();
    ctx.arc(bx + sway * 0.4, 96, 4.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // 5. Far / Midground Ambient Snowflakes (with crisp crystalline glint on large flakes)
  for (let i = 0; i < state.ambientFlakes.length; i++) {
    const flake = state.ambientFlakes[i];
    if (i % 5 === 0) continue; // reserve every 5th for soft foreground bokeh pass
    ctx.globalAlpha = flake.alpha;
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
    ctx.fill();
    if (flake.r > 2.2) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(flake.x - flake.r * 1.4, flake.y);
      ctx.lineTo(flake.x + flake.r * 1.4, flake.y);
      ctx.moveTo(flake.x, flake.y - flake.r * 1.4);
      ctx.lineTo(flake.x, flake.y + flake.r * 1.4);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  // 6. Blit Pre-Rendered HD Platforms, Stone Walls, Snowdrifts & Icicles
  ctx.drawImage(cached.architecture, 0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);

  // 6b. Subtle frost mist hugging the icy castle floor
  const floorMist = ctx.createLinearGradient(0, FLOOR_Y - 34, 0, FLOOR_Y);
  floorMist.addColorStop(0, 'rgba(186, 230, 253, 0)');
  floorMist.addColorStop(1, 'rgba(186, 230, 253, 0.1)');
  ctx.fillStyle = floorMist;
  ctx.fillRect(WALL_THICKNESS, FLOOR_Y - 34, PLAYFIELD_WIDTH - WALL_THICKNESS * 2, 34);

  // 7. Animated Flickering Torch Flames & Warm Wall Bounce Light
  drawLiveTorches(ctx, time);

  // 8. Real-Time Subtle Floor Ice Reflections for Grounded Entities
  drawFloorIceReflections(ctx, state);

  // 9. Pickups
  for (const item of state.pickups) {
    drawPickup(ctx, item, time);
  }

  // 10. Boss
  if (state.boss) {
    drawBoss(ctx, state.boss, time);
  }

  // 11. Enemies (regular first, rolling snowballs on top)
  for (const enemy of state.enemies) {
    if (!enemy.isRolling) {
      drawEnemy(ctx, enemy, time);
    }
  }
  for (const enemy of state.enemies) {
    if (enemy.isRolling) {
      drawEnemy(ctx, enemy, time);
    }
  }

  // 12. Player (Nick)
  drawPlayer(ctx, state.player, time);

  // 13. Projectiles (Player Snow Shots & Enemy Fire/Ice)
  for (const shot of state.snowShots) {
    drawSnowShot(ctx, shot);
  }
  for (const proj of state.enemyProjectiles) {
    drawEnemyProjectile(ctx, proj, time);
  }

  // 14. Additive Glows & Particles
  for (const p of state.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha * (p.life / p.maxLife));
    ctx.fillStyle = p.color;
    if (p.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === 'spark') {
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.fillRect(-p.size * 1.5, -p.size * 0.4, p.size * 3.0, p.size * 0.8);
    } else {
      ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
    }
    ctx.restore();
  }

  // 15. Foreground Soft Bokeh Snow Crystals (in front of arena for deep 3D parallax!)
  ctx.save();
  for (let i = 0; i < state.ambientFlakes.length; i += 5) {
    const flake = state.ambientFlakes[i];
    const br = flake.r * 2.2;
    const bokeh = ctx.createRadialGradient(flake.x, flake.y, 0.2, flake.x, flake.y, br);
    bokeh.addColorStop(0, `rgba(240, 249, 255, ${flake.alpha * 0.6})`);
    bokeh.addColorStop(1, 'rgba(224, 242, 254, 0)');
    ctx.fillStyle = bokeh;
    ctx.beginPath();
    ctx.arc(flake.x, flake.y, br, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 16. Floating Score & Combo Popups
  for (const ft of state.floatingTexts) {
    const progress = 1 - ft.life / ft.maxLife;
    const alpha = ft.life < 0.25 ? ft.life / 0.25 : 1;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.font = `700 ${Math.round(16 * ft.scale)}px "Fredoka", sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = 'rgba(6, 12, 30, 0.92)';
    ctx.strokeText(ft.text, ft.x, ft.y - progress * 8);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y - progress * 8);
    ctx.restore();
  }

  // 17. Hurry Up Banner flash
  if (state.hurryUpBannerTimer > 0) {
    const pulse = 0.75 + 0.25 * Math.sin(time * 16);
    ctx.save();
    ctx.globalAlpha = Math.min(1, state.hurryUpBannerTimer) * pulse;
    ctx.font = '700 30px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 6.5;
    ctx.strokeStyle = '#1e0b18';
    ctx.strokeText('HURRY UP!', PLAYFIELD_WIDTH / 2, 118);
    ctx.fillStyle = '#fb923c';
    ctx.fillText('HURRY UP!', PLAYFIELD_WIDTH / 2, 118);
    ctx.restore();
  }

  // 18. Classic Snow Bros FLOOR XX Entry Banner
  if (state.floorBannerTimer > 0) {
    const fade = Math.min(1, state.floorBannerTimer * 2.2);
    ctx.save();
    ctx.globalAlpha = fade;
    const isBossFloor = Boolean(stage.boss);
    const title = isBossFloor
      ? `FLOOR ${String(stage.id).padStart(2, '0')} · BOSS!`
      : `FLOOR ${String(stage.id).padStart(2, '0')}`;
    ctx.font = '700 34px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(6, 12, 30, 0.94)';
    ctx.strokeText(title, PLAYFIELD_WIDTH / 2, 156);
    ctx.fillStyle = isBossFloor ? '#fbbf24' : '#e0f2fe';
    ctx.fillText(title, PLAYFIELD_WIDTH / 2, 156);

    ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeText(stage.subtitle, PLAYFIELD_WIDTH / 2, 182);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillText(stage.subtitle, PLAYFIELD_WIDTH / 2, 182);
    ctx.restore();
  }

  // 19. Classic Floor Clear & Mega-Sweep Bonus Rain Banner
  if (state.floorClearBannerTimer > 0) {
    ctx.save();
    ctx.textAlign = 'center';
    const headline = state.bonusRainActive
      ? 'GREAT SWEEP! BONUS RAIN!'
      : `FLOOR ${String(stage.id).padStart(2, '0')} CLEAR!`;
    ctx.font = '700 32px "Fredoka", sans-serif';
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(6, 12, 30, 0.94)';
    ctx.strokeText(headline, PLAYFIELD_WIDTH / 2, 148);
    ctx.fillStyle = state.bonusRainActive ? '#fde047' : '#7dd3fc';
    ctx.fillText(headline, PLAYFIELD_WIDTH / 2, 148);

    const secsLeft = Math.max(1, Math.ceil(state.floorClearBannerTimer));
    const subtext = state.bonusRainActive
      ? `Grab falling treasure · Next floor in ${secsLeft}s`
      : stage.id >= 100
        ? `Victory screen in ${secsLeft}s`
        : `Next floor in ${secsLeft}s`;
    ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeText(subtext, PLAYFIELD_WIDTH / 2, 174);
    ctx.fillStyle = state.bonusRainActive ? '#fef08a' : '#e0f2fe';
    ctx.fillText(subtext, PLAYFIELD_WIDTH / 2, 174);
    ctx.restore();
  }

  // 20. Vertical Tower-Climb Transition Curtain
  if (state.transitionProgress > 0) {
    const p = state.transitionProgress;
    const curtainH = PLAYFIELD_HEIGHT * Math.sin(Math.min(1, p) * Math.PI);
    const yStart = PLAYFIELD_HEIGHT - curtainH;
    const grad = ctx.createLinearGradient(0, yStart, 0, PLAYFIELD_HEIGHT);
    grad.addColorStop(0, 'rgba(14, 30, 66, 0.96)');
    grad.addColorStop(1, 'rgba(6, 12, 28, 0.98)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, yStart, PLAYFIELD_WIDTH, curtainH);

    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(0, yStart, PLAYFIELD_WIDTH, 4);
  }

  // 21. Cinematic Edge Vignette
  const vignette = ctx.createRadialGradient(
    PLAYFIELD_WIDTH / 2,
    PLAYFIELD_HEIGHT / 2,
    PLAYFIELD_WIDTH * 0.35,
    PLAYFIELD_WIDTH / 2,
    PLAYFIELD_HEIGHT / 2,
    PLAYFIELD_WIDTH * 0.74
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(2, 6, 18, 0.38)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);

  ctx.restore();
}

function drawLiveTorches(ctx: CanvasRenderingContext2D, time: number): void {
  const sconceYs = [150, 340, 500];
  for (const isLeft of [true, false]) {
    const sx = isLeft ? WALL_THICKNESS + 5 : PLAYFIELD_WIDTH - WALL_THICKNESS - 5;
    for (const sy of sconceYs) {
      const flicker = 0.88 + 0.14 * Math.sin(time * 11 + sy + (isLeft ? 0 : 2));
      const sway = Math.sin(time * 9 + sy) * 1.4;

      // Warm radial light cast onto walls & air
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(sx, sy - 4, 2, sx, sy - 4, 48 * flicker);
      glow.addColorStop(0, 'rgba(253, 224, 71, 0.28)');
      glow.addColorStop(0.42, 'rgba(251, 146, 60, 0.12)');
      glow.addColorStop(1, 'rgba(251, 146, 60, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sx, sy - 4, 48 * flicker, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Teardrop outer orange flame
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(sx - 4.2, sy - 1);
      ctx.quadraticCurveTo(sx - 5, sy - 8, sx + sway, sy - 14 * flicker);
      ctx.quadraticCurveTo(sx + 5, sy - 8, sx + 4.2, sy - 1);
      ctx.closePath();
      ctx.fill();

      // Bright yellow-white core flame
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(sx - 2.2, sy - 1.5);
      ctx.quadraticCurveTo(sx - 2.4, sy - 6, sx + sway * 0.5, sy - 9.5 * flicker);
      ctx.quadraticCurveTo(sx + 2.4, sy - 6, sx + 2.2, sy - 1.5);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawFloorIceReflections(ctx: CanvasRenderingContext2D, state: RenderState): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(WALL_THICKNESS, FLOOR_Y, PLAYFIELD_WIDTH - WALL_THICKNESS * 2, 14);
  ctx.clip();

  // Player ice mirror reflection
  const p = state.player;
  if (p.y + p.h > FLOOR_Y - 85) {
    const dist = Math.max(0, FLOOR_Y - (p.y + p.h));
    const alpha = Math.max(0.04, 0.24 - dist * 0.0024);
    ctx.fillStyle = `rgba(186, 230, 253, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(p.x + p.w / 2, FLOOR_Y + 6 + dist * 0.08, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Enemy & Snowball ice mirror reflections
  for (const e of state.enemies) {
    if (e.y + e.h > FLOOR_Y - 80) {
      const dist = Math.max(0, FLOOR_Y - (e.y + e.h));
      const alpha = Math.max(0.04, 0.22 - dist * 0.0024);
      ctx.fillStyle =
        e.snowLevel >= e.maxSnow
          ? `rgba(224, 242, 254, ${alpha})`
          : e.kind === 'gobbo'
            ? `rgba(248, 113, 113, ${alpha * 0.85})`
            : e.kind === 'spitfire'
              ? `rgba(192, 132, 252, ${alpha * 0.85})`
              : e.kind === 'zippy'
                ? `rgba(74, 222, 128, ${alpha * 0.85})`
                : `rgba(96, 165, 250, ${alpha * 0.85})`;
      ctx.beginPath();
      ctx.ellipse(e.x + e.w / 2, FLOOR_Y + 6 + dist * 0.08, e.w * 0.45, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Boss ice mirror reflection
  if (state.boss && state.boss.y + state.boss.h > FLOOR_Y - 120) {
    const b = state.boss;
    const dist = Math.max(0, FLOOR_Y - (b.y + b.h));
    const alpha = Math.max(0.05, 0.28 - dist * 0.002);
    ctx.fillStyle = `rgba(147, 197, 253, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(b.x + b.w / 2, FLOOR_Y + 7 + dist * 0.08, b.w * 0.46, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: PlayerState, time: number): void {
  if (p.invulnTimer > 0 && Math.floor(p.invulnTimer * 18) % 2 === 0) {
    return;
  }

  const cx = p.x + p.w / 2;
  const bottomY = p.y + p.h;
  const isGiant = p.giantTimer > 0;
  const scale = isGiant ? 1.4 : 1;

  // Realistic Soft Multi-Layer Ground Contact Shadow
  if (p.onGround) {
    ctx.save();
    const shGrad = ctx.createRadialGradient(cx, bottomY, 2, cx, bottomY, 17 * scale);
    shGrad.addColorStop(0, 'rgba(2, 6, 18, 0.56)');
    shGrad.addColorStop(0.65, 'rgba(2, 6, 18, 0.25)');
    shGrad.addColorStop(1, 'rgba(2, 6, 18, 0)');
    ctx.fillStyle = shGrad;
    ctx.beginPath();
    ctx.ellipse(cx, bottomY, 17 * scale, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(cx, bottomY);
  ctx.scale(p.facing * p.squashX * scale, p.squashY * scale);

  // Giant Frost Aura
  if (isGiant) {
    const pulse = 0.65 + 0.35 * Math.sin(time * 12);
    const aura = ctx.createRadialGradient(0, -19, 8, 0, -19, 30);
    aura.addColorStop(0, `rgba(103, 232, 249, ${0.35 * pulse})`);
    aura.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, -19, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  // Spawn shield ring
  if (p.spawnShieldTimer > 0) {
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -19, 23 + Math.sin(time * 14) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  const isWalking = p.onGround && Math.abs(p.vx) > 15;
  const stride = isWalking ? Math.sin(p.walkCycle * 15) : 0;
  const step = stride * 4.8;
  const bob = isWalking ? Math.abs(stride) * -1.5 : Math.sin(time * 4) * 0.55;
  const isThrowing = p.shootCooldown > 0.09;
  const isJumpingUp = !p.onGround && p.vy < -30;
  const isFalling = !p.onGround && p.vy > 60;
  const isBlinking = (time % 3.6) < 0.11;
  const lean = Math.max(-0.1, Math.min(0.1, (p.vx * p.facing) / 2500));
  const outline = '#09132a';

  ctx.translate(0, bob);
  ctx.rotate(lean);

  // 1. Insulated Winter Snow Boots with White Fur Cuffs & Tread Soles
  const bootMain = p.speedLevel > 0 ? '#f59e0b' : '#1d4ed8';
  const bootDark = p.speedLevel > 0 ? '#b45309' : '#1e3a8a';
  const bootShine = p.speedLevel > 0 ? '#fef08a' : '#93c5fd';
  const jumpFootLift = !p.onGround ? -1.8 : 0;

  for (let idx = 0; idx < 2; idx++) {
    const bx = idx === 0 ? -10.5 + step : 1.5 - step;
    const footLift = isWalking
      ? Math.max(0, idx === 0 ? stride : -stride) * -2.2
      : jumpFootLift;
    const by = -8 + footLift;

    const bGrad = ctx.createLinearGradient(bx, by, bx, by + 8);
    bGrad.addColorStop(0, bootShine);
    bGrad.addColorStop(0.28, bootMain);
    bGrad.addColorStop(1, bootDark);
    ctx.fillStyle = bGrad;
    drawRoundedRect(ctx, bx, by, 9.8, 7.8, 3.6);
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // Rubber sole tread
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(bx + 1, by + 6, 7.8, 1.8);
    // White fur cuff trim
    ctx.fillStyle = '#f8fafc';
    drawRoundedRect(ctx, bx + 0.5, by - 1.2, 8.6, 2.6, 1.2);
    ctx.fill();
  }

  // 2. Back Wool Mitten Arm
  const backArmY = isJumpingUp ? -21.5 : isFalling ? -20.5 : -16 - step * 0.35;
  const backArmGrad = ctx.createRadialGradient(-11, backArmY - 1, 1, -10, backArmY, 4.5);
  backArmGrad.addColorStop(0, '#ffffff');
  backArmGrad.addColorStop(1, '#94a3b8');
  ctx.fillStyle = backArmGrad;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(-10, backArmY, 4.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 3. Volumetric 3D Snowman Torso + Cool Rim Light
  const bellyGrad = ctx.createRadialGradient(-2, -18, 2, 0, -15, 13);
  bellyGrad.addColorStop(0, '#ffffff');
  bellyGrad.addColorStop(0.7, '#eef4fb');
  bellyGrad.addColorStop(1, '#b8c9de');
  ctx.fillStyle = bellyGrad;
  ctx.beginPath();
  ctx.ellipse(0, -15.5, 11.6, 10.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // 4. Denim Blue Dungarees / Overalls with Stitching, Bib & Brass Buttons
  const overallGrad = ctx.createLinearGradient(-11, -22, 11, -6);
  overallGrad.addColorStop(0, '#60a5fa');
  overallGrad.addColorStop(0.4, '#2563eb');
  overallGrad.addColorStop(1, '#1e3a8a');
  ctx.fillStyle = overallGrad;
  ctx.beginPath();
  ctx.moveTo(-10.6, -17.2);
  ctx.lineTo(10.6, -17.2);
  ctx.quadraticCurveTo(11.6, -7, 8, -6.5);
  ctx.lineTo(-8, -6.5);
  ctx.quadraticCurveTo(-11.6, -7, -10.6, -17.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Bib & shoulder straps
  ctx.fillStyle = '#2563eb';
  drawRoundedRect(ctx, -6.5, -23.5, 14, 8, 2.2);
  ctx.fill();
  ctx.stroke();

  // Denim pocket & stitching line
  ctx.strokeStyle = 'rgba(147, 197, 253, 0.55)';
  ctx.lineWidth = 0.85;
  ctx.strokeRect(-4, -15, 9, 5.5);

  // Gleaming 3D Brass Buttons
  for (const bx of [-3.5, 4.5]) {
    const btnGrad = ctx.createRadialGradient(bx - 0.5, -21, 0.2, bx, -20.5, 1.7);
    btnGrad.addColorStop(0, '#fef08a');
    btnGrad.addColorStop(0.7, '#f59e0b');
    btnGrad.addColorStop(1, '#92400e');
    ctx.fillStyle = btnGrad;
    ctx.beginPath();
    ctx.arc(bx, -20.5, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Front Throwing Mitten Arm + Snow Cuff
  const frontArmX = isThrowing ? 13.5 : isFalling ? 11.2 : 9.8;
  const frontArmY = isThrowing ? -18.5 : isJumpingUp ? -21.5 : isFalling ? -19.8 : -15 + step * 0.35;
  const fArmGrad = ctx.createRadialGradient(frontArmX - 1.2, frontArmY - 1.2, 1, frontArmX, frontArmY, 4.8);
  fArmGrad.addColorStop(0, p.powerLevel > 0 ? '#cffafe' : '#ffffff');
  fArmGrad.addColorStop(1, p.powerLevel > 0 ? '#22d3ee' : '#cbd5e1');
  ctx.fillStyle = fArmGrad;
  ctx.beginPath();
  ctx.arc(frontArmX, frontArmY, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // 6. Volumetric 3D Snowman Head + Collar Contact Occlusion Shadow
  const headGrad = ctx.createRadialGradient(-2.5, -34.5, 2, 0, -29.5, 13.5);
  headGrad.addColorStop(0, '#ffffff');
  headGrad.addColorStop(0.68, '#f1f6fc');
  headGrad.addColorStop(1, '#b6c7dc');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.ellipse(0, -29.5, 12, 10.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Soft shadow cast by hat brim onto forehead
  ctx.fillStyle = 'rgba(30, 58, 138, 0.14)';
  ctx.beginPath();
  ctx.ellipse(0, -33.5, 10.5, 2.2, 0, 0, Math.PI);
  ctx.fill();

  // Subsurface rosy cheek blush
  for (const [rx, ry, rw] of [
    [7.2, -26.8, 2.7],
    [-4.6, -26.8, 2.3],
  ]) {
    const blush = ctx.createRadialGradient(rx, ry, 0.3, rx, ry, rw);
    blush.addColorStop(0, 'rgba(251, 113, 133, 0.62)');
    blush.addColorStop(1, 'rgba(251, 113, 133, 0)');
    ctx.fillStyle = blush;
    ctx.beginPath();
    ctx.ellipse(rx, ry, rw, rw * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Expressive 3D Glossy Eyes + Natural Blink
  if (isBlinking) {
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(3.4, -29.8);
    ctx.lineTo(7.6, -29.8);
    ctx.moveTo(-2.6, -29.8);
    ctx.lineTo(1.2, -29.8);
    ctx.stroke();
  } else {
    for (const [ex, rx, ry] of [
      [5.5, 2.2, 3.1],
      [-0.5, 2.0, 2.9],
    ]) {
      ctx.fillStyle = '#091124';
      ctx.beginPath();
      ctx.ellipse(ex, -30, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      // Primary + secondary catchlight
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + 0.6, -31.2, 0.95, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(186, 230, 253, 0.7)';
      ctx.beginPath();
      ctx.arc(ex - 0.5, -28.6, 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Warm Smile
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(3.0, -26.3, 2.2, 0.15, Math.PI - 0.15);
  ctx.stroke();

  // 7. Knitted Pointed Blue Snow Bros Hat + Ribbed Wool Cuff + Multi-Tuft Pom-Pom
  const hatSway = Math.sin(time * 8 + p.walkCycle * 5) * 1.4 + (isFalling ? -2.2 : 0);
  const capGrad = ctx.createLinearGradient(-12, -49, 10, -34);
  capGrad.addColorStop(0, '#93c5fd');
  capGrad.addColorStop(0.45, '#2563eb');
  capGrad.addColorStop(1, '#1e3a8a');
  ctx.fillStyle = capGrad;
  ctx.beginPath();
  ctx.moveTo(-11.8, -35);
  ctx.quadraticCurveTo(-11, -46.5, -2, -47.8);
  ctx.quadraticCurveTo(-13.5, -49.5, -15.5, -43 + hatSway);
  ctx.quadraticCurveTo(-6, -42, 11.8, -35);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Subtle knitted seam lines on hat
  ctx.strokeStyle = 'rgba(191, 219, 254, 0.25)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-6, -38);
  ctx.quadraticCurveTo(-7, -44, -10, -45.5 + hatSway * 0.5);
  ctx.moveTo(2, -38);
  ctx.quadraticCurveTo(-1, -44, -6, -46.5 + hatSway * 0.4);
  ctx.stroke();

  // Fluffy Ribbed White Hat Brim
  const brimGrad = ctx.createLinearGradient(0, -38, 0, -32);
  brimGrad.addColorStop(0, '#ffffff');
  brimGrad.addColorStop(1, '#cbd5e1');
  ctx.fillStyle = brimGrad;
  drawRoundedRect(ctx, -12.6, -37.5, 25.2, 5.2, 2.6);
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Ribbed knit grooves on brim
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
  ctx.lineWidth = 0.8;
  for (let gx = -9; gx <= 9; gx += 4.5) {
    ctx.beginPath();
    ctx.moveTo(gx, -37);
    ctx.lineTo(gx, -32.8);
    ctx.stroke();
  }

  // Fluffy White Pom-Pom Bobble
  const pomGrad = ctx.createRadialGradient(-16.5, -44.5 + hatSway, 1, -15.2, -43 + hatSway, 4.6);
  pomGrad.addColorStop(0, '#ffffff');
  pomGrad.addColorStop(1, '#cbd5e1');
  ctx.fillStyle = pomGrad;
  ctx.beginPath();
  ctx.arc(-15.2, -43 + hatSway, 4.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.3;
  ctx.stroke();

  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: EnemyState, time: number): void {
  const cx = e.x + e.w / 2;
  const bottomY = e.y + e.h;

  // Soft Radial Contact Shadow
  if (e.onGround) {
    ctx.save();
    const shGrad = ctx.createRadialGradient(cx, bottomY, 2, cx, bottomY, e.w * 0.56);
    shGrad.addColorStop(0, 'rgba(2, 6, 18, 0.52)');
    shGrad.addColorStop(1, 'rgba(2, 6, 18, 0)');
    ctx.fillStyle = shGrad;
    ctx.beginPath();
    ctx.ellipse(cx, bottomY, e.w * 0.56, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Full Snowball Encasement (3D Packed Snow Sphere + Ice Refraction)
  if (e.snowLevel >= e.maxSnow) {
    const radius = Math.max(e.w, e.h) * 0.56;
    const ballCy = bottomY - radius + 1;
    const meltWarn = e.meltTimer > 4.2 && !e.isRolling;
    const wobble = meltWarn ? Math.sin(time * 42) * 2.5 : 0;

    ctx.save();
    ctx.translate(cx + wobble, ballCy);

    if (e.isRolling) {
      const trailDir = -Math.sign(e.rollVx || 1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const trailGrad = ctx.createLinearGradient(0, 0, trailDir * 44, 0);
      trailGrad.addColorStop(0, 'rgba(186, 230, 253, 0.35)');
      trailGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = trailGrad;
      ctx.beginPath();
      ctx.moveTo(0, -radius * 0.85);
      ctx.lineTo(trailDir * 44, -radius * 0.35);
      ctx.lineTo(trailDir * 44, radius * 0.35);
      ctx.lineTo(0, radius * 0.85);
      ctx.closePath();
      ctx.fill();

      const aura = ctx.createRadialGradient(0, 0, radius * 0.75, 0, 0, radius + 14);
      aura.addColorStop(0, 'rgba(125, 211, 252, 0.45)');
      aura.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, radius + 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const grad = ctx.createRadialGradient(-radius * 0.35, -radius * 0.35, 2, 0, 0, radius);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.52, '#e0f2fe');
    grad.addColorStop(0.84, '#93c5fd');
    grad.addColorStop(1, '#3b82f6');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = e.isRolling ? '#bae6fd' : 'rgba(147, 197, 253, 0.88)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    const spin = e.isRolling ? e.rollAge * 13 * Math.sign(e.rollVx || 1) : 0;
    ctx.rotate(spin);

    // Packed snow grain texture dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    for (const [dx, dy, dr] of [
      [-6, -7, 1.4],
      [7, -4, 1.2],
      [-5, 6, 1.5],
      [5, 7, 1.1],
    ]) {
      ctx.beginPath();
      ctx.arc(dx, dy, dr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Refracted monster core silhouette inside ice shell
    ctx.fillStyle =
      e.kind === 'gobbo'
        ? 'rgba(220, 38, 38, 0.34)'
        : e.kind === 'spitfire'
          ? 'rgba(147, 51, 234, 0.34)'
          : e.kind === 'zippy'
            ? 'rgba(22, 163, 74, 0.34)'
            : 'rgba(37, 99, 235, 0.34)';
    ctx.beginPath();
    ctx.arc(0, 1, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-4, -1, 2.2, 0, Math.PI * 2);
    ctx.arc(4, -1, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Glossy specular crescent
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.beginPath();
    ctx.ellipse(-radius * 0.36, -radius * 0.36, radius * 0.27, radius * 0.14, -0.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    return;
  }

  // Active or Partially Snowed Monster
  ctx.save();
  ctx.translate(cx, bottomY);
  ctx.scale(e.dir * e.squashX, e.squashY);

  const step = e.onGround && Math.abs(e.vx) > 8 ? Math.sin(e.walkCycle * 12) * 3 : 0;

  if (e.kind === 'ghost') {
    const bob = Math.sin(time * 6) * 4;
    ctx.translate(0, bob);
    const stunned = e.ghostStunTimer > 0;
    const outline = '#1a0b24';

    // Ectoplasm aura
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gAura = ctx.createRadialGradient(0, -18, 4, 0, -18, 24);
    gAura.addColorStop(0, stunned ? 'rgba(56, 189, 248, 0.28)' : 'rgba(249, 115, 22, 0.26)');
    gAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gAura;
    ctx.beginPath();
    ctx.arc(0, -18, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Shaded velvet ghostly cloak
    const cloakGrad = ctx.createLinearGradient(0, -12, 0, 4);
    cloakGrad.addColorStop(0, stunned ? '#475569' : '#4c1d95');
    cloakGrad.addColorStop(1, stunned ? '#1e293b' : '#2e1065');
    ctx.fillStyle = cloakGrad;
    ctx.beginPath();
    ctx.moveTo(-12.5, -10);
    ctx.lineTo(-15.5, 2.5);
    ctx.lineTo(-7, -3);
    ctx.lineTo(0, 3.5);
    ctx.lineTo(7, -3);
    ctx.lineTo(15.5, 2.5);
    ctx.lineTo(12.5, -10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Carved glowing Jack-o'-lantern head
    const pumpGrad = ctx.createRadialGradient(-4, -23, 2, 0, -19, 16);
    pumpGrad.addColorStop(0, stunned ? '#bae6fd' : '#fdba74');
    pumpGrad.addColorStop(0.55, stunned ? '#60a5fa' : '#f97316');
    pumpGrad.addColorStop(1, stunned ? '#1d4ed8' : '#9a3412');
    ctx.fillStyle = pumpGrad;
    ctx.beginPath();
    ctx.ellipse(0, -19, 14.5, 13.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(124, 45, 18, 0.45)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(0, -19, 6.5, 13, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.moveTo(-2.5, -32);
    ctx.quadraticCurveTo(-1, -39, 4, -37);
    ctx.lineTo(2, -32);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(-8, -23);
    ctx.lineTo(-2, -20);
    ctx.lineTo(-7, -17);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, -23);
    ctx.lineTo(2, -20);
    ctx.lineTo(7, -17);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -13);
    ctx.lineTo(-4, -10.5);
    ctx.lineTo(0, -13.5);
    ctx.lineTo(4, -10.5);
    ctx.lineTo(8, -13);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const ink = '#0f172a';

  if (e.kind === 'gobbo') {
    // Red Demon (Akuma) with 3D sculpted skin, striated horns & gloss eyes
    ctx.fillStyle = '#7f1d1d';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.4;
    for (const fx of [-9.5 + step, 2 - step]) {
      drawRoundedRect(ctx, fx, -6.5, 8, 6.5, 2.5);
      ctx.fill();
      ctx.stroke();
    }

    const bodyGrad = ctx.createRadialGradient(-4, -23, 2, 0, -16, 17);
    if (e.hitFlashTimer > 0) {
      bodyGrad.addColorStop(0, '#ffffff');
      bodyGrad.addColorStop(1, '#fecaca');
    } else {
      bodyGrad.addColorStop(0, '#fda4af');
      bodyGrad.addColorStop(0.45, '#ef4444');
      bodyGrad.addColorStop(1, '#881337');
    }
    ctx.fillStyle = bodyGrad;
    drawRoundedRect(ctx, -12.5, -29, 25, 23.5, 9.5);
    ctx.fill();
    ctx.stroke();

    const bellyGrad = ctx.createRadialGradient(1, -15, 1, 2, -13, 7);
    bellyGrad.addColorStop(0, '#fffbeb');
    bellyGrad.addColorStop(1, '#fde68a');
    ctx.fillStyle = bellyGrad;
    ctx.beginPath();
    ctx.ellipse(2, -13, 6.6, 6.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Striated curved ivory devil horns
    const hornGrad = ctx.createLinearGradient(-10, -37, 10, -28);
    hornGrad.addColorStop(0, '#fef9c3');
    hornGrad.addColorStop(1, '#eab308');
    ctx.fillStyle = hornGrad;
    ctx.beginPath();
    ctx.moveTo(-7.5, -27.5);
    ctx.quadraticCurveTo(-13, -34, -9, -37.5);
    ctx.lineTo(-3, -29);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(6.5, -27.5);
    ctx.quadraticCurveTo(12, -34, 9.5, -37.5);
    ctx.lineTo(2.5, -29);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glossy sclera + iris + specular dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(5, -21, 3.8, 4.2, 0, 0, Math.PI * 2);
    ctx.ellipse(-2, -21, 3.3, 3.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(6, -21, 1.7, 0, Math.PI * 2);
    ctx.arc(-1, -21, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(6.2, -22.2, 1.1, 1.1);
    ctx.fillRect(-0.8, -22.2, 1.0, 1.0);

    // Shadowed jaw with gleaming fangs
    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.arc(2.5, -15, 5.2, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-1, -15);
    ctx.lineTo(0.5, -12.3);
    ctx.lineTo(2, -15);
    ctx.moveTo(4, -15);
    ctx.lineTo(5.5, -12.3);
    ctx.lineTo(7, -15);
    ctx.fill();
  } else if (e.kind === 'spitfire') {
    const puff = e.aiPhase === 'windup' ? 1 + 0.22 * Math.sin(time * 28) : 1;
    ctx.fillStyle = '#4c1d95';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.4;
    for (const fx of [-10 + step, 2 - step]) {
      drawRoundedRect(ctx, fx, -6.5, 8, 6.5, 2.5);
      ctx.fill();
      ctx.stroke();
    }

    // Golden dorsal crest spines
    ctx.fillStyle = '#facc15';
    for (const sy of [-28, -22, -16]) {
      ctx.beginPath();
      ctx.moveTo(-10, sy + 2);
      ctx.lineTo(-17, sy - 1);
      ctx.lineTo(-10, sy - 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    const spitGrad = ctx.createRadialGradient(-4, -22, 2, 0, -17, 17);
    if (e.hitFlashTimer > 0) {
      spitGrad.addColorStop(0, '#ffffff');
      spitGrad.addColorStop(1, '#e9d5ff');
    } else {
      spitGrad.addColorStop(0, '#d8b4fe');
      spitGrad.addColorStop(0.5, '#9333ea');
      spitGrad.addColorStop(1, '#4c1d95');
    }
    ctx.fillStyle = spitGrad;
    ctx.beginPath();
    ctx.ellipse(0, -17.5, 13 * puff, 13.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Glowing magma throat sac when winding up
    if (e.aiPhase === 'windup') {
      const fireSac = ctx.createRadialGradient(7, -14, 1, 7, -14, 6.2 * puff);
      fireSac.addColorStop(0, '#fef08a');
      fireSac.addColorStop(0.6, '#f97316');
      fireSac.addColorStop(1, '#dc2626');
      ctx.fillStyle = fireSac;
      ctx.beginPath();
      ctx.arc(7, -14, 6 * puff, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.ellipse(3, -12.5, 6.2, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(5, -23, 3.8, 0, Math.PI * 2);
    ctx.arc(-1.5, -23, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(6, -23, 1.2, 2.2, 0, 0, Math.PI * 2);
    ctx.ellipse(-1, -23, 1.0, 2.0, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'zippy') {
    const crouchY = e.aiPhase === 'jump_crouch' ? 4 : 0;
    ctx.translate(0, crouchY);
    ctx.fillStyle = '#14532d';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.4;
    for (const fx of [-9.5 + step, 2 - step]) {
      drawRoundedRect(ctx, fx, -6.5, 7.5, 6.5, 2.5);
      ctx.fill();
      ctx.stroke();
    }

    const zipGrad = ctx.createRadialGradient(-4, -22, 2, 0, -17, 16);
    if (e.hitFlashTimer > 0) {
      zipGrad.addColorStop(0, '#ffffff');
      zipGrad.addColorStop(1, '#bbf7d0');
    } else {
      zipGrad.addColorStop(0, '#86efac');
      zipGrad.addColorStop(0.5, '#16a34a');
      zipGrad.addColorStop(1, '#052e16');
    }
    ctx.fillStyle = zipGrad;
    drawRoundedRect(ctx, -11.5, -29.5, 23, 24, 8);
    ctx.fill();
    ctx.stroke();

    // Glossy amphibian specular highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.ellipse(-4, -26, 4.5, 1.8, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Woven ninja scarf & fluttering tail
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-11.5, -24.5, 23, 4.2);
    ctx.strokeRect(-11.5, -24.5, 23, 4.2);
    const tailFlutter = Math.sin(time * 16 + e.id) * 2;
    ctx.beginPath();
    ctx.moveTo(-11.5, -22.5);
    ctx.lineTo(-19.5, -26 + tailFlutter);
    ctx.lineTo(-16.5, -19.5 + tailFlutter);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0.5, -21, 9, 4.8);
    ctx.strokeRect(0.5, -21, 9, 4.8);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(5.2, -20, 3, 3.2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(5.8, -19.5, 1, 1);
  } else if (e.kind === 'yeti') {
    ctx.fillStyle = '#172554';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.5;
    for (const fx of [-12 + step, 3 - step]) {
      drawRoundedRect(ctx, fx, -7.5, 9.5, 7.5, 2.5);
      ctx.fill();
      ctx.stroke();
    }

    const yetiGrad = ctx.createRadialGradient(-5, -25, 3, 0, -20, 21);
    if (e.hitFlashTimer > 0) {
      yetiGrad.addColorStop(0, '#ffffff');
      yetiGrad.addColorStop(1, '#dbeafe');
    } else {
      yetiGrad.addColorStop(0, '#93c5fd');
      yetiGrad.addColorStop(0.5, '#2563eb');
      yetiGrad.addColorStop(1, '#172554');
    }
    ctx.fillStyle = yetiGrad;
    drawRoundedRect(ctx, -15, -34.5, 30, 28, 9.5);
    ctx.fill();
    ctx.stroke();

    // Layered shaggy white fur chest mane
    const furGrad = ctx.createLinearGradient(0, -21, 0, -9);
    furGrad.addColorStop(0, '#ffffff');
    furGrad.addColorStop(1, '#bae6fd');
    ctx.fillStyle = furGrad;
    drawRoundedRect(ctx, -10.5, -20, 21, 11, 4);
    ctx.fill();
    ctx.stroke();

    // Ivory curved tusks
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(-9, -32.5);
    ctx.quadraticCurveTo(-17, -38.5, -11, -43.5);
    ctx.lineTo(-4.5, -34.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(9, -32.5);
    ctx.quadraticCurveTo(17, -38.5, 11, -43.5);
    ctx.lineTo(4.5, -34.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(5.5, -25.5, 3.2, 0, Math.PI * 2);
    ctx.arc(-3, -25.5, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(6.0, -25.5, 1.3, 0, Math.PI * 2);
    ctx.arc(-2.5, -25.5, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sculpted Partial Snow Encasement Layers (snowLevel 1..maxSnow-1)
  if (e.snowLevel > 0) {
    const ratio = e.snowLevel / e.maxSnow;
    const snowH = e.h * Math.min(0.88, 0.32 + ratio * 0.56);
    const snowW = e.w * (0.66 + ratio * 0.34);
    const sGrad = ctx.createRadialGradient(-3, -snowH * 0.55, 2, 0, -snowH * 0.4, snowW * 0.65);
    sGrad.addColorStop(0, '#ffffff');
    sGrad.addColorStop(0.65, '#e0f2fe');
    sGrad.addColorStop(1, '#93c5fd');
    ctx.fillStyle = sGrad;
    ctx.beginPath();
    ctx.ellipse(0, -snowH * 0.45, snowW * 0.53, snowH * 0.56, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  ctx.restore();
}

function drawBoss(ctx: CanvasRenderingContext2D, b: BossState, time: number): void {
  const cx = b.x + b.w / 2;
  const bottomY = b.y + b.h;
  const isIceBoss = b.kind === 'emperor_blizzor' || b.kind === 'frost_warden';

  // Soft Ground Shadow beneath Boss
  if (b.onGround) {
    ctx.save();
    const shGrad = ctx.createRadialGradient(cx, bottomY, 4, cx, bottomY, b.w * 0.62);
    shGrad.addColorStop(0, 'rgba(2, 6, 18, 0.62)');
    shGrad.addColorStop(1, 'rgba(2, 6, 18, 0)');
    ctx.fillStyle = shGrad;
    ctx.beginPath();
    ctx.ellipse(cx, bottomY, b.w * 0.62, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(cx, bottomY);
  ctx.scale(b.dir * b.squashX, b.squashY);

  if (b.aiPhase === 'windup_breath' || b.aiPhase === 'windup_jump') {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + 0.5 * Math.sin(time * 24);
    const aura = ctx.createRadialGradient(0, -b.h * 0.5, 10, 0, -b.h * 0.5, b.w * 0.85);
    aura.addColorStop(
      0,
      isIceBoss ? `rgba(34, 211, 238, ${0.4 * pulse})` : `rgba(251, 146, 60, ${0.42 * pulse})`
    );
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, -b.h * 0.5, b.w * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const paletteMap: Record<
    BossState['kind'],
    { light: string; primary: string; dark: string; belly: string; crown: string; feet: string; breath: string }
  > = {
    king_scorch: {
      light: '#fda4af',
      primary: '#dc2626',
      dark: '#7f1d1d',
      belly: '#fed7aa',
      crown: '#fbbf24',
      feet: '#7f1d1d',
      breath: '#fb923c',
    },
    frost_warden: {
      light: '#5eead4',
      primary: '#0f766e',
      dark: '#134e4a',
      belly: '#ccfbf1',
      crown: '#38bdf8',
      feet: '#134e4a',
      breath: '#2dd4bf',
    },
    baron_magma: {
      light: '#fb923c',
      primary: '#c2410c',
      dark: '#431407',
      belly: '#fdba74',
      crown: '#facc15',
      feet: '#431407',
      breath: '#f97316',
    },
    emperor_blizzor: {
      light: '#7dd3fc',
      primary: '#0284c7',
      dark: '#0c4a6e',
      belly: '#e0f2fe',
      crown: '#67e8f9',
      feet: '#0f172a',
      breath: '#22d3ee',
    },
  };
  const colors = paletteMap[b.kind];

  const ink = '#091124';
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.8;

  // Veined Animated Bat / Dragon Wing
  const wingFlap = Math.sin(time * 7) * 5.5;
  const wingGrad = ctx.createLinearGradient(-52, -72, -24, -34);
  wingGrad.addColorStop(0, b.hitFlashTimer > 0 ? '#ffffff' : colors.primary);
  wingGrad.addColorStop(1, b.hitFlashTimer > 0 ? '#e2e8f0' : colors.dark);
  ctx.fillStyle = wingGrad;
  ctx.beginPath();
  ctx.moveTo(-26, -54);
  ctx.lineTo(-54, -72 + wingFlap);
  ctx.lineTo(-43, -46 + wingFlap * 0.4);
  ctx.lineTo(-52, -33);
  ctx.lineTo(-26, -33);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Wing bone membrane ribs
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-26, -48);
  ctx.lineTo(-48, -62 + wingFlap * 0.7);
  ctx.moveTo(-26, -42);
  ctx.lineTo(-46, -38);
  ctx.stroke();

  // Heavy Clawed Feet
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.8;
  ctx.fillStyle = colors.feet;
  drawRoundedRect(ctx, -28, -12, 20, 12, 4);
  ctx.fill();
  ctx.stroke();
  drawRoundedRect(ctx, 8, -12, 20, 12, 4);
  ctx.fill();
  ctx.stroke();

  // Sculpted 3D Boss Torso
  const torsoGrad = ctx.createRadialGradient(-10, -58, 6, 0, -42, 48);
  if (b.hitFlashTimer > 0) {
    torsoGrad.addColorStop(0, '#ffffff');
    torsoGrad.addColorStop(1, '#e2e8f0');
  } else {
    torsoGrad.addColorStop(0, colors.light);
    torsoGrad.addColorStop(0.5, colors.primary);
    torsoGrad.addColorStop(1, colors.dark);
  }
  ctx.fillStyle = torsoGrad;
  drawRoundedRect(ctx, -34, -76, 68, 66, 20);
  ctx.fill();
  ctx.stroke();

  // Armored Belly Scales
  ctx.fillStyle = colors.belly;
  drawRoundedRect(ctx, -18, -50, 38, 34, 12);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.22)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-12, -39);
  ctx.lineTo(14, -39);
  ctx.moveTo(-12, -29);
  ctx.lineTo(14, -29);
  ctx.stroke();

  // Clawed Front Arm
  ctx.fillStyle = b.hitFlashTimer > 0 ? '#ffffff' : colors.primary;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.6;
  drawRoundedRect(ctx, 18, -36, 18, 12, 5);
  ctx.fill();
  ctx.stroke();

  // Spiked Tail
  ctx.fillStyle = b.hitFlashTimer > 0 ? '#ffffff' : colors.dark;
  ctx.beginPath();
  ctx.moveTo(-32, -26);
  ctx.lineTo(-52, -37);
  ctx.lineTo(-32, -16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Jeweled Royal Crown with 3D Metallic Sheen
  const crownGrad = ctx.createLinearGradient(0, -96, 0, -74);
  crownGrad.addColorStop(0, '#ffffff');
  crownGrad.addColorStop(0.4, colors.crown);
  crownGrad.addColorStop(1, '#b45309');
  ctx.fillStyle = crownGrad;
  ctx.beginPath();
  ctx.moveTo(-20, -74);
  ctx.lineTo(-24, -92);
  ctx.lineTo(-8, -78);
  ctx.lineTo(0, -97);
  ctx.lineTo(8, -78);
  ctx.lineTo(24, -92);
  ctx.lineTo(20, -74);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Center faceted crown jewel
  ctx.fillStyle = isIceBoss ? '#f43f5e' : '#38bdf8';
  ctx.beginPath();
  ctx.arc(0, -82, 3.2, 0, Math.PI * 2);
  ctx.fill();

  // Fierce Slit-Pupil Eyes with Dual Specular Shine
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(14, -58, 7.2, 0, Math.PI * 2);
  ctx.arc(-4, -58, 6.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(16, -58, 2.4, 3.8, 0, 0, Math.PI * 2);
  ctx.ellipse(-2, -58, 2.1, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(16.5, -60.5, 1.6, 1.6);
  ctx.fillRect(-1.5, -60.5, 1.4, 1.4);

  // Fanged Dragon Jaw
  ctx.fillStyle = b.aiPhase === 'windup_breath' || b.aiPhase === 'breathing' ? colors.breath : '#450a0a';
  ctx.beginPath();
  ctx.ellipse(22, -40, 11, 7.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(15, -44);
  ctx.lineTo(17.5, -39.5);
  ctx.lineTo(20, -44);
  ctx.moveTo(24, -44);
  ctx.lineTo(26.5, -39.5);
  ctx.lineTo(29, -44);
  ctx.fill();

  ctx.restore();
}

function drawSnowShot(ctx: CanvasRenderingContext2D, s: SnowShot): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const aura = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, s.radius + 7);
  aura.addColorStop(0, s.fromGiant ? 'rgba(103, 232, 249, 0.55)' : 'rgba(186, 230, 253, 0.45)');
  aura.addColorStop(1, 'rgba(186, 230, 253, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(s.x, s.y, s.radius + 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  const orb = ctx.createRadialGradient(s.x - s.radius * 0.3, s.y - s.radius * 0.3, 1, s.x, s.y, s.radius);
  orb.addColorStop(0, '#ffffff');
  orb.addColorStop(0.6, '#e0f2fe');
  orb.addColorStop(1, '#38bdf8');
  ctx.fillStyle = orb;
  ctx.beginPath();
  ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

function drawEnemyProjectile(
  ctx: CanvasRenderingContext2D,
  p: EnemyProjectile,
  time: number
): void {
  const pulse = 1 + 0.16 * Math.sin(time * 24);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.radius * 2.2 * pulse);
  glow.addColorStop(0, p.kind === 'ice' ? 'rgba(34, 211, 238, 0.65)' : 'rgba(251, 146, 60, 0.68)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius * 2.2 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fef9c3';
  ctx.beginPath();
  ctx.arc(p.x - 1, p.y - 1, p.radius * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPickup(ctx: CanvasRenderingContext2D, item: PickupItem, time: number): void {
  const cx = item.x + item.w / 2;
  const floatY = Math.sin(time * 5 + item.bobOffset) * 2.5;
  const cy = item.y + item.h / 2 + floatY;
  const blink = item.life < 2.2 && Math.floor(item.life * 12) % 2 === 0;
  if (blink) return;

  if (item.onGround) {
    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 18, 0.42)';
    ctx.beginPath();
    ctx.ellipse(cx, item.y + item.h, 9.5, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(cx, cy);

  if (item.kind.startsWith('potion_')) {
    const colorMap: Record<string, { liquid: string; glow: string; label: string }> = {
      potion_red: { liquid: '#ef4444', glow: 'rgba(239,68,68,0.48)', label: 'S' },
      potion_blue: { liquid: '#38bdf8', glow: 'rgba(56,189,248,0.48)', label: 'P' },
      potion_yellow: { liquid: '#facc15', glow: 'rgba(250,204,21,0.48)', label: 'R' },
      potion_green: { liquid: '#22c55e', glow: 'rgba(34,197,94,0.52)', label: '★' },
    };
    const cfg = colorMap[item.kind];

    const aura = ctx.createRadialGradient(0, 1, 2, 0, 1, 19);
    aura.addColorStop(0, cfg.glow);
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 1, 19, 0, Math.PI * 2);
    ctx.fill();

    // Glass alchemical flask
    const glassGrad = ctx.createRadialGradient(-3, 0, 1, 0, 3, 10);
    glassGrad.addColorStop(0, '#ffffff');
    glassGrad.addColorStop(0.75, 'rgba(224, 242, 254, 0.85)');
    glassGrad.addColorStop(1, 'rgba(148, 163, 184, 0.8)');
    ctx.fillStyle = glassGrad;
    ctx.beginPath();
    ctx.arc(0, 3, 9.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-3.5, -9, 7, 6);

    ctx.fillStyle = '#b45309';
    ctx.fillRect(-3, -12, 6, 4);

    ctx.fillStyle = cfg.liquid;
    ctx.beginPath();
    ctx.arc(0, 3.6, 7.2, 0, Math.PI * 2);
    ctx.fill();

    // Specular glass streak
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.beginPath();
    ctx.ellipse(-4, 0, 1.5, 3.5, -0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cfg.label, 0, 4);
  } else if (item.kind === 'sushi') {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(10, 8);
    ctx.lineTo(-10, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-4, 2, 8, 6);
  } else if (item.kind === 'cake') {
    ctx.fillStyle = '#fef3c7';
    drawRoundedRect(ctx, -10, -4, 20, 12, 3);
    ctx.fill();
    ctx.fillStyle = '#f472b6';
    ctx.fillRect(-10, -4, 20, 4);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, -7, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (item.kind === 'gem') {
    const gemGrad = ctx.createLinearGradient(-10, -11, 10, 11);
    gemGrad.addColorStop(0, '#e0f2fe');
    gemGrad.addColorStop(0.5, '#38bdf8');
    gemGrad.addColorStop(1, '#0369a1');
    ctx.fillStyle = gemGrad;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(10, -2);
    ctx.lineTo(0, 11);
    ctx.lineTo(-10, -2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(5, -2);
    ctx.lineTo(0, 4);
    ctx.lineTo(-5, -2);
    ctx.closePath();
    ctx.fill();
  } else {
    const crownGrad = ctx.createLinearGradient(-10, -9, 10, 7);
    crownGrad.addColorStop(0, '#fef08a');
    crownGrad.addColorStop(0.5, '#fbbf24');
    crownGrad.addColorStop(1, '#d97706');
    ctx.fillStyle = crownGrad;
    ctx.beginPath();
    ctx.moveTo(-10, 7);
    ctx.lineTo(-11, -6);
    ctx.lineTo(-4, 0);
    ctx.lineTo(0, -9);
    ctx.lineTo(4, 0);
    ctx.lineTo(11, -6);
    ctx.lineTo(10, 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 2, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
