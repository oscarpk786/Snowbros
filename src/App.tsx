import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Snowflake } from 'lucide-react';
import { GameHud } from './components/GameHud';
import { GameModals } from './components/GameModals';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { TitleScreen } from './components/TitleScreen';
import { SnowBrosEngine } from './game/engine';
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH, STAGES } from './game/levels';
import { soundEngine } from './game/sound';
import { ControlScheme, Difficulty, GamePhase, HudSnapshot } from './game/types';
import { SnowBrosCloudSave } from './services/googleDrive';

function readInitialControlScheme(): ControlScheme {
  try {
    const raw = localStorage.getItem('snowbros_controls_v1');
    return raw === 'wasd' ? 'wasd' : 'classic';
  } catch {
    return 'classic';
  }
}

function readInitialHighScore(): number {
  try {
    const raw = localStorage.getItem('snowbros_high_score_v1');
    return raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
  } catch {
    return 0;
  }
}

const INITIAL_HUD: HudSnapshot = {
  score: 0,
  highScore: readInitialHighScore(),
  lives: 10,
  stageId: 1,
  totalStages: STAGES.length,
  stageName: STAGES[0].name,
  enemiesRemaining: STAGES[0].enemies.length,
  speedLevel: 0,
  powerLevel: 0,
  rangeLevel: 0,
  giantTimer: 0,
  bossName: null,
  bossHp: 0,
  bossMaxHp: 0,
  hurryUp: false,
  stageTime: 0,
  comboBest: 0,
  enemiesCrushedTotal: 0,
};

