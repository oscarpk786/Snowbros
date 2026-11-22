import {
  FLOOR_Y,
  PLAYFIELD_HEIGHT,
  PLAYFIELD_WIDTH,
  STAGES,
  WALL_THICKNESS,
} from './levels';
import { AmbientFlake, renderArena } from './renderer';
import { soundEngine } from './sound';
import {
  BossState,
  ControlScheme,
  Difficulty,
  EnemyKind,
  EnemyProjectile,
  EnemyState,
  FloatingText,
  HudSnapshot,
  Particle,
  PickupItem,
  PickupKind,
  Platform,
  PlayerState,
  SnowShot,
  StageConfig,
} from './types';

const GRAVITY = 1450;
const BASE_MOVE_SPEED = 225;
const JUMP_VELOCITY = -570;
const ROLL_SPEED = 430;
const HIGH_SCORE_KEY = 'snowbros_high_score_v1';

function loadHighScore(): number {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    return raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
  } catch {
    return 0;
  }
}

function saveHighScore(score: number): void {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(score));
  } catch {
    // Ignore storage failures
  }
}

function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export interface EngineCallbacks {
  onHudUpdate: (hud: HudSnapshot) => void;
  onStageClear: (hud: HudSnapshot) => void;
  onVictory: (hud: HudSnapshot) => void;
  onGameOver: (hud: HudSnapshot) => void;
}

