import React from 'react';
import { ArrowRight, Cloud, Home, Play, RotateCcw, Trophy } from 'lucide-react';
import { GamePhase, HudSnapshot } from '../game/types';

interface GameModalsProps {
  phase: GamePhase;
  hud: HudSnapshot;
  onResume: () => void;
  onNextStage: () => void;
  onRestart: () => void;
  onQuitToTitle: () => void;
  onOpenDrive?: () => void;
}

export const GameModals: React.FC<GameModalsProps> = ({
  phase,
  hud,
  onResume,
  onNextStage,
  onRestart,
  onQuitToTitle,
  onOpenDrive,
}) => {
  if (phase === 'TITLE_MENU' || phase === 'PLAYING') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#030816]/82 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-sky-200/25 bg-[#0b1838]/95 p-7 text-slate-100 backdrop-blur-md shadow-[0_28px_80px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.1)]">
        {phase === 'PAUSED' && (
          <div className="space-y-6 text-center">
            <div className="space-y-1">
              <h2 className="font-display text-3xl font-bold text-white">Game Paused</h2>
              <p className="text-sm text-slate-300">
                Stage {hud.stageId} · {hud.stageName}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={onResume}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-sky-400 px-6 font-display text-base font-bold text-slate-950 hover:bg-sky-300 transition-colors cursor-pointer"
              >
                <Play className="h-4 w-4 fill-slate-950" />
                Resume Game
              </button>
              <button
                type="button"
                onClick={onRestart}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-sky-200/20 bg-[#142652] px-5 text-sm font-semibold text-slate-100 hover:bg-[#1a326b] transition-colors cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                Restart Run
              </button>
              {onOpenDrive && (
                <button
                  type="button"
                  onClick={onOpenDrive}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-sky-200/20 bg-[#142652] px-5 text-sm font-semibold text-sky-200 hover:bg-[#1a326b] hover:text-white transition-colors cursor-pointer"
                >
                  <Cloud className="h-4 w-4 text-sky-300" />
                  Google Drive Saves
                </button>
              )}
              <button
                type="button"
                onClick={onQuitToTitle}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-sky-200/10 bg-transparent px-5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
              >
                <Home className="h-4 w-4" />
                Title Menu
              </button>
            </div>
          </div>
        )}

        {phase === 'STAGE_CLEAR' && (
          <div className="space-y-6 text-center">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-300">
                Boss Floor {hud.stageId} Complete
              </p>
              <h2 className="font-display text-3xl font-bold text-white">
                {hud.stageName} Cleared!
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-3 border-y border-sky-200/15 py-4 text-center">
              <div>
                <div className="text-xs text-slate-400">Score</div>
                <div className="font-mono-num text-lg font-bold text-white">
                  {hud.score.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Crushed</div>
                <div className="font-mono-num text-lg font-bold text-sky-300">
                  {hud.enemiesCrushedTotal}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Best Chain</div>
                <div className="font-mono-num text-lg font-bold text-amber-300">
                  ×{Math.max(1, hud.comboBest)}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onNextStage}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 font-display text-base font-bold text-slate-950 hover:bg-amber-300 transition-colors cursor-pointer"
            >
              Climb to Floor {hud.stageId + 1}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {phase === 'VICTORY' && (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300">
              <Trophy className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-3xl font-bold text-amber-300">
                Frost Castle Liberated!
              </h2>
              <p className="text-sm text-slate-300">
                You defeated Emperor Blizzor and cleared all {hud.totalStages} stages.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 border-y border-sky-200/15 py-4 text-center">
              <div>
                <div className="text-xs text-slate-400">Final Score</div>
                <div className="font-mono-num text-lg font-bold text-white">
                  {hud.score.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">High Score</div>
                <div className="font-mono-num text-lg font-bold text-amber-300">
                  {hud.highScore.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Best Chain</div>
                <div className="font-mono-num text-lg font-bold text-sky-300">
                  ×{Math.max(1, hud.comboBest)}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={onRestart}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-sky-400 px-6 font-display text-base font-bold text-slate-950 hover:bg-sky-300 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                Play Again
              </button>
              <button
                type="button"
                onClick={onQuitToTitle}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-sky-200/15 bg-transparent px-5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
              >
                <Home className="h-4 w-4" />
                Title Menu
              </button>
            </div>
          </div>
        )}

        {phase === 'GAME_OVER' && (
          <div className="space-y-6 text-center">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-rose-400">
                Stage {hud.stageId} · {hud.stageName}
              </p>
              <h2 className="font-display text-3xl font-bold text-white">Game Over</h2>
            </div>

            <div className="grid grid-cols-3 gap-3 border-y border-sky-200/15 py-4 text-center">
              <div>
                <div className="text-xs text-slate-400">Final Score</div>
                <div className="font-mono-num text-lg font-bold text-white">
                  {hud.score.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">High Score</div>
                <div className="font-mono-num text-lg font-bold text-amber-300">
                  {hud.highScore.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Crushed</div>
                <div className="font-mono-num text-lg font-bold text-sky-300">
                  {hud.enemiesCrushedTotal}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={onRestart}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-sky-400 px-6 font-display text-base font-bold text-slate-950 hover:bg-sky-300 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                Play Again
              </button>
              <button
                type="button"
                onClick={onQuitToTitle}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-sky-200/15 bg-transparent px-5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
              >
                <Home className="h-4 w-4" />
                Title Menu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
