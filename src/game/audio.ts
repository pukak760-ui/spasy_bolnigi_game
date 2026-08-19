// ---- tiny WebAudio synth for all game sounds ----

export class SFX {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  private sirenTimer: number | null = null;
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenHi = false;

  private engOsc: OscillatorNode | null = null;
  private engGain: GainNode | null = null;

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  private get ok() {
    return !!this.ctx && !!this.master && !this.muted;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType = "square",
    vol = 0.2,
    slide = 0,
    delay = 0
  ) {
    if (!this.ok || !this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide !== 0) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, vol = 0.3, freq = 800) {
    if (!this.ok || !this.ctx || !this.master) return;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master);
    src.start();
  }

  click() {
    this.tone(660, 0.06, "square", 0.12);
    this.tone(990, 0.05, "square", 0.08, 0, 0.03);
  }
  buy() {
    this.tone(520, 0.08, "square", 0.16);
    this.tone(780, 0.09, "square", 0.16, 0, 0.07);
    this.tone(1040, 0.14, "square", 0.16, 0, 0.14);
  }
  deny() {
    this.tone(220, 0.12, "sawtooth", 0.14, -60);
  }
  pickup() {
    this.tone(587, 0.09, "triangle", 0.25);
    this.tone(880, 0.16, "triangle", 0.25, 0, 0.08);
  }
  cash() {
    const notes = [1046, 1318, 1568, 2093];
    notes.forEach((n, i) => this.tone(n, 0.1, "square", 0.12, 0, i * 0.06));
  }
  crash() {
    this.noise(0.28, 0.4, 700);
    this.tone(90, 0.22, "sawtooth", 0.25, -40);
  }
  bump() {
    this.noise(0.1, 0.18, 500);
  }
  horn() {
    this.tone(440, 0.5, "sawtooth", 0.2, 10);
    this.tone(554, 0.5, "sawtooth", 0.16, 10);
  }
  powerup() {
    this.tone(700, 0.07, "square", 0.16);
    this.tone(1050, 0.07, "square", 0.16, 0, 0.06);
    this.tone(1400, 0.12, "square", 0.16, 0, 0.12);
  }
  fuel() {
    this.tone(300, 0.1, "triangle", 0.14, 120);
  }
  levelup() {
    [392, 523, 659, 784].forEach((n, i) => this.tone(n, 0.14, "triangle", 0.2, 0, i * 0.09));
  }
  death() {
    this.tone(300, 0.4, "sawtooth", 0.2, -180);
    this.tone(150, 0.6, "sawtooth", 0.18, -80, 0.25);
  }
  heartbeat() {
    this.tone(58, 0.09, "sine", 0.4);
    this.tone(50, 0.08, "sine", 0.32, 0, 0.16);
  }
  gameover() {
    [440, 349, 293, 220].forEach((n, i) => this.tone(n, 0.3, "triangle", 0.2, 0, i * 0.22));
  }

  siren(on: boolean) {
    if (!this.ctx || !this.master) return;
    if (on && !this.sirenTimer) {
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenGain = this.ctx.createGain();
      this.sirenOsc.type = "triangle";
      this.sirenOsc.frequency.value = 660;
      this.sirenGain.gain.value = this.muted ? 0 : 0.05;
      this.sirenOsc.connect(this.sirenGain).connect(this.master);
      this.sirenOsc.start();
      this.sirenTimer = window.setInterval(() => {
        this.sirenHi = !this.sirenHi;
        if (this.sirenOsc && this.ctx) {
          this.sirenOsc.frequency.setTargetAtTime(this.sirenHi ? 920 : 660, this.ctx.currentTime, 0.05);
        }
      }, 360);
    } else if (!on && this.sirenTimer) {
      window.clearInterval(this.sirenTimer);
      this.sirenTimer = null;
      try {
        this.sirenOsc?.stop();
      } catch {
        /* noop */
      }
      this.sirenOsc = null;
      this.sirenGain = null;
    }
    if (this.sirenGain) this.sirenGain.gain.value = this.muted ? 0 : 0.05;
  }

  engine(speed01: number) {
    if (!this.ctx || !this.master) return;
    if (!this.engOsc) {
      this.engOsc = this.ctx.createOscillator();
      this.engGain = this.ctx.createGain();
      this.engOsc.type = "sawtooth";
      this.engOsc.frequency.value = 42;
      this.engGain.gain.value = 0;
      const f = this.ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 240;
      this.engOsc.connect(f).connect(this.engGain).connect(this.master);
      this.engOsc.start();
    }
    if (this.engGain && this.ctx) {
      this.engGain.gain.setTargetAtTime(this.muted ? 0 : 0.012 + speed01 * 0.022, this.ctx.currentTime, 0.1);
      this.engOsc.frequency.setTargetAtTime(40 + speed01 * 55, this.ctx.currentTime, 0.1);
    }
  }

  stopAll() {
    this.siren(false);
    if (this.engGain && this.ctx) this.engGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
  }
}