export class SnowBrosEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: EngineCallbacks;

  private rafId: number | null = null;
  private lastTimestamp = 0;
  private running = false;
  private paused = false;
  private stageEnded = false;

  // Input state: held vs edge-triggered justPressed
  private held = {
    left: false,
    right: false,
    up: false,
    down: false,
    shoot: false,
  };
  private justPressed = {
    jump: false,
    shoot: false,
  };

  // Game Progression
  private difficulty: Difficulty = 'arcade';
  private controlScheme: ControlScheme = 'classic';
  private stageIndex = 0;
  private stage!: StageConfig;
  private score = 0;
  private highScore = loadHighScore();
  private lives = 3;
  private nextExtraLifeScore = 50000;
  private comboBest = 0;
  private enemiesCrushedTotal = 0;

  // Entities
  private player!: PlayerState;
  private enemies: EnemyState[] = [];
  private boss: BossState | null = null;
  private snowShots: SnowShot[] = [];
  private enemyProjectiles: EnemyProjectile[] = [];
  private pickups: PickupItem[] = [];
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private ambientFlakes: AmbientFlake[] = [];

  private nextId = 1;
  private time = 0;
  private stageTime = 0;
  private hurryUpSpawned = false;
  private hurryUpBannerTimer = 0;
  private floorBannerTimer = 0;
  private floorClearBannerTimer = 0;
  private bonusRainActive = false;
  private maxChainThisStage = 0;
  private transitionTimer = 0;
  private transitionSwapped = false;
  private hitstopTimer = 0;
  private shakeTimer = 0;
  private shakeIntensity = 0;
  private hudSyncAccumulator = 0;
  private stageClearDelayTimer = 0;
  private playerJumpStartBottomY = FLOOR_Y;

  constructor(canvas: HTMLCanvasElement, callbacks: EngineCallbacks) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not initialize 2D context');
    }
    this.ctx = context;
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.callbacks = callbacks;

    // Initialize ambient snowfall
    for (let i = 0; i < 64; i++) {
      this.ambientFlakes.push({
        x: Math.random() * PLAYFIELD_WIDTH,
        y: Math.random() * PLAYFIELD_HEIGHT,
        r: 0.9 + Math.random() * 2.2,
        speed: 18 + Math.random() * 34,
        drift: Math.random() * Math.PI * 2,
        alpha: 0.22 + Math.random() * 0.48,
      });
    }
  }

  public getHighScore(): number {
    return this.highScore;
  }

  public startNewGame(difficulty: Difficulty, startStageIndex = 0): void {
    const clampedIndex = Math.max(0, Math.min(STAGES.length - 1, startStageIndex));
    this.difficulty = difficulty;
    this.score = 0;
    this.lives = 10;
    this.nextExtraLifeScore = 50000;
    this.comboBest = 0;
    this.enemiesCrushedTotal = 0;
    this.stageIndex = clampedIndex;
    this.player = this.createFreshPlayer(STAGES[clampedIndex].playerSpawn);
    this.loadStage(clampedIndex, true);
    this.paused = false;
    this.startLoop();
  }

  public advanceNextStage(): void {
    const nextIdx = this.stageIndex + 1;
    if (nextIdx >= STAGES.length) {
      this.callbacks.onVictory(this.buildHudSnapshot());
      return;
    }
    this.stageIndex = nextIdx;
    this.loadStage(nextIdx, false);
    this.paused = false;
    this.startLoop();
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) {
      soundEngine.setMusicTrack('none');
    } else {
      this.lastTimestamp = performance.now();
      soundEngine.setMusicTrack(this.boss ? 'boss' : 'stage');
    }
  }

  public setControlScheme(scheme: ControlScheme): void {
    this.controlScheme = scheme;
    this.clearInputs();
  }

  public clearInputs(): void {
    this.held.left = false;
    this.held.right = false;
    this.held.up = false;
    this.held.down = false;
    this.held.shoot = false;
    this.justPressed.jump = false;
    this.justPressed.shoot = false;
  }

  public handleKeyDown(code: string): boolean {
    const isClassic = this.controlScheme === 'classic';

    if (code === 'ArrowLeft' || (!isClassic && code === 'KeyA')) {
      this.held.left = true;
      return true;
    }
    if (code === 'ArrowRight' || (!isClassic && code === 'KeyD')) {
      this.held.right = true;
      return true;
    }
    if (code === 'ArrowDown' || (!isClassic && code === 'KeyS')) {
      this.held.down = true;
      return true;
    }
    if (
      code === 'ArrowUp' ||
      code === 'KeyZ' ||
      (isClassic && code === 'KeyS') ||
      (!isClassic && code === 'KeyW')
    ) {
      if (!this.held.up) {
        this.justPressed.jump = true;
      }
      this.held.up = true;
      return true;
    }
    if (
      code === 'Space' ||
      code === 'KeyX' ||
      code === 'KeyJ' ||
      code === 'KeyK' ||
      (isClassic && code === 'KeyA')
    ) {
      if (!this.held.shoot) {
        this.justPressed.shoot = true;
      }
      this.held.shoot = true;
      return true;
    }
    return false;
  }

  public handleKeyUp(code: string): void {
    const isClassic = this.controlScheme === 'classic';

    if (code === 'ArrowLeft' || (!isClassic && code === 'KeyA')) this.held.left = false;
    if (code === 'ArrowRight' || (!isClassic && code === 'KeyD')) this.held.right = false;
    if (code === 'ArrowDown' || (!isClassic && code === 'KeyS')) this.held.down = false;
    if (
      code === 'ArrowUp' ||
      code === 'KeyZ' ||
      (isClassic && code === 'KeyS') ||
      (!isClassic && code === 'KeyW')
    ) {
      this.held.up = false;
    }
    if (
      code === 'Space' ||
      code === 'KeyX' ||
      code === 'KeyJ' ||
      code === 'KeyK' ||
      (isClassic && code === 'KeyA')
    ) {
      this.held.shoot = false;
    }
  }

  // Touch / on-screen control helpers
  public setTouchControl(control: 'left' | 'right' | 'down' | 'jump' | 'shoot', active: boolean): void {
    if (control === 'left') this.held.left = active;
    if (control === 'right') this.held.right = active;
    if (control === 'down') this.held.down = active;
    if (control === 'jump') {
      if (active && !this.held.up) this.justPressed.jump = true;
      this.held.up = active;
    }
    if (control === 'shoot') {
      if (active && !this.held.shoot) this.justPressed.shoot = true;
      this.held.shoot = active;
    }
  }

  public destroy(): void {
    this.running = false;
    soundEngine.setMusicTrack('none');
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private createFreshPlayer(spawn: { x: number; y: number }): PlayerState {
    return {
      x: spawn.x - 14,
      y: spawn.y - 38,
      w: 28,
      h: 38,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: false,
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      dropThroughTimer: 0,
      shootCooldown: 0,
      invulnTimer: 0,
      spawnShieldTimer: 2.0,
      walkCycle: 0,
      squashX: 1,
      squashY: 1,
      pushTimer: 0,
      pushTargetId: null,
      speedLevel: 0,
      powerLevel: 0,
      rangeLevel: 0,
      giantTimer: 0,
    };
  }

  private loadStage(index: number, resetPowerups: boolean): void {
    this.stage = STAGES[index];
    this.stageEnded = false;
    this.stageClearDelayTimer = 0;
    this.stageTime = 0;
    this.hurryUpSpawned = false;
    this.hurryUpBannerTimer = 0;
    this.floorBannerTimer = 1.9;
    this.floorClearBannerTimer = 0;
    this.bonusRainActive = false;
    this.maxChainThisStage = 0;
    this.snowShots = [];
    this.enemyProjectiles = [];
    this.pickups = [];
    this.particles = [];
    this.floatingTexts = [];

    const prevSpeed = resetPowerups ? 0 : this.player.speedLevel;
    const prevPower = resetPowerups ? 0 : this.player.powerLevel;
    const prevRange = resetPowerups ? 0 : this.player.rangeLevel;

    this.player = this.createFreshPlayer(this.stage.playerSpawn);
    this.player.speedLevel = prevSpeed;
    this.player.powerLevel = prevPower;
    this.player.rangeLevel = prevRange;
    this.playerJumpStartBottomY = this.stage.playerSpawn.y;

    this.enemies = this.stage.enemies.map((sp) => this.spawnEnemy(sp.kind, sp.x, sp.y, sp.dir));

    if (this.stage.boss) {
      const bs = this.stage.boss;
      const hpScale = this.difficulty === 'chill' ? 0.75 : 1;
      const maxHp = Math.max(6, Math.round(bs.maxHp * hpScale));
      this.boss = {
        kind: bs.kind,
        name: bs.name,
        x: bs.x - 34,
        y: bs.y - 84,
        w: 68,
        h: 84,
        vx: 0,
        vy: 0,
        dir: -1,
        hp: maxHp,
        maxHp,
        onGround: true,
        aiPhase: 'idle',
        phaseTimer: 1.2,
        hitFlashTimer: 0,
        squashX: 1,
        squashY: 1,
        minionTimer: 4.0,
      };
      soundEngine.bossWarning();
      soundEngine.setMusicTrack('boss');
    } else {
      this.boss = null;
      soundEngine.setMusicTrack('stage');
    }

    this.callbacks.onHudUpdate(this.buildHudSnapshot());
  }

  private spawnEnemy(kind: EnemyKind, x: number, bottomY: number, dir: 1 | -1): EnemyState {
    const isYeti = kind === 'yeti';
    const w = isYeti ? 32 : 26;
    const h = isYeti ? 38 : 32;
    return {
      id: this.nextId++,
      kind,
      x: x - w / 2,
      y: bottomY - h,
      w,
      h,
      vx: dir * (isYeti ? 78 : kind === 'zippy' ? 92 : 74),
      vy: 0,
      dir,
      onGround: false,
      snowLevel: 0,
      maxSnow: isYeti ? 5 : 4,
      meltTimer: 0,
      stateTimer: 1.2 + Math.random() * 1.6,
      aiPhase: 'patrol',
      windupDuration: 0.55,
      hitFlashTimer: 0,
      squashX: 1,
      squashY: 1,
      walkCycle: Math.random() * 10,
      isRolling: false,
      rollVx: 0,
      chainCount: 0,
      floorBounces: 0,
      rollAge: 0,
      ghostStunTimer: 0,
    };
  }

  private physicsAccumulator = 0;

  private startLoop(): void {
    if (this.running) return;
    this.running = true;
    this.lastTimestamp = performance.now();
    this.physicsAccumulator = 0;
    const FIXED_DT = 1 / 120;

    const tick = (now: number) => {
      if (!this.running) return;
      const rawDt = (now - this.lastTimestamp) / 1000;
      this.lastTimestamp = now;
      const clampedDt = Math.min(Math.max(rawDt, 0), 0.05);

      if (!this.paused) {
        this.physicsAccumulator += clampedDt;
        let steps = 0;
        while (this.physicsAccumulator >= FIXED_DT && steps < 6) {
          this.update(FIXED_DT);
          this.physicsAccumulator -= FIXED_DT;
          steps++;
        }
        if (steps >= 6) {
          this.physicsAccumulator = 0;
        }
      }
      this.render();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private update(dt: number): void {
    this.time += dt;

    // Update ambient snowflakes even during hitstop
    for (const flake of this.ambientFlakes) {
      flake.y += flake.speed * dt;
      flake.x += Math.sin(this.time * 0.9 + flake.drift) * 14 * dt;
      if (flake.y > PLAYFIELD_HEIGHT + 6) {
        flake.y = -6;
        flake.x = Math.random() * PLAYFIELD_WIDTH;
      }
    }

    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    }
    if (this.hurryUpBannerTimer > 0) {
      this.hurryUpBannerTimer = Math.max(0, this.hurryUpBannerTimer - dt);
    }
    if (this.floorBannerTimer > 0) {
      this.floorBannerTimer = Math.max(0, this.floorBannerTimer - dt);
    }
    if (this.floorClearBannerTimer > 0) {
      this.floorClearBannerTimer = Math.max(0, this.floorClearBannerTimer - dt);
    }

    // Tower climb transition between regular floors
    if (this.transitionTimer > 0) {
      this.transitionTimer = Math.max(0, this.transitionTimer - dt);
      if (!this.transitionSwapped && this.transitionTimer <= 0.25) {
        this.transitionSwapped = true;
        this.stageIndex++;
        this.loadStage(this.stageIndex, false);
      }
      this.updateParticles(dt);
      this.updateFloatingTexts(dt);
      return;
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      this.updateParticles(dt * 0.35);
      return;
    }

    if (!this.stageEnded) {
      this.stageTime += dt;
      const hurryThreshold = this.difficulty === 'chill' ? 75 : 55;
      if (!this.hurryUpSpawned && this.stageTime >= hurryThreshold && !this.boss) {
        this.hurryUpSpawned = true;
        this.hurryUpBannerTimer = 2.4;
        const spawnLeft = this.player.x > PLAYFIELD_WIDTH / 2;
        this.enemies.push(
          this.spawnEnemy('ghost', spawnLeft ? 48 : PLAYFIELD_WIDTH - 48, 120, spawnLeft ? 1 : -1)
        );
        soundEngine.bossWarning();
      }
    }

    this.updatePlayer(dt);
    this.updateSnowShots(dt);
    this.updateEnemies(dt);
    if (this.boss) {
      this.updateBoss(dt, this.boss);
    }
    this.updateEnemyProjectiles(dt);
    this.updatePickups(dt);
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);

    // Check stage completion (all non-ghost enemies cleared AND boss defeated)
    const activeMonsters = this.enemies.filter((e) => e.kind !== 'ghost');
    if (!this.stageEnded && activeMonsters.length === 0 && !this.boss) {
      this.stageEnded = true;
      this.enemies = [];
      this.enemyProjectiles = [];
      soundEngine.setMusicTrack('none');
      soundEngine.stageClear();

      const wasBossStage = Boolean(this.stage.boss);
      const isFinalStage = this.stageIndex >= STAGES.length - 1;

      if (!wasBossStage && !isFinalStage) {
        // Classic Snow Bros Bonus Rain when crushing 3+ enemies in a chain!
        this.bonusRainActive = this.maxChainThisStage >= 3;
        this.stageClearDelayTimer = 3.0;
        this.floorClearBannerTimer = 3.0;
        if (this.bonusRainActive) {
          this.spawnBonusRain();
        }
      } else {
        this.stageClearDelayTimer = 3.0;
        this.floorClearBannerTimer = 3.0;
      }
    }

    if (this.stageEnded) {
      this.stageClearDelayTimer -= dt;
      if (this.stageClearDelayTimer <= 0) {
        const hud = this.buildHudSnapshot();
        this.callbacks.onHudUpdate(hud);
        if (this.stageIndex >= STAGES.length - 1) {
          this.paused = true;
          this.callbacks.onVictory(hud);
          return;
        }
        if (this.stage.boss) {
          // Pause for celebratory Area Clear modal after every Boss Floor (10, 20, ..., 90)
          this.paused = true;
          this.callbacks.onStageClear(hud);
          return;
        }
        // Regular floor: seamless arcade tower climb straight into next floor!
        this.transitionTimer = 0.5;
        this.transitionSwapped = false;
        return;
      }
    }

    // Periodic HUD sync (~15Hz) so React doesn't re-render every frame unnecessarily
    this.hudSyncAccumulator += dt;
    if (this.hudSyncAccumulator >= 0.08) {
      this.hudSyncAccumulator = 0;
      this.callbacks.onHudUpdate(this.buildHudSnapshot());
    }

    // Reset edge-triggered inputs at end of frame
    this.justPressed.jump = false;
    this.justPressed.shoot = false;
  }

  private updatePlayer(dt: number): void {
    const p = this.player;

    // Timers
    if (p.invulnTimer > 0) p.invulnTimer = Math.max(0, p.invulnTimer - dt);
    if (p.spawnShieldTimer > 0) p.spawnShieldTimer = Math.max(0, p.spawnShieldTimer - dt);
    if (p.shootCooldown > 0) p.shootCooldown = Math.max(0, p.shootCooldown - dt);
    if (p.dropThroughTimer > 0) p.dropThroughTimer = Math.max(0, p.dropThroughTimer - dt);
    if (p.giantTimer > 0) p.giantTimer = Math.max(0, p.giantTimer - dt);

    // Relax squash & stretch
    p.squashX += (1 - p.squashX) * Math.min(1, dt * 14);
    p.squashY += (1 - p.squashY) * Math.min(1, dt * 14);

    // Coyote & Jump Buffer
    if (p.onGround) {
      p.coyoteTimer = 0.1;
    } else {
      p.coyoteTimer = Math.max(0, p.coyoteTimer - dt);
    }

    if (this.justPressed.jump) {
      p.jumpBufferTimer = 0.11;
    } else {
      p.jumpBufferTimer = Math.max(0, p.jumpBufferTimer - dt);
    }

    // Horizontal movement
    const speedMult = 1 + p.speedLevel * 0.22 + (p.giantTimer > 0 ? 0.18 : 0);
    const maxSpeed = BASE_MOVE_SPEED * speedMult;
    const moveDir = (this.held.right ? 1 : 0) - (this.held.left ? 1 : 0);

    if (moveDir !== 0) {
      p.facing = moveDir as 1 | -1;
      const accel = p.onGround ? 2650 : 1800;
      const targetVx = moveDir * maxSpeed;
      if (p.vx < targetVx) p.vx = Math.min(targetVx, p.vx + accel * dt);
      else if (p.vx > targetVx) p.vx = Math.max(targetVx, p.vx - accel * dt);
      p.walkCycle += dt * speedMult;
      if (p.speedLevel > 0 && p.onGround && Math.random() < 0.28) {
        this.spawnParticle(p.x + p.w / 2, p.y + p.h - 2, -moveDir * 40, -15, 2.5, '#fde047', 0.28);
      }
    } else {
      const friction = p.onGround ? 2250 : 720;
      if (p.vx > 0) p.vx = Math.max(0, p.vx - friction * dt);
      else if (p.vx < 0) p.vx = Math.min(0, p.vx + friction * dt);
    }

    // Jump or Drop-Through
    if (p.jumpBufferTimer > 0) {
      if (this.held.down && p.onGround && p.y + p.h < FLOOR_Y - 2) {
        // Drop down through one-way platform
        p.dropThroughTimer = 0.2;
        p.onGround = false;
        p.coyoteTimer = 0;
        p.jumpBufferTimer = 0;
        p.vy = 90;
        this.playerJumpStartBottomY = p.y + p.h;
      } else if (p.coyoteTimer > 0) {
        this.playerJumpStartBottomY = p.y + p.h;
        p.vy = JUMP_VELOCITY;
        p.onGround = false;
        p.coyoteTimer = 0;
        p.jumpBufferTimer = 0;
        p.squashX = 0.78;
        p.squashY = 1.26;
        soundEngine.jump();
        for (let i = 0; i < 5; i++) {
          this.spawnParticle(
            p.x + p.w / 2 + (Math.random() - 0.5) * 14,
            p.y + p.h,
            (Math.random() - 0.5) * 70,
            -20 - Math.random() * 40,
            3,
            '#e0f2fe',
            0.3
          );
        }
      }
    }

    // Gravity
    p.vy = Math.min(900, p.vy + GRAVITY * dt);

    // Move X & clamp to walls and solid wall pillars
    p.x += p.vx * dt;
    if (p.x < WALL_THICKNESS) {
      p.x = WALL_THICKNESS;
      p.vx = 0;
    } else if (p.x + p.w > PLAYFIELD_WIDTH - WALL_THICKNESS) {
      p.x = PLAYFIELD_WIDTH - WALL_THICKNESS - p.w;
      p.vx = 0;
    }
    for (const plat of this.stage.platforms) {
      if (!plat.isWall) continue;
      if (rectsOverlap(p.x, p.y + 4, p.w, p.h - 6, plat.x, plat.y + 4, plat.w, plat.h - 4)) {
        if (p.x + p.w / 2 < plat.x + plat.w / 2) {
          p.x = plat.x - p.w;
        } else {
          p.x = plat.x + plat.w;
        }
        p.vx = 0;
      }
    }

    // Move Y & one-way platform collision
    const prevBottom = p.y + p.h;
    p.y += p.vy * dt;
    const wasOnGround = p.onGround;
    p.onGround = false;

    if (p.vy >= 0) {
      for (const plat of this.stage.platforms) {
        if (!plat.isFloor && !plat.isWall && p.dropThroughTimer > 0) continue;
        if (p.x + p.w - 3 > plat.x && p.x + 3 < plat.x + plat.w) {
          if (prevBottom <= plat.y + 8 && p.y + p.h >= plat.y) {
            p.y = plat.y - p.h;
            if (!wasOnGround && p.vy > 220) {
              p.squashX = 1.24;
              p.squashY = 0.78;
              for (let dust = 0; dust < 4; dust++) {
                this.spawnParticle(
                  p.x + p.w / 2 + (Math.random() - 0.5) * 16,
                  p.y + p.h,
                  (Math.random() - 0.5) * 85,
                  -15 - Math.random() * 35,
                  2.6,
                  '#e0f2fe',
                  0.26
                );
              }
            }
            p.vy = 0;
            p.onGround = true;
            this.playerJumpStartBottomY = p.y + p.h;
            break;
          }
        }
      }
    } else {
      // Head bump against bottom of solid wall pillars
      for (const plat of this.stage.platforms) {
        if (!plat.isWall) continue;
        if (rectsOverlap(p.x + 2, p.y, p.w - 4, p.h, plat.x, plat.y, plat.w, plat.h)) {
          p.y = plat.y + plat.h;
          p.vy = 0;
          break;
        }
      }
    }

    // Shooting Snow OR Kicking adjacent Snowball
    const wantsShoot = this.justPressed.shoot || (this.held.shoot && p.shootCooldown <= 0);
    if (wantsShoot && p.shootCooldown <= 0) {
      const kicked = this.tryKickAdjacentSnowball();
      if (!kicked) {
        this.fireSnowShot();
      }
      p.shootCooldown = p.giantTimer > 0 ? 0.14 : 0.21;
    }
  }

  private tryKickAdjacentSnowball(): boolean {
    const p = this.player;
    const reachX = p.x + p.w / 2 + p.facing * 22;
    const reachY = p.y + p.h / 2;

    for (const e of this.enemies) {
      if (e.snowLevel >= e.maxSnow && !e.isRolling) {
        const ecx = e.x + e.w / 2;
        const ecy = e.y + e.h / 2;
        if (Math.abs(ecx - reachX) < 34 && Math.abs(ecy - reachY) < 32) {
          this.kickSnowball(e, p.facing, true);
          return true;
        }
      }
    }
    return false;
  }

  private kickSnowball(ball: EnemyState, dir: 1 | -1, splitCluster = false): void {
    const launchSingle = (target: EnemyState, launchDir: 1 | -1): void => {
      target.isRolling = true;
      target.rollVx = launchDir * ROLL_SPEED;
      target.dir = launchDir;
      target.chainCount = 0;
      target.floorBounces = 0;
      target.rollAge = 0;
      target.meltTimer = 0;

      for (let i = 0; i < 8; i++) {
        this.spawnParticle(
          target.x + target.w / 2,
          target.y + target.h - 4,
          -launchDir * (40 + Math.random() * 110),
          -30 - Math.random() * 80,
          3.5,
          '#bae6fd',
          0.35
        );
      }
    };

    this.player.pushTimer = 0;
    this.player.pushTargetId = null;
    soundEngine.kickSnowball();
    this.triggerShake(4, 0.14);

    if (splitCluster) {
      // Collect any stationary full snowballs touching or overlapping the kicked ball
      const cluster: EnemyState[] = [ball];
      let added = true;
      while (added) {
        added = false;
        for (const other of this.enemies) {
          if (
            other.kind === 'ghost' ||
            other.isRolling ||
            other.snowLevel < other.maxSnow ||
            cluster.includes(other)
          ) {
            continue;
          }
          const touchesCluster = cluster.some((c) =>
            rectsOverlap(c.x - 4, c.y - 4, c.w + 8, c.h + 8, other.x, other.y, other.w, other.h)
          );
          if (touchesCluster) {
            cluster.push(other);
            added = true;
          }
        }
      }

      if (cluster.length >= 2) {
        cluster.sort((a, b) => a.x - b.x);
        const mid = Math.floor(cluster.length / 2);
        const centerX =
          cluster.reduce((sum, item) => sum + item.x + item.w / 2, 0) / cluster.length;

        for (let idx = 0; idx < cluster.length; idx++) {
          const item = cluster[idx];
          let itemDir: 1 | -1;
          if (cluster.length % 2 === 1 && idx === mid) {
            itemDir = dir;
          } else {
            itemDir = idx < mid ? -1 : 1;
          }
          launchSingle(item, itemDir);
          // Nudge overlapping balls slightly apart along their launch direction
          const offset = itemDir * (6 + Math.abs(idx - mid) * 4);
          item.x = Math.max(
            WALL_THICKNESS,
            Math.min(PLAYFIELD_WIDTH - WALL_THICKNESS - item.w, item.x + offset)
          );
        }
        this.spawnSnowBurst(centerX, ball.y + ball.h / 2, 10);
        return;
      }
    }

    launchSingle(ball, dir);
  }

  private fireSnowShot(): void {
    const p = this.player;
    const isGiant = p.giantTimer > 0;
    const speed = 370 + p.rangeLevel * 85 + (isGiant ? 80 : 0);
    const maxLife = 0.42 + p.rangeLevel * 0.14 + (isGiant ? 0.15 : 0);
    const radius = isGiant ? 11 : 6 + p.powerLevel * 2.5;
    const power = isGiant ? 3 : 1 + p.powerLevel;

    this.snowShots.push({
      id: this.nextId++,
      x: p.x + p.w / 2 + p.facing * 14,
      y: p.y + p.h * 0.48,
      vx: p.facing * speed,
      vy: -35,
      radius,
      power,
      life: maxLife,
      maxLife,
      fromGiant: isGiant,
    });
    for (let k = 0; k < 3; k++) {
      this.spawnParticle(
        p.x + p.w / 2 + p.facing * 14,
        p.y + p.h * 0.46,
        p.facing * (55 + Math.random() * 60),
        (Math.random() - 0.5) * 55,
        2.2,
        '#e0f2fe',
        0.22
      );
    }
    soundEngine.throwSnow(isGiant);
  }

  private updateSnowShots(dt: number): void {
    for (let i = this.snowShots.length - 1; i >= 0; i--) {
      const s = this.snowShots[i];
      s.life -= dt;
      s.vy += 260 * dt; // subtle gravity arc
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      let remove = s.life <= 0;

      // Hit walls & solid stone pillars
      if (s.x - s.radius < WALL_THICKNESS || s.x + s.radius > PLAYFIELD_WIDTH - WALL_THICKNESS) {
        remove = true;
      }
      if (!remove) {
        for (const plat of this.stage.platforms) {
          if (!plat.isWall) continue;
          if (rectsOverlap(s.x - s.radius, s.y - s.radius, s.radius * 2, s.radius * 2, plat.x, plat.y, plat.w, plat.h)) {
            remove = true;
            break;
          }
        }
      }

      // Check collision with Boss (minor stagger / frost particles, bosses take real damage from rolling snowballs)
      if (!remove && this.boss) {
        const b = this.boss;
        if (rectsOverlap(s.x - s.radius, s.y - s.radius, s.radius * 2, s.radius * 2, b.x, b.y, b.w, b.h)) {
          remove = true;
          this.spawnSnowBurst(s.x, s.y, 4);
        }
      }

      // Check collision with Enemies
      if (!remove) {
        for (const e of this.enemies) {
          if (e.isRolling) continue;
          if (rectsOverlap(s.x - s.radius, s.y - s.radius, s.radius * 2, s.radius * 2, e.x, e.y, e.w, e.h)) {
            remove = true;
            if (e.kind === 'ghost') {
              e.ghostStunTimer = 1.1;
              e.vx = Math.sign(s.vx) * 140;
              this.spawnSnowBurst(s.x, s.y, 6);
              soundEngine.snowHit(1);
            } else if (e.snowLevel < e.maxSnow) {
              const prevLevel = e.snowLevel;
              e.snowLevel = Math.min(e.maxSnow, e.snowLevel + s.power);
              e.meltTimer = 0;
              e.hitFlashTimer = 0.08;
              e.squashX = 1.25;
              e.squashY = 0.8;
              this.spawnSnowBurst(s.x, s.y, 6);
              if (e.snowLevel >= e.maxSnow && prevLevel < e.maxSnow) {
                soundEngine.freezeFull();
                this.addScore(100, e.x + e.w / 2, e.y, '#7dd3fc', 0.9);
              } else {
                soundEngine.snowHit(e.snowLevel);
              }
            } else {
              // Hitting an already-full snowball nudges it slightly
              e.x += Math.sign(s.vx) * 4;
              this.spawnSnowBurst(s.x, s.y, 4);
            }
            break;
          }
        }
      }

      if (remove) {
        this.spawnSnowBurst(s.x, s.y, 3);
        this.snowShots.splice(i, 1);
      }
    }
  }

  private updateEnemies(dt: number): void {
    const p = this.player;
    let touchingAnySnowball = false;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e) continue;

      if (e.hitFlashTimer > 0) e.hitFlashTimer = Math.max(0, e.hitFlashTimer - dt);
      e.squashX += (1 - e.squashX) * Math.min(1, dt * 12);
      e.squashY += (1 - e.squashY) * Math.min(1, dt * 12);

      // Ghost AI (floats directly through platforms)
      if (e.kind === 'ghost') {
        if (e.ghostStunTimer > 0) {
          e.ghostStunTimer -= dt;
          e.x += e.vx * dt;
          e.vx *= 0.92;
        } else {
          const dx = p.x + p.w / 2 - (e.x + e.w / 2);
          const dy = p.y + p.h / 2 - (e.y + e.h / 2);
          const dist = Math.hypot(dx, dy) || 1;
          const ghostSpeed = this.difficulty === 'chill' ? 75 : 95;
          e.x += (dx / dist) * ghostSpeed * dt;
          e.y += (dy / dist) * ghostSpeed * dt;
          e.dir = dx >= 0 ? 1 : -1;
        }
        if (rectsOverlap(p.x + 4, p.y + 4, p.w - 8, p.h - 6, e.x + 3, e.y + 3, e.w - 6, e.h - 6)) {
          if (p.giantTimer > 0) {
            e.ghostStunTimer = 2.0;
          } else {
            this.damagePlayer();
          }
        }
        continue;
      }

      // 1. ROLLING SNOWBALL BEHAVIOR
      if (e.isRolling) {
        e.rollAge += dt;
        e.vy = Math.min(920, e.vy + GRAVITY * dt);
        e.x += e.rollVx * dt;

        // Bounce off walls & solid wall pillars
        if (e.x < WALL_THICKNESS) {
          e.x = WALL_THICKNESS;
          e.rollVx = Math.abs(e.rollVx);
          e.dir = 1;
          soundEngine.kickSnowball();
          if (e.y + e.h >= FLOOR_Y - 6) {
            e.floorBounces++;
          }
        } else if (e.x + e.w > PLAYFIELD_WIDTH - WALL_THICKNESS) {
          e.x = PLAYFIELD_WIDTH - WALL_THICKNESS - e.w;
          e.rollVx = -Math.abs(e.rollVx);
          e.dir = -1;
          soundEngine.kickSnowball();
          if (e.y + e.h >= FLOOR_Y - 6) {
            e.floorBounces++;
          }
        }
        for (const plat of this.stage.platforms) {
          if (!plat.isWall) continue;
          if (rectsOverlap(e.x, e.y + 4, e.w, e.h - 6, plat.x, plat.y + 4, plat.w, plat.h - 4)) {
            if (e.x + e.w / 2 < plat.x + plat.w / 2) {
              e.x = plat.x - e.w;
              e.rollVx = -Math.abs(e.rollVx);
              e.dir = -1;
            } else {
              e.x = plat.x + plat.w;
              e.rollVx = Math.abs(e.rollVx);
              e.dir = 1;
            }
            soundEngine.kickSnowball();
          }
        }

        // Platform landing for rolling snowball
        const prevBottom = e.y + e.h;
        e.y += e.vy * dt;
        e.onGround = false;
        if (e.vy >= 0) {
          for (const plat of this.stage.platforms) {
            if (e.x + e.w - 4 > plat.x && e.x + 4 < plat.x + plat.w) {
              if (prevBottom <= plat.y + 10 && e.y + e.h >= plat.y) {
                e.y = plat.y - e.h;
                e.vy = 0;
                e.onGround = true;
                break;
              }
            }
          }
        }

        // Authentic Snow Bros Snowball Ride! Touching your own rolling snowball gives safe hop/invuln ride
        if (rectsOverlap(p.x + 4, p.y + 4, p.w - 8, p.h - 4, e.x, e.y, e.w, e.h)) {
          p.spawnShieldTimer = Math.max(p.spawnShieldTimer, 0.35);
          if (this.justPressed.jump || this.held.up) {
            this.playerJumpStartBottomY = p.y + p.h;
            p.vy = JUMP_VELOCITY * 1.04;
            p.onGround = false;
            soundEngine.jump();
          } else {
            p.x = Math.max(
              WALL_THICKNESS,
              Math.min(PLAYFIELD_WIDTH - WALL_THICKNESS - p.w, e.x + e.w / 2 - p.w / 2)
            );
            p.y = e.y - p.h + 6;
            p.vy = Math.min(p.vy, 0);
          }
        }

        // Snow trail particles
        if (Math.random() < 0.45) {
          this.spawnParticle(
            e.x + e.w / 2,
            e.y + e.h - 3,
            -Math.sign(e.rollVx) * (30 + Math.random() * 50),
            -20 - Math.random() * 40,
            3,
            '#e0f2fe',
            0.3
          );
        }

        // Crush non-rolling enemies & split/bounce when hitting other snowballs!
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          if (i === j) continue;
          const other = this.enemies[j];
          if (!other || other.kind === 'ghost') continue;
          if (rectsOverlap(e.x - 4, e.y - 4, e.w + 8, e.h + 8, other.x, other.y, other.w, other.h)) {
            if (other.snowLevel >= other.maxSnow && !other.isRolling) {
              // Hit a stationary full snowball -> send one forward and rebound the other in the opposite direction!
              const origDir: 1 | -1 = e.rollVx >= 0 ? 1 : -1;
              this.kickSnowball(other, origDir, false);
              e.rollVx = -origDir * ROLL_SPEED;
              e.dir = (-origDir) as 1 | -1;

              if (origDir === 1) {
                other.x = Math.min(PLAYFIELD_WIDTH - WALL_THICKNESS - other.w, e.x + e.w + 6);
                e.x = Math.max(WALL_THICKNESS, other.x - e.w - 6);
              } else {
                other.x = Math.max(WALL_THICKNESS, e.x - other.w - 6);
                e.x = Math.min(PLAYFIELD_WIDTH - WALL_THICKNESS - e.w, other.x + other.w + 6);
              }

              const midX = (e.x + e.w / 2 + other.x + other.w / 2) / 2;
              const midY = (e.y + e.h / 2 + other.y + other.h / 2) / 2;
              this.spawnSnowBurst(midX, midY, 8);
            } else if (other.isRolling) {
              // Two rolling snowballs colliding -> bounce them cleanly in both directions!
              const eCx = e.x + e.w / 2;
              const oCx = other.x + other.w / 2;
              const closingIn =
                (eCx <= oCx && e.rollVx > other.rollVx) ||
                (eCx > oCx && e.rollVx < other.rollVx);
              if (closingIn) {
                const leftBall = eCx <= oCx ? e : other;
                const rightBall = eCx <= oCx ? other : e;
                leftBall.rollVx = -ROLL_SPEED;
                leftBall.dir = -1;
                rightBall.rollVx = ROLL_SPEED;
                rightBall.dir = 1;

                const midX = (leftBall.x + leftBall.w / 2 + rightBall.x + rightBall.w / 2) / 2;
                leftBall.x = Math.max(WALL_THICKNESS, midX - leftBall.w - 4);
                rightBall.x = Math.max(
                  leftBall.x + leftBall.w + 6,
                  Math.min(PLAYFIELD_WIDTH - WALL_THICKNESS - rightBall.w, midX + 4)
                );
                if (rightBall.x - leftBall.w - 6 < leftBall.x) {
                  leftBall.x = Math.max(WALL_THICKNESS, rightBall.x - leftBall.w - 6);
                }

                soundEngine.kickSnowball();
                this.triggerShake(3.5, 0.12);
                this.spawnSnowBurst(midX, (e.y + other.y) / 2 + e.h / 2, 8);
              }
            } else {
              // Crush enemy!
              e.chainCount++;
              this.maxChainThisStage = Math.max(this.maxChainThisStage, e.chainCount);
              this.comboBest = Math.max(this.comboBest, e.chainCount);
              this.enemiesCrushedTotal++;
              const pts = 500 * Math.pow(2, Math.min(4, e.chainCount - 1));
              this.addScore(
                pts,
                other.x + other.w / 2,
                other.y,
                e.chainCount >= 2 ? '#fde047' : '#ffffff',
                e.chainCount >= 2 ? 1.2 : 1.0
              );
              soundEngine.crushEnemy(e.chainCount);
              this.hitstopTimer = Math.max(this.hitstopTimer, 0.042);
              this.triggerShake(4 + e.chainCount, 0.15);
              this.spawnEnemyDefeatBurst(other.x + other.w / 2, other.y + other.h / 2, other.kind);
              this.maybeSpawnDrop(other.x + other.w / 2, other.y + other.h / 2, e.chainCount);
              this.enemies.splice(j, 1);
              if (j < i) i--;
            }
          }
        }

        // Hit Boss!
        if (this.boss && rectsOverlap(e.x - 4, e.y - 4, e.w + 8, e.h + 8, this.boss.x, this.boss.y, this.boss.w, this.boss.h)) {
          this.damageBoss(2, e.x + e.w / 2, e.y + e.h / 2);
          this.shatterSnowball(e, i);
          continue;
        }

        // Shatter snowball after bouncing on the bottom floor twice (or rolling long enough)
        if (e.floorBounces >= 2 || e.rollAge > 7.5) {
          this.shatterSnowball(e, i);
          continue;
        }
        continue;
      }

      // 2. STATIONARY FULL SNOWBALL (awaiting push/kick or melting)
      if (e.snowLevel >= e.maxSnow) {
        e.meltTimer += dt;
        // Apply gravity in case platform underneath ends
        e.vy = Math.min(900, e.vy + GRAVITY * dt);
        const prevBottom = e.y + e.h;
        e.y += e.vy * dt;
        e.onGround = false;
        if (e.vy >= 0) {
          for (const plat of this.stage.platforms) {
            if (e.x + e.w - 3 > plat.x && e.x + 3 < plat.x + plat.w) {
              if (prevBottom <= plat.y + 8 && e.y + e.h >= plat.y) {
                e.y = plat.y - e.h;
                e.vy = 0;
                e.onGround = true;
                break;
              }
            }
          }
        }

        // Player pushing against full snowball -> kick after brief 75ms push!
        if (rectsOverlap(p.x, p.y, p.w, p.h, e.x - 2, e.y, e.w + 4, e.h)) {
          touchingAnySnowball = true;
          const pushDir: 1 | -1 = p.x + p.w / 2 < e.x + e.w / 2 ? 1 : -1;
          const movingInto =
            (pushDir === 1 && this.held.right) || (pushDir === -1 && this.held.left);
          if (movingInto) {
            if (p.pushTargetId !== e.id) {
              p.pushTargetId = e.id;
              p.pushTimer = 0;
            }
            p.pushTimer += dt;
            e.x = Math.max(
              WALL_THICKNESS,
              Math.min(PLAYFIELD_WIDTH - WALL_THICKNESS - e.w, e.x + pushDir * 60 * dt)
            );
            if (p.pushTimer >= 0.08) {
              this.kickSnowball(e, pushDir, true);
              continue;
            }
          }
        }

        // Melt back to snowLevel 3 after 6s if untouched
        if (e.meltTimer >= 6.0) {
          e.snowLevel = e.maxSnow - 1;
          e.meltTimer = 0;
        }
        continue;
      }

      // 3. ACTIVE OR PARTIALLY SNOWED MONSTER
      if (e.snowLevel > 0) {
        e.meltTimer += dt;
        if (e.meltTimer >= 2.2) {
          e.snowLevel = Math.max(0, e.snowLevel - 1);
          e.meltTimer = 0;
        }
      }

      const slowFactor = e.snowLevel > 0 ? Math.max(0.22, 1 - e.snowLevel * 0.25) : 1;
      const stageScale = 1 + Math.min(0.28, this.stageIndex * 0.0028);
      const diffSpeed = (this.difficulty === 'chill' ? 0.85 : 1) * stageScale;

      if (e.snowLevel === 0) {
        this.runEnemyAI(e, dt, diffSpeed);
      } else {
        e.vx = e.dir * 38 * slowFactor;
      }

      // Physics for enemy
      e.vy = Math.min(900, e.vy + GRAVITY * dt);
      e.x += e.vx * dt * (e.snowLevel > 0 ? slowFactor : 1);
      e.walkCycle += dt * slowFactor;

      if (e.x < WALL_THICKNESS) {
        e.x = WALL_THICKNESS;
        e.dir = 1;
        e.vx = Math.abs(e.vx);
      } else if (e.x + e.w > PLAYFIELD_WIDTH - WALL_THICKNESS) {
        e.x = PLAYFIELD_WIDTH - WALL_THICKNESS - e.w;
        e.dir = -1;
        e.vx = -Math.abs(e.vx);
      }
      for (const plat of this.stage.platforms) {
        if (!plat.isWall) continue;
        if (rectsOverlap(e.x, e.y + 4, e.w, e.h - 6, plat.x, plat.y + 4, plat.w, plat.h - 4)) {
          if (e.x + e.w / 2 < plat.x + plat.w / 2) {
            e.x = plat.x - e.w;
            e.dir = -1;
            e.vx = -Math.abs(e.vx);
          } else {
            e.x = plat.x + plat.w;
            e.dir = 1;
            e.vx = Math.abs(e.vx);
          }
        }
      }

      const prevBottom = e.y + e.h;
      e.y += e.vy * dt;
      e.onGround = false;
      let currentPlat: Platform | null = null;
      if (e.vy >= 0) {
        for (const plat of this.stage.platforms) {
          if (e.x + e.w - 3 > plat.x && e.x + 3 < plat.x + plat.w) {
            if (prevBottom <= plat.y + 8 && e.y + e.h >= plat.y) {
              e.y = plat.y - e.h;
              e.vy = 0;
              e.onGround = true;
              currentPlat = plat;
              break;
            }
          }
        }
      }

      // Keep monsters from blindly walking off narrow ledges if player isn't below
      if (e.onGround && currentPlat && !currentPlat.isFloor && e.snowLevel === 0) {
        const nearLeft = e.x <= currentPlat.x + 2;
        const nearRight = e.x + e.w >= currentPlat.x + currentPlat.w - 2;
        if (nearLeft && e.dir === -1) {
          if (p.y <= e.y + 10 || Math.random() < 0.72) {
            e.dir = 1;
            e.vx = Math.abs(e.vx);
          }
        } else if (nearRight && e.dir === 1) {
          if (p.y <= e.y + 10 || Math.random() < 0.72) {
            e.dir = -1;
            e.vx = -Math.abs(e.vx);
          }
        }
      }

      // Check Player vs Monster collision
      if (rectsOverlap(p.x + 4, p.y + 4, p.w - 8, p.h - 6, e.x + 3, e.y + 3, e.w - 6, e.h - 6)) {
        if (p.giantTimer > 0) {
          // Frost Giant crushes enemies on contact!
          this.enemiesCrushedTotal++;
          this.addScore(1000, e.x + e.w / 2, e.y, '#67e8f9', 1.15);
          soundEngine.crushEnemy(2);
          this.hitstopTimer = 0.035;
          this.triggerShake(5, 0.14);
          this.spawnEnemyDefeatBurst(e.x + e.w / 2, e.y + e.h / 2, e.kind);
          this.maybeSpawnDrop(e.x + e.w / 2, e.y + e.h / 2, 1);
          this.enemies.splice(i, 1);
          continue;
        } else if (e.snowLevel === 0) {
          // Do not kill player when jumping up from a lower tier and touching an enemy on an upper slot from underneath
          const jumpingFromBelow = !p.onGround && this.playerJumpStartBottomY > e.y + e.h + 10;
          const underneathEnemy = p.y + p.h > e.y + e.h + 4;
          const risingPastEnemy = p.vy < 0 && p.y + p.h > e.y + 6;
          if (!jumpingFromBelow && !underneathEnemy && !risingPastEnemy) {
            this.damagePlayer();
          }
        }
      }
    }

    if (!touchingAnySnowball) {
      p.pushTimer = 0;
      p.pushTargetId = null;
    }
  }

  private runEnemyAI(e: EnemyState, dt: number, diffSpeed: number): void {
    const p = this.player;
    e.stateTimer -= dt;

    if (e.kind === 'gobbo') {
      const baseSpeed = 82 * diffSpeed;
      e.vx = e.dir * baseSpeed;
      if (e.stateTimer <= 0 && e.onGround) {
        e.stateTimer = 1.6 + Math.random() * 1.8;
        // Occasionally hop up toward player if player is above
        if (p.y < e.y - 30 && Math.random() < 0.55) {
          e.vy = -510;
          e.onGround = false;
          e.squashX = 0.82;
          e.squashY = 1.22;
        } else if (Math.random() < 0.35) {
          e.dir = p.x < e.x ? -1 : 1;
        }
      }
    } else if (e.kind === 'zippy') {
      if (e.aiPhase === 'jump_crouch') {
        e.vx = 0;
        if (e.stateTimer <= 0) {
          e.aiPhase = 'patrol';
          e.stateTimer = 1.4 + Math.random() * 1.2;
          e.dir = p.x < e.x ? -1 : 1;
          e.vy = -560;
          e.vx = e.dir * 135 * diffSpeed;
          e.onGround = false;
          e.squashX = 0.75;
          e.squashY = 1.3;
        }
      } else {
        e.vx = e.dir * 102 * diffSpeed;
        if (e.stateTimer <= 0 && e.onGround) {
          e.aiPhase = 'jump_crouch';
          e.stateTimer = 0.36; // clear crouch windup telegraph!
        }
      }
    } else if (e.kind === 'spitfire') {
      if (e.aiPhase === 'windup') {
        e.vx = 0;
        if (e.stateTimer <= 0) {
          e.aiPhase = 'patrol';
          e.stateTimer = 2.4 + Math.random() * 1.6;
          // Fire horizontal fireball
          this.enemyProjectiles.push({
            id: this.nextId++,
            x: e.x + e.w / 2 + e.dir * 12,
            y: e.y + e.h * 0.45,
            vx: e.dir * (this.difficulty === 'chill' ? 190 : 235),
            vy: 0,
            radius: 6.5,
            life: 1.5,
            color: '#f97316',
            kind: 'fire',
          });
        }
      } else {
        e.vx = e.dir * 68 * diffSpeed;
        const sameTier = Math.abs(p.y + p.h - (e.y + e.h)) < 48;
        if (e.stateTimer <= 0 && e.onGround && (sameTier || Math.random() < 0.45)) {
          e.dir = p.x < e.x ? -1 : 1;
          e.aiPhase = 'windup';
          e.stateTimer = 0.55; // puff cheeks windup!
        }
      }
    } else if (e.kind === 'yeti') {
      const sameTier = Math.abs(p.y + p.h - (e.y + e.h)) < 36;
      if (sameTier && e.onGround) {
        e.dir = p.x < e.x ? -1 : 1;
        e.vx = e.dir * 132 * diffSpeed;
      } else {
        e.vx = e.dir * 76 * diffSpeed;
      }
      if (e.stateTimer <= 0 && e.onGround) {
        e.stateTimer = 1.8 + Math.random() * 1.4;
        if (p.y < e.y - 40 && Math.random() < 0.5) {
          e.vy = -525;
          e.onGround = false;
        }
      }
    }
  }

  private spawnBonusRain(): void {
    const xs = [130, 265, 400, 535, 670];
    for (let k = 0; k < xs.length; k++) {
      this.pickups.push({
        id: this.nextId++,
        kind: k % 2 === 0 ? 'crown' : 'gem',
        x: xs[k] - 12,
        y: 36 + (k % 2) * 26,
        vx: (Math.random() - 0.5) * 40,
        vy: 30 + k * 14,
        w: 24,
        h: 24,
        onGround: false,
        life: 7.0,
        bobOffset: k * 0.9,
      });
    }
  }

  private shatterSnowball(ball: EnemyState, index: number): void {
    this.enemiesCrushedTotal++;
    this.maxChainThisStage = Math.max(this.maxChainThisStage, ball.chainCount);
    const bonusPts = ball.chainCount > 0 ? 500 * ball.chainCount : 300;
    this.addScore(bonusPts, ball.x + ball.w / 2, ball.y, '#bae6fd', 1.0);
    if (ball.chainCount >= 3) {
      this.addScore(3000, PLAYFIELD_WIDTH / 2, 160, '#fde047', 1.35);
      this.spawnFloatingText(PLAYFIELD_WIDTH / 2, 130, 'MEGA SWEEP!', '#fbbf24', 1.3);
      for (let b = 0; b < 2; b++) {
        this.pickups.push({
          id: this.nextId++,
          kind: b === 0 ? 'gem' : 'crown',
          x: 240 + b * 320,
          y: 80,
          vx: (b === 0 ? 1 : -1) * 60,
          vy: -80,
          w: 24,
          h: 24,
          onGround: false,
          life: 11,
          bobOffset: b * 1.5,
        });
      }
    }
    soundEngine.snowballShatter();
    this.spawnEnemyDefeatBurst(ball.x + ball.w / 2, ball.y + ball.h / 2, ball.kind);
    this.maybeSpawnDrop(ball.x + ball.w / 2, ball.y + ball.h / 2, Math.max(1, ball.chainCount));
    this.enemies.splice(index, 1);
  }

  private updateBoss(dt: number, b: BossState): void {
    const p = this.player;
    if (b.hitFlashTimer > 0) b.hitFlashTimer = Math.max(0, b.hitFlashTimer - dt);
    b.squashX += (1 - b.squashX) * Math.min(1, dt * 10);
    b.squashY += (1 - b.squashY) * Math.min(1, dt * 10);

    // Spawn helper minions periodically so the player always has ammo to freeze & bowl into the boss!
    b.minionTimer -= dt;
    const activeMinions = this.enemies.filter((e) => e.kind !== 'ghost').length;
    if (b.minionTimer <= 0) {
      b.minionTimer = activeMinions < 2 ? 3.2 : 5.5;
      if (activeMinions < 4) {
        const spawnX = Math.random() < 0.5 ? 120 : PLAYFIELD_WIDTH - 120;
        const kind: EnemyKind =
          b.kind === 'emperor_blizzor' && Math.random() < 0.35 ? 'zippy' : 'gobbo';
        this.enemies.push(this.spawnEnemy(kind, spawnX, 296, spawnX < 400 ? 1 : -1));
        this.spawnSnowBurst(spawnX, 276, 8);
      }
    }

    b.phaseTimer -= dt;
    const isBlizzor = b.kind === 'emperor_blizzor';
    const isIceBoss = isBlizzor || b.kind === 'frost_warden';
    const isMagma = b.kind === 'baron_magma';

    if (b.aiPhase === 'idle') {
      b.dir = p.x < b.x + b.w / 2 ? -1 : 1;
      b.vx = b.dir * (isBlizzor ? 82 : isMagma ? 76 : isIceBoss ? 70 : 60);
      if (b.phaseTimer <= 0) {
        if (Math.random() < 0.5) {
          b.aiPhase = 'windup_jump';
          b.phaseTimer = isBlizzor ? 0.48 : 0.55;
          b.vx = 0;
        } else {
          b.aiPhase = 'windup_breath';
          b.phaseTimer = isBlizzor ? 0.55 : 0.65;
          b.vx = 0;
        }
      }
    } else if (b.aiPhase === 'windup_jump') {
      b.vx = 0;
      b.squashX = 1.18;
      b.squashY = 0.84;
      if (b.phaseTimer <= 0) {
        b.aiPhase = 'jumping';
        b.dir = p.x < b.x + b.w / 2 ? -1 : 1;
        b.vy = isBlizzor ? -670 : -640;
        b.vx = b.dir * (isMagma ? 235 : 210);
        b.onGround = false;
        b.phaseTimer = 1.6;
        b.squashX = 0.82;
        b.squashY = 1.2;
      }
    } else if (b.aiPhase === 'jumping') {
      if (b.onGround && b.vy >= 0) {
        b.aiPhase = 'idle';
        b.phaseTimer = isBlizzor ? 1.05 : 1.25;
        b.vx = 0;
        b.squashX = 1.25;
        b.squashY = 0.78;
        this.triggerShake(5, 0.16);
      }
    } else if (b.aiPhase === 'windup_breath') {
      b.dir = p.x < b.x + b.w / 2 ? -1 : 1;
      b.vx = 0;
      if (b.phaseTimer <= 0) {
        b.aiPhase = 'breathing';
        b.phaseTimer = 0.45;
        const volleyCount = isBlizzor ? 4 : isMagma ? 3 : 2;
        for (let k = 0; k < volleyCount; k++) {
          const angleOffset = (k - (volleyCount - 1) / 2) * 0.24;
          const speed = isBlizzor ? 265 : isMagma ? 245 : 220;
          this.enemyProjectiles.push({
            id: this.nextId++,
            x: b.x + b.w / 2 + b.dir * 26,
            y: b.y + b.h * 0.45,
            vx: b.dir * Math.cos(angleOffset) * speed,
            vy: Math.sin(angleOffset) * speed - 35,
            radius: 8,
            life: 2.2,
            color: isIceBoss ? '#22d3ee' : '#f97316',
            kind: isIceBoss ? 'ice' : 'fire',
          });
        }
      }
    } else if (b.aiPhase === 'breathing') {
      if (b.phaseTimer <= 0) {
        b.aiPhase = 'idle';
        b.phaseTimer = isBlizzor ? 1.15 : 1.4;
      }
    }

    // Physics
    b.vy = Math.min(900, b.vy + GRAVITY * dt);
    b.x += b.vx * dt;
    if (b.x < WALL_THICKNESS) {
      b.x = WALL_THICKNESS;
      b.vx = Math.abs(b.vx);
      b.dir = 1;
    } else if (b.x + b.w > PLAYFIELD_WIDTH - WALL_THICKNESS) {
      b.x = PLAYFIELD_WIDTH - WALL_THICKNESS - b.w;
      b.vx = -Math.abs(b.vx);
      b.dir = -1;
    }

    const prevBottom = b.y + b.h;
    b.y += b.vy * dt;
    b.onGround = false;
    if (b.vy >= 0) {
      for (const plat of this.stage.platforms) {
        if (!plat.isFloor && b.aiPhase === 'jumping' && b.y + b.h < FLOOR_Y - 120) continue;
        if (b.x + b.w - 6 > plat.x && b.x + 6 < plat.x + plat.w) {
          if (prevBottom <= plat.y + 12 && b.y + b.h >= plat.y) {
            b.y = plat.y - b.h;
            b.vy = 0;
            b.onGround = true;
            break;
          }
        }
      }
    }

    // Player contact with Boss
    if (rectsOverlap(p.x + 5, p.y + 5, p.w - 10, p.h - 8, b.x + 8, b.y + 8, b.w - 16, b.h - 10)) {
      if (p.giantTimer > 0) {
        this.damageBoss(1, b.x + b.w / 2, b.y + b.h / 2);
        p.vy = -340;
        p.vx = -p.facing * 200;
      } else {
        const jumpingFromBelow = !p.onGround && this.playerJumpStartBottomY > b.y + b.h + 10;
        const underneathBoss = p.y + p.h > b.y + b.h + 4;
        if (!jumpingFromBelow && !underneathBoss) {
          this.damagePlayer();
        }
      }
    }
  }

  private damageBoss(amount: number, hitX: number, hitY: number): void {
    if (!this.boss) return;
    this.boss.hp = Math.max(0, this.boss.hp - amount);
    this.boss.hitFlashTimer = 0.16;
    this.boss.squashX = 1.24;
    this.boss.squashY = 0.8;
    soundEngine.bossHit();
    this.hitstopTimer = 0.055;
    this.triggerShake(8, 0.22);
    this.spawnSnowBurst(hitX, hitY, 14);
    this.addScore(1500, hitX, hitY - 20, '#fde047', 1.2);

    if (this.boss.hp <= 0) {
      this.addScore(10000, this.boss.x + this.boss.w / 2, this.boss.y, '#fbbf24', 1.4);
      this.spawnEnemyDefeatBurst(this.boss.x + this.boss.w / 2, this.boss.y + this.boss.h / 2, 'yeti');
      this.triggerShake(12, 0.35);
      this.boss = null;
      // Clear remaining minions triumphantly
      for (const m of this.enemies) {
        this.spawnEnemyDefeatBurst(m.x + m.w / 2, m.y + m.h / 2, m.kind);
      }
      this.enemies = [];
    }
  }

  private updateEnemyProjectiles(dt: number): void {
    const p = this.player;
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const proj = this.enemyProjectiles[i];
      proj.life -= dt;
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;

      let remove = proj.life <= 0;
      if (proj.x < WALL_THICKNESS || proj.x > PLAYFIELD_WIDTH - WALL_THICKNESS) {
        remove = true;
      }

      if (
        !remove &&
        rectsOverlap(
          p.x + 4,
          p.y + 4,
          p.w - 8,
          p.h - 6,
          proj.x - proj.radius,
          proj.y - proj.radius,
          proj.radius * 2,
          proj.radius * 2
        )
      ) {
        remove = true;
        if (p.giantTimer <= 0) {
          this.damagePlayer();
        }
      }

      if (remove) {
        this.enemyProjectiles.splice(i, 1);
      }
    }
  }

  private maybeSpawnDrop(x: number, y: number, chainCount: number): void {
    const roll = Math.random();
    let kind: PickupKind | null = null;

    if (chainCount >= 3 || roll < 0.24) {
      const pRoll = Math.random();
      if (pRoll < 0.32) kind = 'potion_red';
      else if (pRoll < 0.64) kind = 'potion_blue';
      else if (pRoll < 0.9) kind = 'potion_yellow';
      else kind = 'potion_green';
    } else if (roll < 0.72) {
      if (chainCount >= 2) kind = Math.random() < 0.5 ? 'gem' : 'crown';
      else kind = Math.random() < 0.6 ? 'sushi' : 'cake';
    }

    if (!kind) return;

    this.pickups.push({
      id: this.nextId++,
      kind,
      x: Math.max(WALL_THICKNESS + 10, Math.min(PLAYFIELD_WIDTH - WALL_THICKNESS - 34, x - 12)),
      y: y - 16,
      vx: (Math.random() - 0.5) * 70,
      vy: -210,
      w: 24,
      h: 24,
      onGround: false,
      life: 10.5,
      bobOffset: Math.random() * Math.PI * 2,
    });
  }

  private updatePickups(dt: number): void {
    const p = this.player;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const item = this.pickups[i];
      item.life -= dt;
      if (item.life <= 0) {
        this.pickups.splice(i, 1);
        continue;
      }

      item.vy = Math.min(820, item.vy + GRAVITY * dt);
      item.x += item.vx * dt;
      if (item.onGround) item.vx *= 0.85;

      if (item.x < WALL_THICKNESS + 2) {
        item.x = WALL_THICKNESS + 2;
        item.vx = Math.abs(item.vx);
      } else if (item.x + item.w > PLAYFIELD_WIDTH - WALL_THICKNESS - 2) {
        item.x = PLAYFIELD_WIDTH - WALL_THICKNESS - 2 - item.w;
        item.vx = -Math.abs(item.vx);
      }

      const prevBottom = item.y + item.h;
      item.y += item.vy * dt;
      item.onGround = false;
      if (item.vy >= 0) {
        for (const plat of this.stage.platforms) {
          if (item.x + item.w > plat.x && item.x < plat.x + plat.w) {
            if (prevBottom <= plat.y + 8 && item.y + item.h >= plat.y) {
              item.y = plat.y - item.h;
              item.vy = 0;
              item.onGround = true;
              break;
            }
          }
        }
      }

      if (rectsOverlap(p.x, p.y, p.w, p.h, item.x, item.y, item.w, item.h)) {
        this.collectPickup(item);
        this.pickups.splice(i, 1);
      }
    }
  }

  private collectPickup(item: PickupItem): void {
    const p = this.player;
    const cx = item.x + item.w / 2;
    const cy = item.y;

    switch (item.kind) {
      case 'potion_red':
        p.speedLevel = Math.min(3, p.speedLevel + 1);
        this.addScore(1000, cx, cy, '#fca5a5', 1.05);
        this.spawnFloatingText(cx, cy - 16, 'SPEED UP!', '#f87171', 1.05);
        soundEngine.pickupPotion();
        break;
      case 'potion_blue':
        p.powerLevel = Math.min(3, p.powerLevel + 1);
        this.addScore(1000, cx, cy, '#7dd3fc', 1.05);
        this.spawnFloatingText(cx, cy - 16, 'POWER UP!', '#38bdf8', 1.05);
        soundEngine.pickupPotion();
        break;
      case 'potion_yellow':
        p.rangeLevel = Math.min(3, p.rangeLevel + 1);
        this.addScore(1000, cx, cy, '#fde047', 1.05);
        this.spawnFloatingText(cx, cy - 16, 'RANGE UP!', '#facc15', 1.05);
        soundEngine.pickupPotion();
        break;
      case 'potion_green':
        p.giantTimer = 7.5;
        this.addScore(2000, cx, cy, '#86efac', 1.15);
        this.spawnFloatingText(cx, cy - 18, 'FROST GIANT!', '#4ade80', 1.2);
        soundEngine.pickupPotion();
        break;
      case 'sushi':
        this.addScore(500, cx, cy, '#f8fafc', 0.95);
        soundEngine.pickupTreasure();
        break;
      case 'cake':
        this.addScore(1000, cx, cy, '#f9a8d4', 1.0);
        soundEngine.pickupTreasure();
        break;
      case 'gem':
        this.addScore(2000, cx, cy, '#38bdf8', 1.1);
        soundEngine.pickupTreasure();
        break;
      case 'crown':
        this.addScore(5000, cx, cy, '#fbbf24', 1.25);
        soundEngine.pickupTreasure();
        break;
    }

    for (let k = 0; k < 8; k++) {
      this.spawnParticle(
        cx,
        cy + 8,
        (Math.random() - 0.5) * 140,
        -40 - Math.random() * 100,
        3,
        '#fde047',
        0.4,
        'spark'
      );
    }
  }

  private damagePlayer(): void {
    const p = this.player;
    if (p.invulnTimer > 0 || p.spawnShieldTimer > 0 || p.giantTimer > 0 || this.stageEnded) {
      return;
    }

    this.lives--;
    soundEngine.playerHurt();
    this.hitstopTimer = 0.06;
    this.triggerShake(9, 0.28);

    for (let i = 0; i < 14; i++) {
      this.spawnParticle(
        p.x + p.w / 2,
        p.y + p.h / 2,
        (Math.random() - 0.5) * 220,
        -80 - Math.random() * 160,
        4,
        '#bae6fd',
        0.5
      );
    }

    if (this.lives <= 0) {
      this.paused = true;
      soundEngine.setMusicTrack('none');
      soundEngine.gameOver();
      const hud = this.buildHudSnapshot();
      this.callbacks.onHudUpdate(hud);
      this.callbacks.onGameOver(hud);
      return;
    }

    // Respawn safely at stage start with temporary shield
    const sp = this.stage.playerSpawn;
    p.x = sp.x - p.w / 2;
    p.y = sp.y - p.h;
    p.vx = 0;
    p.vy = 0;
    this.playerJumpStartBottomY = sp.y;
    p.invulnTimer = 1.6;
    p.spawnShieldTimer = 2.0;
    // Classic arcade touch: lose 1 level of potion boost on death, or keep if Chill
    if (this.difficulty === 'arcade') {
      p.speedLevel = Math.max(0, p.speedLevel - 1);
      p.powerLevel = Math.max(0, p.powerLevel - 1);
      p.rangeLevel = Math.max(0, p.rangeLevel - 1);
    }
    this.callbacks.onHudUpdate(this.buildHudSnapshot());
  }

  private addScore(points: number, x: number, y: number, color: string, scale: number): void {
    this.score += points;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      saveHighScore(this.highScore);
    }
    if (this.score >= this.nextExtraLifeScore) {
      this.lives++;
      this.nextExtraLifeScore += 50000;
      this.spawnFloatingText(PLAYFIELD_WIDTH / 2, 140, '1UP! EXTRA LIFE', '#4ade80', 1.3);
      soundEngine.pickupPotion();
    }
    this.spawnFloatingText(x, y, `+${points}`, color, scale);
  }

  private spawnFloatingText(x: number, y: number, text: string, color: string, scale: number): void {
    this.floatingTexts.push({
      x,
      y,
      vy: -42,
      text,
      color,
      life: 0.95,
      maxLife: 0.95,
      scale,
    });
  }

  private spawnSnowBurst(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      this.spawnParticle(
        x,
        y,
        (Math.random() - 0.5) * 180,
        -40 - Math.random() * 130,
        2.5 + Math.random() * 2.5,
        '#f0f9ff',
        0.35 + Math.random() * 0.2
      );
    }
  }

  private spawnEnemyDefeatBurst(x: number, y: number, kind: EnemyKind): void {
    const color =
      kind === 'gobbo'
        ? '#f87171'
        : kind === 'spitfire'
          ? '#c084fc'
          : kind === 'zippy'
            ? '#4ade80'
            : '#60a5fa';
    for (let i = 0; i < 12; i++) {
      this.spawnParticle(
        x,
        y,
        (Math.random() - 0.5) * 240,
        -80 - Math.random() * 170,
        3.5 + Math.random() * 2.5,
        i % 2 === 0 ? '#ffffff' : color,
        0.48 + Math.random() * 0.2,
        i % 3 === 0 ? 'spark' : 'circle'
      );
    }
  }

  private spawnParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    size: number,
    color: string,
    maxLife: number,
    shape: Particle['shape'] = 'circle'
  ): void {
    if (this.particles.length > 220) {
      this.particles.shift();
    }
    this.particles.push({
      x,
      y,
      vx,
      vy,
      size,
      color,
      alpha: 1,
      life: maxLife,
      maxLife,
      gravity: 480,
      shape,
    });
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      pt.vy += pt.gravity * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
    }
  }

  private updateFloatingTexts(dt: number): void {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y += ft.vy * dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private triggerShake(intensity: number, duration: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  private buildHudSnapshot(): HudSnapshot {
    const activeMonsters = this.enemies.filter((e) => e.kind !== 'ghost').length;
    return {
      score: this.score,
      highScore: this.highScore,
      lives: Math.max(0, this.lives),
      stageId: this.stage.id,
      totalStages: STAGES.length,
      stageName: this.stage.name,
      enemiesRemaining: activeMonsters,
      speedLevel: this.player.speedLevel,
      powerLevel: this.player.powerLevel,
      rangeLevel: this.player.rangeLevel,
      giantTimer: this.player.giantTimer,
      bossName: this.boss ? this.boss.name : null,
      bossHp: this.boss ? this.boss.hp : 0,
      bossMaxHp: this.boss ? this.boss.maxHp : 0,
      hurryUp: this.hurryUpSpawned,
      stageTime: this.stageTime,
      comboBest: this.comboBest,
      enemiesCrushedTotal: this.enemiesCrushedTotal,
    };
  }

  private render(): void {
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTimer > 0) {
      const decay = this.shakeTimer / 0.25;
      const mag = this.shakeIntensity * Math.min(1, decay);
      shakeX = (Math.random() - 0.5) * 2 * mag;
      shakeY = (Math.random() - 0.5) * 2 * mag;
    }

    const renderScale = this.canvas.width / PLAYFIELD_WIDTH || 1;
    this.ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);

    renderArena(this.ctx, {
      stage: this.stage,
      player: this.player,
      enemies: this.enemies,
      boss: this.boss,
      snowShots: this.snowShots,
      enemyProjectiles: this.enemyProjectiles,
      pickups: this.pickups,
      particles: this.particles,
      floatingTexts: this.floatingTexts,
      ambientFlakes: this.ambientFlakes,
      time: this.time,
      shakeX,
      shakeY,
      hurryUpBannerTimer: this.hurryUpBannerTimer,
      floorBannerTimer: this.floorBannerTimer,
      floorClearBannerTimer: this.floorClearBannerTimer,
      bonusRainActive: this.bonusRainActive,
      transitionProgress: this.transitionTimer > 0 ? 1 - this.transitionTimer / 0.5 : 0,
      renderScale,
    });
  }
}
