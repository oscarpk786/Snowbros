export type MusicTrack = 'none' | 'title' | 'stage' | 'boss';

interface TrackData {
  stepMs: number;
  lead: number[];   // Hz, 0 = rest
  bass: number[];   // Hz, 0 = rest
  drums: number[];  // 0 = none, 1 = hat, 2 = kick, 3 = snare
}

// MIDI note helper -> Hz
function n(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Upbeat wintry arcade stage melody (32-step loop, C Major / A Minor bounce)
const STAGE_TRACK: TrackData = {
  stepMs: 112,
  lead: [
    n(72), 0, n(76), n(79), n(84), 0, n(79), n(76),
    n(77), 0, n(81), n(79), n(76), 0, n(72), 0,
    n(74), 0, n(77), n(81), n(79), 0, n(76), n(72),
    n(74), n(76), n(79), 0, n(76), 0, n(72), 0,
    n(79), 0, n(84), n(83), n(81), 0, n(79), n(76),
    n(77), n(79), n(81), 0, n(79), 0, n(76), 0,
    n(74), 0, n(77), n(79), n(81), 0, n(79), n(74),
    n(76), 0, n(74), n(71), n(72), 0, 0, 0,
  ],
  bass: [
    n(48), n(60), n(48), n(60), n(48), n(60), n(48), n(60),
    n(41), n(53), n(41), n(53), n(48), n(60), n(48), n(60),
    n(43), n(55), n(43), n(55), n(48), n(60), n(48), n(60),
    n(43), n(55), n(43), n(55), n(48), n(60), n(43), 0,
    n(45), n(57), n(45), n(57), n(48), n(60), n(45), n(57),
    n(41), n(53), n(41), n(53), n(48), n(60), n(48), n(60),
    n(43), n(55), n(43), n(55), n(41), n(53), n(43), n(55),
    n(48), n(60), n(43), n(55), n(48), 0, n(43), 0,
  ],
  drums: [
    2, 1, 3, 1, 2, 1, 3, 1,
    2, 1, 3, 1, 2, 1, 3, 1,
    2, 1, 3, 1, 2, 1, 3, 1,
    2, 1, 3, 1, 2, 3, 3, 1,
    2, 1, 3, 1, 2, 1, 3, 1,
    2, 1, 3, 1, 2, 1, 3, 1,
    2, 1, 3, 1, 2, 1, 3, 1,
    2, 1, 3, 1, 2, 0, 3, 1,
  ],
};

// High-energy Boss Battle Theme (D Minor driving chiptune)
const BOSS_TRACK: TrackData = {
  stepMs: 98,
  lead: [
    n(74), 0, n(77), n(81), n(80), 0, n(77), n(74),
    n(76), 0, n(79), n(77), n(74), 0, n(73), 0,
    n(74), n(77), n(81), 0, n(86), 0, n(84), n(81),
    n(82), 0, n(81), n(79), n(77), 0, n(76), 0,
  ],
  bass: [
    n(38), n(50), n(38), n(50), n(38), n(50), n(38), n(50),
    n(40), n(52), n(40), n(52), n(38), n(50), n(37), n(49),
    n(38), n(50), n(38), n(50), n(41), n(53), n(41), n(53),
    n(46), n(58), n(45), n(57), n(43), n(55), n(40), n(52),
  ],
  drums: [
    2, 1, 3, 2, 2, 1, 3, 1,
    2, 1, 3, 2, 2, 3, 3, 1,
    2, 1, 3, 2, 2, 1, 3, 1,
    2, 2, 3, 1, 2, 3, 3, 3,
  ],
};

// Gentle wintry Title Screen music-box loop
const TITLE_TRACK: TrackData = {
  stepMs: 165,
  lead: [
    n(76), 0, n(79), 0, n(84), 0, n(79), 0,
    n(81), 0, n(79), 0, n(76), 0, 0, 0,
    n(74), 0, n(77), 0, n(81), 0, n(79), 0,
    n(76), 0, n(74), 0, n(72), 0, 0, 0,
  ],
  bass: [
    n(48), 0, n(55), 0, n(60), 0, n(55), 0,
    n(41), 0, n(53), 0, n(48), 0, n(55), 0,
    n(43), 0, n(55), 0, n(41), 0, n(55), 0,
    n(48), 0, n(43), 0, n(48), 0, 0, 0,
  ],
  drums: [
    0, 0, 1, 0, 0, 0, 1, 0,
    0, 0, 1, 0, 0, 0, 1, 0,
    0, 0, 1, 0, 0, 0, 1, 0,
    0, 0, 1, 0, 0, 0, 0, 0,
  ],
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private muted: boolean = false;
  private musicMuted: boolean = false;

  private currentTrack: MusicTrack = 'none';
  private stepIndex = 0;
  private nextNoteTime = 0;
  private schedulerId: number | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  constructor() {
    try {
      if (localStorage.getItem('snowbros_muted') === 'true') {
        this.muted = true;
      }
      if (localStorage.getItem('snowbros_music_muted') === 'true') {
        this.musicMuted = true;
      }
    } catch {
      // Ignore storage access errors
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public isMusicMuted(): boolean {
    return this.musicMuted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    try {
      localStorage.setItem('snowbros_muted', String(mute));
    } catch {
      // Ignore storage access errors
    }
    this.syncMusicGain();
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public setMusicMuted(mute: boolean): void {
    this.musicMuted = mute;
    try {
      localStorage.setItem('snowbros_music_muted', String(mute));
    } catch {
      // Ignore storage access errors
    }
    this.syncMusicGain();
  }

  public toggleMusicMute(): boolean {
    this.setMusicMuted(!this.musicMuted);
    return this.musicMuted;
  }

  private syncMusicGain(): void {
    if (!this.ctx || !this.musicGain) return;
    const target = this.muted || this.musicMuted ? 0.0001 : 0.16;
    this.musicGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.04);
  }

  public unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = this.muted || this.musicMuted ? 0.0001 : 0.16;
        this.musicGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.currentTrack !== 'none' && this.schedulerId === null) {
      this.startScheduler();
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      this.unlock();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMusicTrack(track: MusicTrack): void {
    if (this.currentTrack === track && (track === 'none' || this.schedulerId !== null)) {
      return;
    }
    this.currentTrack = track;
    this.stepIndex = 0;

    if (track === 'none') {
      this.stopScheduler();
      return;
    }

    if (this.ctx) {
      this.nextNoteTime = this.ctx.currentTime + 0.05;
      this.startScheduler();
    }
  }

  private startScheduler(): void {
    if (this.schedulerId !== null || !this.ctx) return;
    this.nextNoteTime = Math.max(this.nextNoteTime, this.ctx.currentTime + 0.04);
    this.schedulerId = window.setInterval(() => {
      this.scheduleAhead();
    }, 50);
  }

  private stopScheduler(): void {
    if (this.schedulerId !== null) {
      clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
  }

  private getTrackData(): TrackData | null {
    if (this.currentTrack === 'stage') return STAGE_TRACK;
    if (this.currentTrack === 'boss') return BOSS_TRACK;
    if (this.currentTrack === 'title') return TITLE_TRACK;
    return null;
  }

  private scheduleAhead(): void {
    const ctx = this.ctx;
    const bus = this.musicGain;
    const track = this.getTrackData();
    if (!ctx || !bus || !track || ctx.state !== 'running') return;
    if (this.muted || this.musicMuted) {
      // Keep cursor advancing silently without creating nodes
      while (this.nextNoteTime < ctx.currentTime + 0.14) {
        this.nextNoteTime += track.stepMs / 1000;
        this.stepIndex = (this.stepIndex + 1) % track.lead.length;
      }
      return;
    }

    const lookahead = 0.14;
    while (this.nextNoteTime < ctx.currentTime + lookahead) {
      const idx = this.stepIndex;
      const t = this.nextNoteTime;
      const stepSec = track.stepMs / 1000;

      const leadFreq = track.lead[idx];
      if (leadFreq > 0) {
        this.scheduleMusicVoice(
          ctx,
          bus,
          leadFreq,
          t,
          stepSec * 1.45,
          this.currentTrack === 'title' ? 'sine' : 'square',
          this.currentTrack === 'title' ? 0.24 : 0.12
        );
      }

      const bassFreq = track.bass[idx];
      if (bassFreq > 0) {
        this.scheduleMusicVoice(ctx, bus, bassFreq, t, stepSec * 0.9, 'triangle', 0.28);
      }

      const drum = track.drums[idx];
      if (drum === 1) {
        this.scheduleNoiseDrum(ctx, bus, t, 0.035, 6500, 0.08);
      } else if (drum === 2) {
        this.scheduleKick(ctx, bus, t);
      } else if (drum === 3) {
        this.scheduleNoiseDrum(ctx, bus, t, 0.075, 1800, 0.14);
      }

      this.nextNoteTime += stepSec;
      this.stepIndex = (this.stepIndex + 1) % track.lead.length;
    }
  }

  private scheduleMusicVoice(
    ctx: AudioContext,
    bus: GainNode,
    freq: number,
    time: number,
    duration: number,
    type: OscillatorType,
    peak: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    if (type === 'square') {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, time);
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }

    gain.connect(bus);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  private scheduleKick(ctx: AudioContext, bus: GainNode, time: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.09);

    gain.gain.setValueAtTime(0.28, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);

    osc.connect(gain);
    gain.connect(bus);
    osc.start(time);
    osc.stop(time + 0.11);
  }

  private scheduleNoiseDrum(
    ctx: AudioContext,
    bus: GainNode,
    time: number,
    duration: number,
    cutoff: number,
    peak: number
  ): void {
    if (!this.noiseBuffer) {
      const bufferSize = Math.floor(ctx.sampleRate * 0.15);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(cutoff, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peak, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    src.start(time);
    src.stop(time + duration + 0.01);
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType = 'triangle',
    gainPeak: number = 0.14,
    delay: number = 0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(40, freqStart), now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public jump(): void {
    this.playTone(250, 560, 0.13, 'triangle', 0.12);
  }

  public throwSnow(giant = false): void {
    if (giant) {
      this.playTone(420, 180, 0.11, 'square', 0.09);
    } else {
      this.playTone(620, 260, 0.08, 'sine', 0.09);
    }
  }

  public snowHit(level: number): void {
    const base = 320 + level * 95;
    this.playTone(base, base + 140, 0.07, 'triangle', 0.1);
  }

  public freezeFull(): void {
    this.playTone(523.25, 783.99, 0.11, 'sine', 0.12);
    this.playTone(1046.5, 1318.5, 0.14, 'triangle', 0.09, 0.05);
  }

  public kickSnowball(): void {
    this.playTone(170, 75, 0.14, 'square', 0.14);
    this.playTone(330, 520, 0.1, 'triangle', 0.1, 0.02);
  }

  public crushEnemy(chain: number): void {
    const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];
    const freq = scale[Math.min(chain - 1, scale.length - 1)] || 523.25;
    this.playTone(freq, freq * 1.35, 0.13, 'triangle', 0.15);
    this.playTone(140, 60, 0.1, 'sawtooth', 0.08);
  }

  public snowballShatter(): void {
    this.playTone(260, 110, 0.16, 'triangle', 0.11);
  }

  public pickupPotion(): void {
    this.playTone(523.25, 659.25, 0.09, 'sine', 0.12, 0);
    this.playTone(659.25, 783.99, 0.09, 'sine', 0.12, 0.07);
    this.playTone(783.99, 1046.5, 0.16, 'triangle', 0.13, 0.14);
  }

  public pickupTreasure(): void {
    this.playTone(660, 990, 0.08, 'sine', 0.11, 0);
    this.playTone(990, 1320, 0.12, 'sine', 0.11, 0.06);
  }

  public playerHurt(): void {
    this.playTone(340, 110, 0.28, 'sawtooth', 0.15, 0);
    this.playTone(220, 80, 0.25, 'square', 0.1, 0.06);
  }

  public bossHit(): void {
    this.playTone(160, 65, 0.22, 'sawtooth', 0.16);
    this.playTone(440, 290, 0.15, 'square', 0.1, 0.03);
  }

  public bossWarning(): void {
    this.playTone(220, 180, 0.22, 'sawtooth', 0.12, 0);
    this.playTone(220, 180, 0.22, 'sawtooth', 0.12, 0.26);
  }

  public stageClear(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((nFreq, i) => {
      this.playTone(nFreq, nFreq * 1.02, 0.16, 'triangle', 0.14, i * 0.09);
    });
  }

  public gameOver(): void {
    const notes = [392, 349.23, 311.13, 261.63];
    notes.forEach((nFreq, i) => {
      this.playTone(nFreq, nFreq * 0.96, 0.22, 'triangle', 0.13, i * 0.15);
    });
  }
}

export const soundEngine = new SoundEngine();
