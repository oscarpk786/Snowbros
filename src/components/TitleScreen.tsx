import React, { useEffect, useRef } from 'react';
import { Cloud, Music, Play, Volume2, VolumeX } from 'lucide-react';
import { soundEngine } from '../game/sound';
import { ControlScheme, Difficulty } from '../game/types';
import { PWAInstallButton } from './PWAInstallButton';

interface TitleScreenProps {
  difficulty: Difficulty;
  onSelectDifficulty: (d: Difficulty) => void;
  controlScheme: ControlScheme;
  onSelectControlScheme: (c: ControlScheme) => void;
  startStageIndex: number;
  onSelectStartStage: (idx: number) => void;
  highScore: number;
  muted: boolean;
  musicMuted: boolean;
  onToggleMute: () => void;
  onToggleMusicMute: () => void;
  onOpenDrive: () => void;
  onStart: () => void;
}

const KEY_ART_SRC = '/src/assets/images/snow_bros_keyart_1794825072105.jpg';

export const TitleScreen: React.FC<TitleScreenProps> = ({
  difficulty,
  onSelectDifficulty,
  controlScheme,
  onSelectControlScheme,
  startStageIndex,
  onSelectStartStage,
  highScore,
  muted,
  musicMuted,
  onToggleMute,
  onToggleMusicMute,
  onOpenDrive,
  onStart,
}) => {
  const snowCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = snowCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const applySize = () => {
      if (!canvas) return { w: window.innerWidth, h: window.innerHeight };
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w, h };
    };

    let { w: width, h: height } = applySize();

    const flakes = Array.from({ length: prefersReducedMotion ? 18 : 75 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1.1 + Math.random() * 2.3,
      vy: 22 + Math.random() * 38,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.25 + Math.random() * 0.55,
    }));

    const handleResize = () => {
      const next = applySize();
      width = next.w;
      height = next.h;
    };
    window.addEventListener('resize', handleResize);

    let rafId = 0;
    let last = performance.now();
    let t = 0;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;

      ctx.clearRect(0, 0, width, height);
      for (const f of flakes) {
        if (!prefersReducedMotion) {
          f.y += f.vy * dt;
          f.x += Math.sin(t + f.phase) * 16 * dt;
          if (f.y > height + 6) {
            f.y = -6;
            f.x = Math.random() * width;
          }
        }
        ctx.globalAlpha = f.alpha;
        ctx.fillStyle = '#e0f2fe';
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!prefersReducedMotion) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div
      onPointerDown={() => {
        soundEngine.unlock();
        soundEngine.setMusicTrack('title');
      }}
      className="relative h-screen w-screen overflow-hidden bg-[#071024] text-slate-50 flex flex-col justify-between"
    >
      {/* Key-Art Backdrop with CSS fallback */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#060e24] via-[#0e2046] to-[#183160]"
        aria-hidden="true"
      >
        <img
          src={KEY_ART_SRC}
          alt="Twin snowman heroes rolling a glowing snowball down snowy castle steps"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-right md:object-center scale-[1.01]"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        {/* Measured scrim over the left 45% negative space + subtle ambient frost glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#050b1c]/95 via-[#07112a]/76 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(56,189,248,0.16),transparent_48%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#050b1c]/92 to-transparent" />
      </div>

      {/* Live ambient snow overlay */}
      <canvas
        ref={snowCanvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      />

      {/* Top corner install, Google Drive, music & audio toggles */}
      <div className="relative z-10 flex items-center justify-end gap-2.5 p-5 md:p-7">
        <button
          type="button"
          onClick={onOpenDrive}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-sky-200/25 bg-[#0b1733]/85 px-4 text-sm font-semibold text-sky-100 backdrop-blur-md shadow-lg transition-colors hover:border-sky-300/60 hover:bg-[#13254f] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Cloud className="h-4 w-4 text-sky-300" />
          <span>Google Drive</span>
        </button>
        <PWAInstallButton />
        <button
          type="button"
          onClick={onToggleMusicMute}
          aria-label={musicMuted ? 'Turn music on' : 'Turn music off'}
          title={musicMuted ? 'Music Off' : 'Music On'}
          className={`flex h-11 w-11 items-center justify-center rounded-xl border border-sky-200/25 bg-[#0b1733]/85 backdrop-blur-md shadow-lg transition-colors hover:border-sky-300/60 hover:bg-[#13254f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 cursor-pointer ${
            musicMuted || muted ? 'text-slate-400' : 'text-amber-300'
          }`}
        >
          <Music className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          title={muted ? 'Audio Muted' : 'Audio On'}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-200/25 bg-[#0b1733]/85 backdrop-blur-md shadow-lg text-sky-100 transition-colors hover:border-sky-300/60 hover:bg-[#13254f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 cursor-pointer"
        >
          {muted ? <VolumeX className="h-5 w-5 text-slate-400" /> : <Volume2 className="h-5 w-5 text-sky-300" />}
        </button>
      </div>

      {/* Left-aligned Focal Title Lockup over calm negative space */}
      <div className="relative z-10 flex flex-1 items-center px-6 sm:px-12 lg:px-20">
        <div className="max-w-xl space-y-6">
          {/* Bespoke SVG Title Lockup */}
          <div className="animate-gentle-float">
            <svg
              viewBox="0 0 460 148"
              className="w-full max-w-[430px] drop-shadow-[0_10px_28px_rgba(2,132,199,0.35)]"
              role="img"
              aria-label="Snow Bros: Frost Castle"
            >
              <defs>
                <linearGradient id="iceTextGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="52%" stopColor="#bae6fd" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
                <linearGradient id="brosTextGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="55%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
              </defs>

              {/* Cute twin cap emblem */}
              <g transform="translate(14, 14)">
                <circle cx="22" cy="24" r="16" fill="#2563eb" />
                <rect x="6" y="21" width="32" height="7" rx="3.5" fill="#f8fafc" />
                <circle cx="22" cy="6" r="6" fill="#ffffff" />
                <circle cx="48" cy="26" r="14" fill="#ef4444" />
                <rect x="34" y="23" width="28" height="6" rx="3" fill="#f8fafc" />
                <circle cx="48" cy="10" r="5" fill="#ffffff" />
              </g>

              {/* SNOW */}
              <text
                x="12"
                y="94"
                fontFamily="Fredoka, system-ui, sans-serif"
                fontWeight="700"
                fontSize="68"
                letterSpacing="2"
                fill="#0b1d42"
                stroke="#0b1d42"
                strokeWidth="10"
                strokeLinejoin="round"
              >
                SNOW
              </text>
              <text
                x="12"
                y="90"
                fontFamily="Fredoka, system-ui, sans-serif"
                fontWeight="700"
                fontSize="68"
                letterSpacing="2"
                fill="url(#iceTextGrad)"
                stroke="#0f3266"
                strokeWidth="2.5"
                strokeLinejoin="round"
              >
                SNOW
              </text>

              {/* BROS */}
              <text
                x="218"
                y="94"
                fontFamily="Fredoka, system-ui, sans-serif"
                fontWeight="700"
                fontSize="68"
                letterSpacing="2"
                fill="#2d1208"
                stroke="#2d1208"
                strokeWidth="10"
                strokeLinejoin="round"
              >
                BROS
              </text>
              <text
                x="218"
                y="90"
                fontFamily="Fredoka, system-ui, sans-serif"
                fontWeight="700"
                fontSize="68"
                letterSpacing="2"
                fill="url(#brosTextGrad)"
                stroke="#7c2d12"
                strokeWidth="2.5"
                strokeLinejoin="round"
              >
                BROS
              </text>

              {/* Subtitle */}
              <text
                x="16"
                y="130"
                fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
                fontWeight="700"
                fontSize="20"
                letterSpacing="5"
                fill="#e0f2fe"
              >
                FROST CASTLE
              </text>
            </svg>
          </div>

          <p className="max-w-md text-base leading-relaxed text-slate-200/95">
            Blast castle monsters into giant snowballs, kick them down the tiers for chain-crush combos, and shatter two fire-and-ice bosses.
          </p>

          {/* Clean unboxed metadata row (High Score + Stages) */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-sky-200/90">
            <span>
              High Score{' '}
              <strong className="font-mono-num text-amber-300">
                {highScore.toLocaleString()}
              </strong>
            </span>
            <span aria-hidden="true" className="text-slate-500">
              ·
            </span>
            <span>100 Arcade Levels</span>
            <span aria-hidden="true" className="text-slate-500">
              ·
            </span>
            <span>10 Boss Fights</span>
            <span aria-hidden="true" className="text-slate-500">
              ·
            </span>
            <span>10 Lives</span>
          </div>

          {/* Interactive Difficulty Switch + Primary Start CTA */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onStart}
              className="inline-flex h-13 items-center justify-center gap-2.5 rounded-xl bg-sky-400 px-8 font-display text-lg font-bold text-slate-950 shadow-[0_6px_0_#0284c7] transition-transform active:translate-y-0.5 hover:bg-sky-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="h-5 w-5 fill-slate-950" />
              Start Game
            </button>

            <div
              role="group"
              aria-label="Difficulty mode"
              className="inline-flex items-center rounded-xl border border-sky-200/20 bg-[#0b1733]/90 p-1"
            >
              <button
                type="button"
                onClick={() => onSelectDifficulty('arcade')}
                className={`h-10 rounded-lg px-4 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  difficulty === 'arcade'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Arcade
              </button>
              <button
                type="button"
                onClick={() => onSelectDifficulty('chill')}
                className={`h-10 rounded-lg px-4 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  difficulty === 'chill'
                    ? 'bg-sky-300 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Chill Mode
              </button>
            </div>
          </div>

          {/* Starting Level Stepper (1 - 100) & Controls Toggle */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-medium text-slate-400">Start Level</span>
              <div
                role="group"
                aria-label="Starting level selector"
                className="inline-flex items-center gap-1 rounded-lg border border-sky-200/15 bg-[#0b1733]/85 p-1"
              >
                <button
                  type="button"
                  onClick={() => onSelectStartStage(Math.max(0, startStageIndex - 10))}
                  disabled={startStageIndex === 0}
                  className="h-8 rounded-md px-2.5 font-mono-num text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                  -10
                </button>
                <button
                  type="button"
                  onClick={() => onSelectStartStage(Math.max(0, startStageIndex - 1))}
                  disabled={startStageIndex === 0}
                  className="h-8 rounded-md px-2.5 font-mono-num text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                  -1
                </button>
                <span className="min-w-[84px] text-center font-mono-num text-xs font-bold text-sky-300">
                  Lv {String(startStageIndex + 1).padStart(3, '0')} / 100
                </span>
                <button
                  type="button"
                  onClick={() => onSelectStartStage(Math.min(99, startStageIndex + 1))}
                  disabled={startStageIndex === 99}
                  className="h-8 rounded-md px-2.5 font-mono-num text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => onSelectStartStage(Math.min(99, startStageIndex + 10))}
                  disabled={startStageIndex === 99}
                  className="h-8 rounded-md px-2.5 font-mono-num text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                  +10
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Controls</span>
              <div
                role="group"
                aria-label="Keyboard control scheme"
                className="inline-flex items-center rounded-lg border border-sky-200/15 bg-[#0b1733]/85 p-1"
              >
                <button
                  type="button"
                  onClick={() => onSelectControlScheme('classic')}
                  className={`h-8 rounded-md px-2.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    controlScheme === 'classic'
                      ? 'bg-sky-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Arrows + A/S
                </button>
                <button
                  type="button"
                  onClick={() => onSelectControlScheme('wasd')}
                  className={`h-8 rounded-md px-2.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    controlScheme === 'wasd'
                      ? 'bg-sky-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  WASD
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Single flat control-hint line at bottom */}
      <div className="relative z-10 px-6 pb-5 sm:px-12 lg:px-20">
        <p className="text-xs sm:text-sm font-medium tracking-wide text-slate-300/90">
          {controlScheme === 'classic'
            ? '← / → Move · ↑ / S Jump · A / Space Shoot & Kick · ↓ + S Drop · Enter Start · Backspace / Esc Pause'
            : 'A / D or ← / → Move · W / ↑ Jump · Space / J Throw & Kick · S + W Drop · Esc Pause · Enter Start'}
        </p>
      </div>
    </div>
  );
};