export function App() {
  const [phase, setPhase] = useState<GamePhase>('TITLE_MENU');
  const [difficulty, setDifficulty] = useState<Difficulty>('arcade');
  const [controlScheme, setControlScheme] = useState<ControlScheme>(readInitialControlScheme);
  const [startStageIndex, setStartStageIndex] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(() => soundEngine.isMuted());
  const [musicMuted, setMusicMuted] = useState<boolean>(() => soundEngine.isMusicMuted());
  const [driveOpen, setDriveOpen] = useState(false);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<SnowBrosEngine | null>(null);
  const phaseRef = useRef<GamePhase>(phase);
  phaseRef.current = phase;

  const ensureEngine = useCallback((): SnowBrosEngine | null => {
    if (engineRef.current) return engineRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const engine = new SnowBrosEngine(canvas, {
      onHudUpdate: (snapshot) => setHud(snapshot),
      onStageClear: (snapshot) => {
        setHud(snapshot);
        setPhase('STAGE_CLEAR');
      },
      onVictory: (snapshot) => {
        setHud(snapshot);
        setPhase('VICTORY');
      },
      onGameOver: (snapshot) => {
        setHud(snapshot);
        setPhase('GAME_OVER');
      },
    });
    engineRef.current = engine;
    return engine;
  }, []);

  const handleToggleMute = useCallback(() => {
    soundEngine.unlock();
    const nextMuted = soundEngine.toggleMute();
    setMuted(nextMuted);
  }, []);

  const handleToggleMusicMute = useCallback(() => {
    soundEngine.unlock();
    const nextMusicMuted = soundEngine.toggleMusicMute();
    setMusicMuted(nextMusicMuted);
    if (!nextMusicMuted && phaseRef.current === 'TITLE_MENU') {
      soundEngine.setMusicTrack('title');
    }
  }, []);

  const handleSelectControlScheme = useCallback((scheme: ControlScheme) => {
    setControlScheme(scheme);
    try {
      localStorage.setItem('snowbros_controls_v1', scheme);
    } catch {
      // Ignore storage failures
    }
    engineRef.current?.setControlScheme(scheme);
  }, []);

  const handleRestoreDriveSave = useCallback((save: SnowBrosCloudSave) => {
    setDifficulty(save.difficulty);
    setStartStageIndex(save.startStageIndex);
    setControlScheme(save.controlScheme);
    try {
      localStorage.setItem('snowbros_controls_v1', save.controlScheme);
      const nextBest = Math.max(readInitialHighScore(), save.highScore);
      localStorage.setItem('snowbros_high_score_v1', String(nextBest));
      setHud((prev) => ({
        ...prev,
        highScore: Math.max(prev.highScore, nextBest),
      }));
    } catch {
      // Ignore storage errors
    }
    engineRef.current?.setControlScheme(save.controlScheme);
  }, []);

  const handleStartGame = useCallback(() => {
    soundEngine.unlock();
    setPhase('PLAYING');
    requestAnimationFrame(() => {
      const engine = ensureEngine();
      engine?.setControlScheme(controlScheme);
      engine?.startNewGame(difficulty, startStageIndex);
    });
  }, [controlScheme, difficulty, ensureEngine, startStageIndex]);

  const handlePause = useCallback(() => {
    if (phaseRef.current === 'PLAYING') {
      engineRef.current?.setPaused(true);
      engineRef.current?.clearInputs();
      setPhase('PAUSED');
    } else if (phaseRef.current === 'PAUSED') {
      engineRef.current?.setPaused(false);
      setPhase('PLAYING');
    }
  }, []);

  const handleNextStage = useCallback(() => {
    soundEngine.unlock();
    setPhase('PLAYING');
    engineRef.current?.advanceNextStage();
  }, []);

  const handleRestart = useCallback(() => {
    soundEngine.unlock();
    setPhase('PLAYING');
    const engine = ensureEngine();
    engine?.startNewGame(difficulty, startStageIndex);
  }, [difficulty, ensureEngine, startStageIndex]);

  const handleQuitToTitle = useCallback(() => {
    engineRef.current?.destroy();
    engineRef.current = null;
    setPhase('TITLE_MENU');
    soundEngine.setMusicTrack('title');
    setHud((prev) => ({
      ...INITIAL_HUD,
      highScore: Math.max(prev.highScore, readInitialHighScore()),
    }));
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') {
        handleToggleMute();
        return;
      }

      const current = phaseRef.current;

      if (current === 'TITLE_MENU') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStartGame();
        }
        return;
      }

      if (current === 'STAGE_CLEAR') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleNextStage();
        }
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP' || e.code === 'Backspace') {
        if (current === 'PLAYING' || current === 'PAUSED') {
          e.preventDefault();
          handlePause();
        }
        return;
      }

      if (current === 'PAUSED' && e.code === 'Enter') {
        e.preventDefault();
        handlePause();
        return;
      }

      if (current === 'PLAYING') {
        soundEngine.unlock();
        const handled = engineRef.current?.handleKeyDown(e.code);
        if (handled) {
          e.preventDefault();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      engineRef.current?.handleKeyUp(e.code);
    };

    const onBlur = () => {
      engineRef.current?.clearInputs();
      if (phaseRef.current === 'PLAYING') {
        engineRef.current?.setPaused(true);
        setPhase('PAUSED');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [handleNextStage, handlePause, handleStartGame, handleToggleMute]);

  useEffect(() => {
    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  const bindTouch = (control: 'left' | 'right' | 'down' | 'jump' | 'shoot') => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      soundEngine.unlock();
      engineRef.current?.setTouchControl(control, true);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      engineRef.current?.setTouchControl(control, false);
    },
    onPointerCancel: () => {
      engineRef.current?.setTouchControl(control, false);
    },
    onPointerLeave: () => {
      engineRef.current?.setTouchControl(control, false);
    },
  });

  if (phase === 'TITLE_MENU') {
    return (
      <>
        <TitleScreen
          difficulty={difficulty}
          onSelectDifficulty={setDifficulty}
          controlScheme={controlScheme}
          onSelectControlScheme={handleSelectControlScheme}
          startStageIndex={startStageIndex}
          onSelectStartStage={setStartStageIndex}
          highScore={hud.highScore}
          muted={muted}
          musicMuted={musicMuted}
          onToggleMute={handleToggleMute}
          onToggleMusicMute={handleToggleMusicMute}
          onOpenDrive={() => setDriveOpen(true)}
          onStart={handleStartGame}
        />
        <GoogleDriveModal
          open={driveOpen}
          onClose={() => setDriveOpen(false)}
          currentSave={{
            highScore: hud.highScore,
            startStageIndex,
            difficulty,
            controlScheme,
          }}
          onRestoreSave={handleRestoreDriveSave}
        />
        <OfflineIndicator />
      </>
    );
  }

  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-between overflow-hidden bg-[radial-gradient(ellipse_at_top,#10234d_0%,#060d20_55%,#030712_100%)] px-3 pb-2.5">
      {/* Unobtrusive Full-HD Perimeter HUD above the playfield */}
      <GameHud
        hud={hud}
        muted={muted}
        musicMuted={musicMuted}
        onToggleMute={handleToggleMute}
        onToggleMusicMute={handleToggleMusicMute}
        onPause={handlePause}
      />

      {/* Isolated Full-HD Canvas Arena Container */}
      <main className="relative flex flex-1 w-full items-center justify-center overflow-hidden py-1.5">
        <div className="relative flex h-full max-h-full w-full max-w-[1400px] items-center justify-center">
          <canvas
            ref={canvasRef}
            width={
              PLAYFIELD_WIDTH *
              Math.min(4, Math.max(3, Math.ceil(((typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1) * 1.5)))
            }
            height={
              PLAYFIELD_HEIGHT *
              Math.min(4, Math.max(3, Math.ceil(((typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1) * 1.5)))
            }
            className="h-full w-auto max-h-full max-w-full aspect-[4/3] rounded-2xl border border-sky-200/25 bg-[#070f24] shadow-[0_28px_90px_rgba(0,0,0,0.88),0_0_50px_rgba(56,189,248,0.08)]"
          />
        </div>
      </main>

      {/* Subtle bottom control bar on desktop / Touch controls on mobile */}
      <footer className="flex w-full max-w-[1200px] items-center justify-center pt-0.5">
        <p className="hidden md:block text-xs tracking-wide text-slate-400">
          {controlScheme === 'classic'
            ? '←/→ Move · ↑/S Jump · A/Space Shoot & Kick Snowball · ↓+S Drop Platform · Backspace/Esc Pause'
            : 'A/D or ←/→ Move · W/↑ Jump · Space/J Throw & Kick Snowball · S+W Drop Platform · Esc Pause'}
        </p>

        <div className="flex md:hidden w-full items-center justify-between gap-4 px-2 pb-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Move Left"
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-sky-200/20 bg-[#13254f] text-sky-100 active:bg-sky-500 active:text-slate-950 touch-none"
              {...bindTouch('left')}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Drop Down"
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-sky-200/20 bg-[#13254f] text-sky-100 active:bg-sky-500 active:text-slate-950 touch-none"
              {...bindTouch('down')}
            >
              <ArrowDown className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Move Right"
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-sky-200/20 bg-[#13254f] text-sky-100 active:bg-sky-500 active:text-slate-950 touch-none"
              {...bindTouch('right')}
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              aria-label="Jump"
              className="flex h-12 w-14 items-center justify-center rounded-xl border border-amber-300/30 bg-[#1a2e5c] text-amber-200 active:bg-amber-400 active:text-slate-950 touch-none"
              {...bindTouch('jump')}
            >
              <ArrowUp className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Throw Snow"
              className="flex h-12 w-16 items-center justify-center rounded-xl bg-sky-400 text-slate-950 font-bold active:bg-sky-300 touch-none"
              {...bindTouch('shoot')}
            >
              <Snowflake className="h-5 w-5" />
            </button>
          </div>
        </div>
      </footer>

      {/* Pause / Stage Clear / Victory / Game Over Modal */}
      <GameModals
        phase={phase}
        hud={hud}
        onResume={handlePause}
        onNextStage={handleNextStage}
        onRestart={handleRestart}
        onQuitToTitle={handleQuitToTitle}
        onOpenDrive={() => setDriveOpen(true)}
      />
      <GoogleDriveModal
        open={driveOpen}
        onClose={() => setDriveOpen(false)}
        currentSave={{
          highScore: Math.max(hud.highScore, hud.score),
          startStageIndex: Math.max(startStageIndex, hud.stageId - 1),
          difficulty,
          controlScheme,
        }}
        onRestoreSave={handleRestoreDriveSave}
      />
      <OfflineIndicator />
    </div>
  );
}

export default App;
