import React from 'react';
import { Music, Pause, Volume2, VolumeX } from 'lucide-react';
import { HudSnapshot } from '../game/types';

interface GameHudProps {
  hud: HudSnapshot;
  muted: boolean;
  musicMuted: boolean;
  onToggleMute: () => void;
  onToggleMusicMute: () => void;
  onPause: () => void;
}

const HeroCapIcon: React.FC<{ className?: string }> = ({ className = 'h-4 w-4 shrink-0' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="12" cy="5" r="3" fill="#ffffff" />
    <path d="M4 15a8 8 0 0 1 16 0H4z" fill="#38bdf8" />
    <rect x="3" y="14" width="18" height="4" rx="2" fill="#f8fafc" />
  </svg>
);

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  muted,
  musicMuted,
  onToggleMute,
  onToggleMusicMute,
  onPause,
}) => {
  const bossPct =
    hud.bossMaxHp > 0 ? Math.max(0, Math.min(100, (hud.bossHp / hud.bossMaxHp) * 100)) : 0;

  return (
    <header className="pointer-events-none flex w-full max-w-[1160px] flex-col gap-1.5 px-2 pt-2">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-sky-200/20 bg-[#0b1736]/90 px-5 py-2 text-slate-100 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]">
        {/* Left: Lives + Score + High Score */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5" aria-label={`Lives: ${hud.lives}`}>
            <div className="hidden lg:flex items-center gap-0.5">
              {Array.from({ length: Math.min(10, hud.lives) }).map((_, idx) => (
                <HeroCapIcon key={idx} className="h-3.5 w-3.5 shrink-0" />
              ))}
            </div>
            <HeroCapIcon className="h-5 w-5 shrink-0 lg:hidden" />
            <span className="font-mono-num text-xs font-bold text-sky-200">
              ×{hud.lives}
            </span>
          </div>

          <div className="flex items-baseline gap-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-medium text-slate-400">Score</span>
              <span className="font-mono-num text-base font-bold text-white">
                {hud.score.toLocaleString()}
              </span>
            </div>
            <div className="hidden sm:flex items-baseline gap-1.5">
              <span className="text-xs font-medium text-slate-400">Best</span>
              <span className="font-mono-num text-sm font-semibold text-amber-300">
                {hud.highScore.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Stage & Active Potion Upgrades */}
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-sm font-bold text-sky-300 whitespace-nowrap font-mono-num">
              Stage {String(hud.stageId).padStart(2, '0')}/{hud.totalStages}
            </span>
            <span className="hidden md:inline text-xs text-slate-400 whitespace-nowrap">
              {hud.stageName}
            </span>
          </div>

          {/* Potion upgrade telemetry (unboxed text + icon cues) */}
          <div className="hidden sm:flex items-center gap-2.5 text-xs font-mono-num">
            {hud.speedLevel > 0 && (
              <span className="text-red-400" title="Speed Up">
                S×{hud.speedLevel}
              </span>
            )}
            {hud.powerLevel > 0 && (
              <span className="text-sky-400" title="Snow Power Up">
                P×{hud.powerLevel}
              </span>
            )}
            {hud.rangeLevel > 0 && (
              <span className="text-yellow-300" title="Range Up">
                R×{hud.rangeLevel}
              </span>
            )}
            {hud.giantTimer > 0 && (
              <span className="font-bold text-emerald-400" title="Frost Giant Mode">
                GIANT {hud.giantTimer.toFixed(1)}s
              </span>
            )}
          </div>
        </div>

        {/* Right: Music Toggle, Audio Mute & Pause Controls */}
        <div className="pointer-events-auto flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleMusicMute}
            aria-label={musicMuted ? 'Turn music on' : 'Turn music off'}
            title={musicMuted ? 'Music Off' : 'Music On'}
            className={`flex h-10 w-10 items-center justify-center rounded-lg border border-sky-200/15 transition-colors hover:bg-[#1a3269] focus-visible:outline-2 focus-visible:outline-sky-400 cursor-pointer ${
              musicMuted || muted
                ? 'bg-[#0f1d40] text-slate-500'
                : 'bg-[#13254f] text-amber-300'
            }`}
          >
            <Music className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            title={muted ? 'Audio Muted' : 'Audio On'}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-sky-200/15 bg-[#13254f] text-sky-200 transition-colors hover:bg-[#1a3269] focus-visible:outline-2 focus-visible:outline-sky-400 cursor-pointer"
          >
            {muted ? <VolumeX className="h-4 w-4 text-slate-400" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onPause}
            aria-label="Pause game"
            className="flex h-10 items-center gap-1.5 rounded-lg border border-sky-200/15 bg-[#13254f] px-3 text-xs font-semibold text-slate-100 transition-colors hover:bg-[#1a3269] focus-visible:outline-2 focus-visible:outline-sky-400 whitespace-nowrap cursor-pointer"
          >
            <Pause className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Pause</span>
          </button>
        </div>
      </div>

      {/* Boss Health Bar Strip (only on boss stages) */}
      {hud.bossName && (
        <div className="flex items-center gap-3 rounded-lg border border-rose-400/30 bg-[#1b1026]/92 px-4 py-1.5 backdrop-blur-md shadow-[0_6px_20px_rgba(0,0,0,0.4)]">
          <span className="font-display text-xs font-bold text-rose-300 whitespace-nowrap">
            {hud.bossName}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-950/90 ring-1 ring-white/10">
            <div
              className="h-full bg-gradient-to-r from-rose-500 via-orange-400 to-amber-300 transition-all duration-150"
              style={{ width: `${bossPct}%` }}
            />
          </div>
          <span className="font-mono-num text-xs font-bold text-rose-200">
            {hud.bossHp}/{hud.bossMaxHp}
          </span>
        </div>
      )}
    </header>
  );
};
