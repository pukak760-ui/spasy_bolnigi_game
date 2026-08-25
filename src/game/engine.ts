// ---- core game engine: ambulance rescue loop ----
import { SFX } from "./audio";
import { computeStats, getSkin, type SkinDef, type Upgrades } from "./meta";
import { drawAmbulance, drawCross, drawPatient, drawTrafficCar, drawTree, rr } from "./sprites";
import {
  B,
  drawBuilding,
  genWorld,
  HALF,
  isOnRoad,
  LANE_FAST,
  LANE_ON1,
  LANE_ON2,
  LANE_SLOW,
  RW,
  SIDE,
  SIZE,
  type WorldData,
} from "./world";

export interface HudSnap {
  score: number;
  money: number;
  combo: number;
  comboMult: number;
  fuel: number;
  fuelMax: number;
  lives: number;
  level: number;
  rescued: number;
  speed: number;
  night: number;
  carrying: { name: string; label: string; hp: number; carryT: number } | null;
  nearestDist: number | null;
  targetKind: "patient" | "hospital" | null;
  hornCd01: number;
  sirenOn: boolean;
}

export interface GameStats {
  score: number;
  rescued: number;
  moneyDelta: number;
  timeSec: number;
  level: number;
}

export interface Toast {
  text: string;
  kind: "info" | "good" | "bad";
}

export interface Callbacks {
  onHud: (h: HudSnap) => void;
  onGameOver: (s: GameStats) => void;
  onToast: (t: Toast) => void;
  onPauseRequest: () => void;
  /** Platform asked the game to resume (Yandex `game_api_resume` event). */
  onResumeRequest?: () => void;
  /** Fired once, right after the very first frame has been rendered. */
  onLoaded?: () => void;
}

export interface GameOptions {
  upgrades: Upgrades;
  skinId: string;
  startMoney: number;
  sfx: SFX;
  cb: Callbacks;
}

interface Patient {
  id: number;
  x: number;
  y: number;
  name: string;
  label: string;
  drain: number;
  mult: number;
  hp: number;
  seed: number;
  born: number;
}

interface Car {
  x: number;
  y: number;
  dir: number; // 0 east, 1 south, 2 west, 3 north
  lane: number; // offset from the road grid line along the fixed axis
  speed: number;
  cruise: number;
  color: string;
  yieldT: number;
  crashCd: number;
  ang: number; // real heading (radians) — velocity is ALWAYS along it
  gate: number; // next intersection grid line to cross (along dir axis)
  turn: { tx: number; ty: number; dir: number; lane: number } | null; // active maneuver waypoint
  stuckT: number; // anti-deadlock timer (cars jammed into each other)
}

// lane offsets per direction (right-hand traffic)
const laneFor = (dir: number): number => {
  const inner = Math.random() < 0.5;
  if (dir === 0) return inner ? LANE_ON1 : LANE_ON2; // east → south half
  if (dir === 1) return inner ? LANE_SLOW : LANE_FAST; // south → west half
  if (dir === 2) return inner ? LANE_SLOW : LANE_FAST; // west → north half
  return inner ? LANE_ON1 : LANE_ON2; // north → east half
};

// signed shortest-path angle difference (handles the ±PI wrap correctly)
const angDiff = (a: number, b: number) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};

// rotate angle `a` toward `b` by at most `maxStep` radians (shortest way) —
// the steering-wheel analog of Phaser.Math.Angle.RotateTo
const rotateToward = (a: number, b: number, maxStep: number) => {
  const d = angDiff(a, b);
  return a + clamp(d, -maxStep, maxStep);
};

const dirAngle = (dir: number) => Math.atan2(DIRS[dir].y, DIRS[dir].x);

// ---- car handling config ----
const CAR_ROT_SPEED = 2.3; // steering rate, radians per second (bounded turn rate)
const CAR_LOOKAHEAD = 150; // how far ahead the "driver" aims on straights

interface Powerup {
  x: number;
  y: number;
  kind: "med" | "fuel" | "star";
  t: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: "spark" | "smoke" | "confetti" | "ring" | "dust";
}

interface Floater {
  x: number;
  y: number;
  text: string;
  color: string;
  t: number;
  size: number;
}

interface Skid {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  t: number;
}

const DIRS = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];

const DIAGS = [
  { label: "Грипп", drain: 2.1, mult: 0.8 },
  { label: "Перелом ноги", drain: 2.6, mult: 0.9 },
  { label: "Температура 41°", drain: 3.1, mult: 1.0 },
  { label: "Отравление", drain: 3.5, mult: 1.1 },
  { label: "Ожог", drain: 3.9, mult: 1.25 },
  { label: "Аллергия", drain: 4.3, mult: 1.35 },
  { label: "Инфаркт", drain: 5.1, mult: 1.7 },
];

const NAMES = ["Иван", "Пётр", "Мария", "Ольга", "Николай", "Анна", "Сергей", "Дмитрий", "Елена", "Виктор", "Зоя", "Борис", "Тамара", "Глеб"];

const CAR_COLORS = ["#3f6fd8", "#d84f4f", "#4fbf6f", "#d8a53f", "#8f5fd8", "#5fc4d8", "#d86fa5", "#7a8aa0"];

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private world: WorldData;
  private sfx: SFX;
  private cb: Callbacks;
  private stats: ReturnType<typeof computeStats>;
  private skin: SkinDef;
  private pattern: CanvasPattern | null = null;

  // player
  private px: number;
  private py: number;
  private pa = Math.PI / 2;
  private speed = 0;
  private fuel: number;
  private carrying: Patient | null = null;
  private carryT = 0;

  // entities
  private patients: Patient[] = [];
  private cars: Car[] = [];
  private powerups: Powerup[] = [];
  private particles: Particle[] = [];
  private floaters: Floater[] = [];
  private skids: Skid[] = [];

  // meta / run state
  private score = 0;
  private money: number;
  private startMoney: number;
  private lives = 3;
  private rescued = 0;
  private combo = 0;
  private level = 1;
  private time = 0;
  private dayT = 0.08;
  private state: "run" | "over" = "run";
  paused = false;

  // timers
  private spawnT = 1.2;
  private powerT = 4;
  private carT = 0;
  private hornT = 0;
  private hornCd = 0;
  private boardProg = 0;
  private boardTarget: Patient | null = null;
  private treatProg = 0;
  private fuelProg = 0;
  private fuelTick = 0;
  private hbT = 0;
  private hudAcc = 0;
  private flashT = 0;
  private fastWarnT = 0;
  private stallToasted = false;
  private patientId = 1;

  // camera
  private camX: number;
  private camY: number;
  private shake = 0;
  private zoom = 1;
  private dpr = 1;

  private keys = new Set<string>();
  // touch (mobile) input — merged with the keyboard
  private tSteer = 0;
  private tThrottle = 0;
  private tBrake = 0;
  private tHorn = false;
  private raf = 0;
  private last = 0;
  private destroyed = false;
  private loadedOnce = false;

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
    this.keys.add(k);
    if (k === "escape" || k === "p" || k === "з") {
      if (this.state === "run") this.cb.onPauseRequest();
    }
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };
  private onBlur = () => {
    if (this.state === "run" && !this.paused) this.cb.onPauseRequest();
  };
  // tab hidden / window minimized → kill sound immediately and auto-pause
  private onVis = () => {
    if (document.hidden) {
      this.sfx.siren(false);
      this.sfx.engine(0);
      if (this.state === "run" && !this.paused) this.cb.onPauseRequest();
    }
  };
  // Yandex platform events: the platform itself asks the game to pause/resume
  private onApiPause = () => {
    this.sfx.siren(false);
    this.sfx.engine(0);
    if (this.state === "run" && !this.paused) this.cb.onPauseRequest();
  };
  private onApiResume = () => {
    this.cb.onResumeRequest?.();
  };
  private onResize = () => this.resize();

  constructor(canvas: HTMLCanvasElement, opts: GameOptions) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.sfx = opts.sfx;
    this.cb = opts.cb;
    this.stats = computeStats(opts.upgrades);
    this.skin = getSkin(opts.skinId);
    this.money = opts.startMoney;
    this.startMoney = opts.startMoney;
    this.fuel = this.stats.fuelMax;
    this.world = genWorld();
    this.px = this.world.hospital.bayX;
    this.py = 3 * B + HALF; // middle of the road in front of the hospital
    this.camX = this.px;
    this.camY = this.py;
    this.pattern = this.ctx.createPattern(this.world.tile, "repeat");

    for (let i = 0; i < 26; i++) this.spawnCar(true);
    this.spawnPatient(true);

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    window.addEventListener("visibilitychange", this.onVis);
    window.addEventListener("game_api_pause", this.onApiPause);
    window.addEventListener("game_api_resume", this.onApiResume);
    window.addEventListener("resize", this.onResize);
    this.resize();
  }

  start() {
    this.last = performance.now();
    const loop = (now: number) => {
      if (this.destroyed) return;
      const dt = clamp((now - this.last) / 1000, 0, 0.045);
      this.last = now;
      if (!this.paused && this.state === "run") {
        try {
          this.update(dt);
          this.render();
        } catch (e) {
          // a single-frame error must never kill the loop (that would freeze the game)
          console.error("[engine] frame error", e);
        }
        if (!this.loadedOnce) {
          this.loadedOnce = true;
          this.cb.onLoaded?.();
        }
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    this.cb.onToast({ text: "Поступил первый вызов! Следуй за стрелкой", kind: "info" });
  }

  setPaused(p: boolean) {
    this.paused = p;
    if (p) {
      this.sfx.siren(false);
      this.sfx.engine(0);
    } else {
      this.last = performance.now();
    }
  }

  /** Feed virtual-joystick / horn state from the touch controls. */
  setTouchInput(t: { steer?: number; throttle?: number; brake?: number; horn?: boolean }) {
    if (t.steer !== undefined) this.tSteer = clamp(t.steer, -1, 1);
    if (t.throttle !== undefined) this.tThrottle = clamp(t.throttle, 0, 1);
    if (t.brake !== undefined) this.tBrake = clamp(t.brake, 0, 1);
    if (t.horn !== undefined) this.tHorn = t.horn;
  }

  /** Rewarded-ad continue: revive the same run with one life and a full tank. */
  continueRun() {
    if (this.state !== "over") return;
    this.state = "run";
    this.lives = 1;
    this.fuel = this.stats.fuelMax;
    this.stallToasted = false;
    this.flashT = 0;
    this.last = performance.now();
    this.sfx.powerup();
    this.ring(this.px, this.py, "#3ddc6b");
    this.cb.onToast({ text: "Бак полон — смена продолжается!", kind: "good" });
    this.emitHud();
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    window.removeEventListener("visibilitychange", this.onVis);
    window.removeEventListener("game_api_pause", this.onApiPause);
    window.removeEventListener("game_api_resume", this.onApiResume);
    window.removeEventListener("resize", this.onResize);
    this.sfx.siren(false);
    this.sfx.engine(0);
  }

  private resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.zoom = clamp(Math.min(w, h) / 780, 0.82, 1.18);
  }

  // ================= UPDATE =================
  private update(dt: number) {
    this.time += dt;
    this.dayT = (this.dayT + dt / 95) % 1;
    const st = this.stats;

    // ----- input (keyboard + touch merged) -----
    const up =
      this.keys.has("arrowup") || this.keys.has("w") || this.keys.has("ц") || this.tThrottle > 0.25;
    const down =
      this.keys.has("arrowdown") || this.keys.has("s") || this.keys.has("ы") || this.tBrake > 0.25;
    const left = this.keys.has("arrowleft") || this.keys.has("a") || this.keys.has("ф");
    const right = this.keys.has("arrowright") || this.keys.has("d") || this.keys.has("в");
    const hornKey = this.keys.has(" ") || this.tHorn;

    const offroad = !isOnRoad(this.px, this.py);
    const maxSp = st.maxSpeed * (offroad ? 0.45 : 1) * (this.fuel <= 0 ? 0.3 : 1);

    if (this.fuel > 0 && up) this.speed += st.accel * dt;
    else if (down) this.speed -= st.brake * dt;
    else this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 160 * dt);
    if (down && this.speed < -90) this.speed = -90;
    this.speed = clamp(this.speed, -110, maxSp);

    const steer = clamp((right ? 1 : 0) - (left ? 1 : 0) + this.tSteer, -1, 1);
    if (Math.abs(steer) > 0.05 && Math.abs(this.speed) > 8) {
      this.pa += steer * st.turn * dt * clamp(Math.abs(this.speed) / 150, 0.25, 1) * Math.sign(this.speed);
    }

    const prevX = this.px;
    const prevY = this.py;
    this.px = clamp(this.px + Math.cos(this.pa) * this.speed * dt, 26, SIZE - 26);
    this.py = clamp(this.py + Math.sin(this.pa) * this.speed * dt, 26, SIZE - 26);
    if (this.px === 26 || this.px === SIZE - 26 || this.py === 26 || this.py === SIZE - 26) this.speed *= 0.6;

    // ----- solid objects: buildings -----
    const CAR_R = 15;
    for (const b of this.world.buildings) {
      if (this.px < b.x - 90 || this.px > b.x + b.w + 90 || this.py < b.y - 90 || this.py > b.y + b.h + 90) continue;
      const cx = clamp(this.px, b.x, b.x + b.w);
      const cy = clamp(this.py, b.y, b.y + b.h);
      const dx = this.px - cx;
      const dy = this.py - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 >= CAR_R * CAR_R) continue;
      const hard = Math.abs(this.speed) > 130;
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        this.px = cx + (dx / d) * (CAR_R + 0.5);
        this.py = cy + (dy / d) * (CAR_R + 0.5);
      } else {
        // center got inside the rect — eject along the shallowest axis
        const pl = this.px - b.x;
        const pr = b.x + b.w - this.px;
        const pt = this.py - b.y;
        const pb = b.y + b.h - this.py;
        const m = Math.min(pl, pr, pt, pb);
        if (m === pl) this.px = b.x - CAR_R - 0.5;
        else if (m === pr) this.px = b.x + b.w + CAR_R + 0.5;
        else if (m === pt) this.py = b.y - CAR_R - 0.5;
        else this.py = b.y + b.h + CAR_R + 0.5;
      }
      this.speed *= hard ? -0.25 : 0.4;
      if (hard) {
        this.shake = Math.max(this.shake, 10);
        this.flashT = Math.max(this.flashT, 0.18);
        this.sfx.crash();
        if (this.carrying) {
          this.carrying.hp = Math.max(1, this.carrying.hp - 7);
          this.float(this.px, this.py - 56, "-7 ЗДОРОВЬЕ ПАЦИЕНТА", "#ff5063", 13);
        }
      } else if (Math.abs(this.speed) > 30) {
        this.sfx.bump();
        this.shake = Math.max(this.shake, 3);
      }
    }

    // ----- solid objects: trees -----
    for (const tr of this.world.trees) {
      const tdx = this.px - tr.x;
      const tdy = this.py - tr.y;
      const rad = tr.r * 0.55 + CAR_R - 4;
      const td2 = tdx * tdx + tdy * tdy;
      if (td2 >= rad * rad) continue;
      const td = Math.sqrt(td2);
      if (td > 0.001) {
        this.px = tr.x + (tdx / td) * rad;
        this.py = tr.y + (tdy / td) * rad;
      } else {
        this.px = tr.x + rad;
      }
      this.speed *= 0.55;
      this.sfx.bump();
      this.shake = Math.max(this.shake, 2);
    }

    // skids
    if (Math.abs(steer) > 0 && Math.abs(this.speed) > st.maxSpeed * 0.62) {
      const rx = this.px - Math.cos(this.pa) * 24;
      const ry = this.py - Math.sin(this.pa) * 24;
      this.skids.push({ x1: prevX - Math.cos(this.pa) * 24, y1: prevY - Math.sin(this.pa) * 24, x2: rx, y2: ry, t: 0 });
      if (this.skids.length > 360) this.skids.shift();
    }
    for (const s of this.skids) s.t += dt;
    while (this.skids.length && this.skids[0].t > 3.2) this.skids.shift();

    // exhaust + offroad dust
    if (up && this.fuel > 0 && Math.random() < 0.5) {
      this.puff(this.px - Math.cos(this.pa) * 38, this.py - Math.sin(this.pa) * 38, "smoke");
    }
    if (offroad && Math.abs(this.speed) > 60 && Math.random() < 0.6) {
      this.puff(this.px - Math.cos(this.pa) * 20 + rnd(-10, 10), this.py - Math.sin(this.pa) * 20 + rnd(-10, 10), "dust");
    }

    // ----- fuel -----
    const throttleUsed = this.fuel > 0 && up ? 1 : 0;
    this.fuel = clamp(this.fuel - dt * (0.35 + 1.25 * throttleUsed), 0, st.fuelMax);
    if (this.fuel <= 0 && !this.stallToasted) {
      this.stallToasted = true;
      this.cb.onToast({ text: "Бак пуст! Дотяни до АЗС (жёлтые метки)", kind: "bad" });
      this.sfx.deny();
    }

    // ----- horn -----
    this.hornT = Math.max(0, this.hornT - dt);
    this.hornCd = Math.max(0, this.hornCd - dt);
    if (hornKey && this.hornCd <= 0) {
      this.hornT = st.hornDur;
      this.hornCd = st.hornCd;
      this.sfx.horn();
      for (const c of this.cars) {
        if (dist(c.x, c.y, this.px, this.py) < st.hornRadius) c.yieldT = st.hornDur + 0.6;
      }
      this.ring(this.px, this.py, "#ffcf3f");
    }

    // ----- traffic -----
    this.updateCars(dt);
    this.carT += dt;
    const wantCars = Math.min(40, 24 + this.level * 3);
    if (this.carT > 1.2 && this.cars.length < wantCars) {
      this.carT = 0;
      this.spawnCar(false);
    }

    // ----- patients -----
    this.updatePatients(dt);

    // ----- powerups -----
    this.powerT -= dt;
    if (this.powerT <= 0 && this.powerups.length < 4) {
      this.powerT = 7;
      this.spawnPowerup();
    }
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.t += dt;
      if (p.t > 18) {
        this.powerups.splice(i, 1);
        continue;
      }
      if (dist(p.x, p.y, this.px, this.py) < 34) {
        this.collectPowerup(p);
        this.powerups.splice(i, 1);
      }
    }

    // ----- boarding / treatment / refuel -----
    this.updateStations(dt);

    // ----- camera -----
    const lookX = this.px + Math.cos(this.pa) * this.speed * 0.22;
    const lookY = this.py + Math.sin(this.pa) * this.speed * 0.22;
    const cl = 1 - Math.pow(0.001, dt);
    this.camX += (lookX - this.camX) * cl;
    this.camY += (lookY - this.camY) * cl;
    this.shake = Math.max(0, this.shake - dt * 26);
    this.flashT = Math.max(0, this.flashT - dt);

    // ----- particles / floaters -----
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 2.4 * dt;
      p.vy *= 1 - 2.4 * dt;
      if (p.kind === "confetti") p.vy += 260 * dt;
      if (p.life > p.max) this.particles.splice(i, 1);
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.t += dt;
      f.y -= 34 * dt;
      if (f.t > 1.6) this.floaters.splice(i, 1);
    }

    // ----- audio -----
    this.sfx.siren(!!this.carrying);
    this.sfx.engine(clamp(Math.abs(this.speed) / st.maxSpeed, 0, 1));
    if (this.carrying && this.carrying.hp < 32) {
      this.hbT -= dt;
      if (this.hbT <= 0) {
        this.hbT = 0.85;
        this.sfx.heartbeat();
      }
    }

    // ----- HUD sync -----
    this.hudAcc += dt;
    if (this.hudAcc >= 0.1) {
      this.hudAcc = 0;
      this.cb.onHud(this.snap());
    }
  }

  /**
   * HEADING-DRIVEN traffic. Every car behaves like a real driver:
   *  1) it has a target point (waypoint) — a point ahead on its lane, or the
   *     exit of the lane it is turning into;
   *  2) the body rotates toward that point at a BOUNDED rate (CAR_ROT_SPEED),
   *     shortest way — the angle can never snap;
   *  3) velocity is ALWAYS directed along the body heading — cars never slide
   *     sideways ("ice" movement is impossible);
   *  4) smart speed control: the sharper the upcoming turn, the slower the car
   *     goes; on straights it accelerates back to cruise.
   * Yielding to the ambulance horn is also pure steering: the target point
   * shifts to the roadside shoulder, the car pulls over, stops, and merges
   * back into its lane once the ambulance has passed.
   */
  private updateCars(dt: number) {
    for (const c of this.cars) {
      c.yieldT = Math.max(0, c.yieldT - dt);
      c.crashCd = Math.max(0, c.crashCd - dt);
      const d = DIRS[c.dir];

      // ---- 1) target point (the waypoint the "driver" aims at) ----
      let tpx: number;
      let tpy: number;
      if (c.turn) {
        // mid-maneuver: aim past the exit so the arc flows out smoothly
        const nd = DIRS[c.turn.dir];
        tpx = c.turn.tx + nd.x * 130;
        tpy = c.turn.ty + nd.y * 130;
      } else {
        // straight: a point ahead, snapped to the lane line — or to the OUTER
        // roadside shoulder while yielding. Shoulder = outer edge of the car's
        // own half: east/north drive the far half → edge RW-10; south/west
        // drive the near half → edge 10. Never the middle of the road.
        const vert = c.dir === 1 || c.dir === 3;
        const grid = Math.round((vert ? c.x : c.y) / B) * B;
        const shoulderOff = c.dir === 0 || c.dir === 3 ? RW - 10 : 10;
        const lineCoord = grid + (c.yieldT > 0 ? shoulderOff : c.lane);
        tpx = c.x + d.x * CAR_LOOKAHEAD;
        tpy = c.y + d.y * CAR_LOOKAHEAD;
        if (vert) tpx = lineCoord;
        else tpy = lineCoord;
      }

      // ---- 2) steering: bounded rotation rate, shortest path ----
      const targetAng = Math.atan2(tpy - c.y, tpx - c.x);
      c.ang = rotateToward(c.ang, targetAng, CAR_ROT_SPEED * dt);

      // ---- 3) smart speed: brake into curves, accelerate on straights ----
      const off = Math.abs(angDiff(c.ang, targetAng));
      let desired = c.cruise * (1 - 0.62 * clamp(off / 1.05, 0, 1));
      if (c.turn) desired = Math.min(desired, c.cruise * 0.55);

      // yield to the ambulance ahead / the horn / a car ahead
      const dToPlayer = dist(c.x, c.y, this.px, this.py);
      const aheadDot = (this.px - c.x) * d.x + (this.py - c.y) * d.y;
      const lateral = Math.abs((this.px - c.x) * d.y - (this.py - c.y) * d.x);
      let blocked = dToPlayer < 150 && aheadDot > 0 && lateral < 46;
      if (!blocked) {
        for (const o of this.cars) {
          if (o === c) continue;
          const od = dist(c.x, c.y, o.x, o.y);
          const oAhead = (o.x - c.x) * d.x + (o.y - c.y) * d.y;
          if (od < 52 && oAhead > 0) {
            blocked = true;
            break;
          }
        }
      }
      // anti-deadlock: a wedged car gently pushes through after a while
      if (blocked) {
        c.stuckT += dt;
        if (c.stuckT > 2.2) blocked = false;
      } else {
        c.stuckT = 0;
      }
      if (c.yieldT > 0 || blocked) desired = 0;

      const dv = desired - c.speed;
      c.speed += clamp(dv, -320 * dt, 110 * dt);

      // ---- 4) move strictly along the body heading — no sideways drift ----
      c.x += Math.cos(c.ang) * c.speed * dt;
      c.y += Math.sin(c.ang) * c.speed * dt;

      // maneuver ends once the exit point is passed
      if (c.turn) {
        const nd = DIRS[c.turn.dir];
        const proj = (c.x - c.turn.tx) * nd.x + (c.y - c.turn.ty) * nd.y;
        if (proj >= 0) {
          c.dir = c.turn.dir;
          c.lane = c.turn.lane;
          c.turn = null;
        }
      } else {
        this.checkGate(c);
      }

      // collision with ambulance (checked even mid-maneuver)
      const dd = dist(c.x, c.y, this.px, this.py);
      if (dd < 46) {
        const nx = (this.px - c.x) / (dd || 1);
        const ny = (this.py - c.y) / (dd || 1);
        const push = 46 - dd;
        this.px += nx * push * 0.7;
        this.py += ny * push * 0.7;
        c.x -= nx * push * 0.3;
        c.y -= ny * push * 0.3;
        if (Math.abs(this.speed) > 120 && c.crashCd <= 0) {
          c.crashCd = 1.2;
          this.crash();
        } else if (Math.abs(this.speed) > 40) {
          this.speed *= 0.82;
          if (c.crashCd <= 0) {
            c.crashCd = 0.5;
            this.sfx.bump();
            this.shake = Math.max(this.shake, 3);
          }
        } else {
          this.speed *= 0.9;
        }
      }
    }
  }

  /**
   * Intersection decision — fires exactly once per intersection (the car's
   * `gate` line). ~50% of cars turn onto a random side street, the rest go
   * straight, so traffic keeps flowing through the whole grid.
   */
  private checkGate(c: Car) {
    let hit = false;
    if (c.dir === 0) hit = c.x >= c.gate - 30;
    else if (c.dir === 1) hit = c.y >= c.gate - 30;
    else if (c.dir === 2) hit = c.x <= c.gate + 30;
    else hit = c.y <= c.gate + 30;
    if (!hit) return;

    const options = c.dir === 0 ? [0, 1, 3] : c.dir === 1 ? [1, 0, 2] : c.dir === 2 ? [2, 1, 3] : [3, 0, 2];
    const choice = Math.random() < 0.5 ? options[0] : options[1 + Math.floor(Math.random() * 2)];

    if (choice === options[0]) {
      // straight through: advance the gate to the next intersection
      c.gate += c.dir === 0 || c.dir === 1 ? B : -B;
      return;
    }

    // intersection center + exit point on the chosen road's lane
    const cx = c.dir === 0 || c.dir === 2 ? c.gate : Math.round(c.x / B) * B;
    const cy = c.dir === 1 || c.dir === 3 ? c.gate : Math.round(c.y / B) * B;
    const lane = laneFor(choice);
    let tx: number;
    let ty: number;
    if (choice === 0) {
      tx = cx + 34;
      ty = cy + lane;
      c.gate = (Math.floor(tx / B) + 1) * B;
    } else if (choice === 1) {
      tx = cx + lane;
      ty = cy + 34;
      c.gate = (Math.floor(ty / B) + 1) * B;
    } else if (choice === 2) {
      tx = cx - 34;
      ty = cy + lane;
      c.gate = Math.floor((tx - 0.01) / B) * B;
    } else {
      tx = cx + lane;
      ty = cy - 34;
      c.gate = Math.floor((ty - 0.01) / B) * B;
    }
    c.turn = { tx, ty, dir: choice, lane };
  }

  /** Next intersection grid line the car must cross, given position/dir. */
  private setGate(c: Car) {
    if (c.dir === 0) c.gate = (Math.floor(c.x / B) + 1) * B;
    else if (c.dir === 1) c.gate = (Math.floor(c.y / B) + 1) * B;
    else if (c.dir === 2) c.gate = Math.floor((c.x - 0.01) / B) * B;
    else c.gate = Math.floor((c.y - 0.01) / B) * B;
  }

  private crash() {
    this.speed *= -0.32;
    this.shake = Math.max(this.shake, 13);
    this.flashT = Math.max(this.flashT, 0.28);
    this.sfx.crash();
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x: this.px + rnd(-14, 14),
        y: this.py + rnd(-14, 14),
        vx: rnd(-160, 160),
        vy: rnd(-160, 160),
        life: 0,
        max: rnd(0.4, 0.9),
        size: rnd(3, 7),
        color: Math.random() < 0.5 ? "#ffd23f" : "#ff7a3c",
        kind: "spark",
      });
    }
    this.puff(this.px, this.py, "smoke");
    this.puff(this.px, this.py, "smoke");
    if (this.combo > 0) this.float(this.px, this.py - 40, "КОМБО СБРОШЕНО", "#ff8b98", 13);
    this.combo = 0;
    if (this.carrying) {
      this.carrying.hp = Math.max(1, this.carrying.hp - 11);
      this.float(this.px, this.py - 60, "-11 ЗДОРОВЬЕ ПАЦИЕНТА", "#ff5063", 14);
    }
  }

  private updatePatients(dt: number) {
    const st = this.stats;
    // tension ramps with every shift AND with raw time survived:
    // patients bleed faster, so upgrades and speed become essential
    const drainScale = 1 + (this.level - 1) * 0.1 + this.time * 0.0022;

    // spawn logic: the dispatcher keeps ONE active call at a time (from shift 6
    // on — two), so calls never pile up on the player. While a patient waits,
    // nothing new appears; the next call arrives a couple of seconds AFTER the
    // current patient is picked up (or lost), exactly as requested.
    const maxWaiting = this.level >= 6 ? 2 : 1;
    if (this.patients.length >= maxWaiting) {
      this.spawnT = 2.4; // pre-armed: the next call comes right after boarding
    } else {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        this.spawnT = 2.4;
        this.spawnPatient(false);
      }
    }

    for (let i = this.patients.length - 1; i >= 0; i--) {
      const p = this.patients[i];
      p.hp -= p.drain * st.waitDrain * drainScale * dt;
      if (p.hp <= 0) {
        this.patients.splice(i, 1);
        this.patientDied(p, false);
      }
    }

    if (this.carrying) {
      this.carryT += dt;
      this.carrying.hp -= this.carrying.drain * 0.55 * st.carryDrain * drainScale * dt;
      if (this.carrying.hp <= 0) {
        const p = this.carrying;
        this.carrying = null;
        this.patientDied(p, true);
      }
    }
  }

  private patientDied(p: Patient, wasCarried: boolean) {
    this.lives--;
    this.combo = 0;
    this.shake = Math.max(this.shake, 14);
    this.flashT = 0.5;
    this.sfx.death();
    this.sfx.siren(false);
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: wasCarried ? this.px : p.x,
        y: wasCarried ? this.py : p.y,
        vx: rnd(-60, 60),
        vy: rnd(-120, -30),
        life: 0,
        max: rnd(0.7, 1.2),
        size: rnd(4, 8),
        color: "rgba(160,180,220,0.7)",
        kind: "smoke",
      });
    }
    this.cb.onToast({
      text: wasCarried ? `${p.name} погиб в дороге...` : `${p.name} не дождался помощи...`,
      kind: "bad",
    });
    this.emitHud();
    if (this.lives <= 0) this.gameOver();
  }

  private updateStations(dt: number) {
    const st = this.stats;
    const slow = Math.abs(this.speed) < 65;

    // boarding
    let nearest: Patient | null = null;
    let nd = 1e9;
    for (const p of this.patients) {
      const d = dist(p.x, p.y, this.px, this.py);
      if (d < nd) {
        nd = d;
        nearest = p;
      }
    }
    if (!this.carrying && nearest && nd < 70) {
      this.boardTarget = nearest;
      if (slow) {
        this.boardProg += dt / 1.35;
        if (this.boardProg >= 1) {
          this.carrying = nearest;
          this.carryT = 0;
          this.patients = this.patients.filter((p) => p !== nearest);
          this.boardProg = 0;
          this.boardTarget = null;
          this.sfx.pickup();
          this.ring(this.px, this.py, "#3ddc6b");
          this.cb.onToast({ text: `${nearest.name} в машине: ${nearest.label}! В больницу!`, kind: "good" });
          this.emitHud();
        }
      } else {
        this.boardProg = Math.max(0, this.boardProg - dt * 2);
        this.fastWarnT -= dt;
        if (this.fastWarnT <= 0) {
          this.fastWarnT = 1.4;
          this.float(this.px, this.py - 52, "ЗАМЕДЛИСЬ!", "#ffcf3f", 14);
        }
      }
    } else {
      this.boardProg = Math.max(0, this.boardProg - dt * 3);
      this.boardTarget = null;
    }

    // treatment at hospital
    const h = this.world.hospital;
    const inBay = dist(this.px, this.py, h.bayX, h.bayY) < h.bayR;
    if (this.carrying && inBay) {
      if (slow) {
        this.treatProg += dt / 1.9;
        if (this.treatProg >= 1) this.deliver();
      } else {
        this.treatProg = Math.max(0, this.treatProg - dt * 2);
      }
    } else {
      this.treatProg = Math.max(0, this.treatProg - dt * 3);
    }

    // refuel
    let atGas = false;
    for (const g of this.world.gas) {
      if (dist(this.px, this.py, g.x, g.y) < g.r && slow) {
        atGas = true;
        if (this.fuel < st.fuelMax) {
          const add = Math.min(34 * dt, st.fuelMax - this.fuel);
          const cost = Math.ceil(add * 1.6);
          if (this.money >= cost) this.money -= cost;
          this.fuel += add;
          this.fuelProg = clamp(this.fuel / st.fuelMax, 0, 1);
          this.fuelTick -= dt;
          if (this.fuelTick <= 0) {
            this.fuelTick = 0.35;
            this.sfx.fuel();
          }
          if (this.fuel >= st.fuelMax - 0.5) {
            this.stallToasted = false;
            this.cb.onToast({ text: "Бак полон! В путь", kind: "info" });
          }
        }
      }
    }
    if (!atGas) this.fuelProg = 0;
  }

  private deliver() {
    const p = this.carrying!;
    this.treatProg = 0;
    this.carrying = null;
    this.combo++;
    this.rescued++;
    const comboMult = 1 + Math.min(this.combo, 10) * 0.1;
    let reward = Math.round((130 * p.mult + p.hp * 2.2) * comboMult);
    if (this.carryT < 30) reward += 90;
    this.money += reward;
    this.score += reward;
    this.sfx.cash();
    this.sfx.pickup();
    this.float(this.px, this.py - 60, `+${reward}₽`, "#5dff9e", 20);
    this.float(this.px, this.py - 84, `${p.name} СПАСЁН!`, "#ffffff", 15);
    if (this.carryT < 30) this.float(this.px, this.py - 106, "БЫСТРАЯ ДОСТАВКА +90", "#ffcf3f", 12);
    for (let i = 0; i < 26; i++) {
      this.particles.push({
        x: this.px + rnd(-20, 20),
        y: this.py + rnd(-20, 20),
        vx: rnd(-180, 180),
        vy: rnd(-260, -60),
        life: 0,
        max: rnd(0.7, 1.3),
        size: rnd(4, 7),
        color: ["#ff3b4e", "#ffcf3f", "#3ddc6b", "#4da3ff", "#ff7ad9"][i % 5],
        kind: "confetti",
      });
    }
    const newLevel = 1 + Math.floor(this.rescued / 4);
    if (newLevel > this.level) {
      this.level = newLevel;
      this.sfx.levelup();
      this.cb.onToast({ text: `Смена ${this.level}: вызовы чаще, больные тяжелее!`, kind: "info" });
    }
    this.emitHud();
  }

  private collectPowerup(p: Powerup) {
    this.sfx.powerup();
    this.ring(p.x, p.y, "#ffffff");
    if (p.kind === "med") {
      if (this.carrying) {
        this.carrying.hp = Math.min(100, this.carrying.hp + 24);
        this.float(p.x, p.y - 30, "+24 ЗДОРОВЬЕ", "#5dff9e", 15);
      } else {
        this.score += 150;
        this.float(p.x, p.y - 30, "+150 ОЧКОВ", "#9fd0ff", 14);
      }
    } else if (p.kind === "fuel") {
      this.fuel = clamp(this.fuel + 30, 0, this.stats.fuelMax);
      this.float(p.x, p.y - 30, "+30 ТОПЛИВО", "#ffcf3f", 15);
    } else {
      this.score += 250;
      this.money += 50;
      this.float(p.x, p.y - 30, "+250 ОЧКОВ, +50₽", "#ffe27a", 14);
    }
  }

  private gameOver() {
    this.state = "over";
    this.sfx.siren(false);
    this.sfx.engine(0);
    this.sfx.gameover();
    this.emitHud();
    this.cb.onGameOver({
      score: this.score,
      rescued: this.rescued,
      moneyDelta: this.money - this.startMoney,
      timeSec: Math.floor(this.time),
      level: this.level,
    });
  }

  // ----- spawners -----
  private spawnPatient(initial: boolean) {
    const blocksN = SIZE / B;
    const walk = RW + SIDE / 2; // middle of the sidewalk
    for (let attempt = 0; attempt < 20; attempt++) {
      const bi = Math.floor(rnd(0, blocksN));
      const bj = Math.floor(rnd(0, blocksN));
      // patients wait on sidewalks along one of the four block edges
      const side = Math.floor(rnd(0, 4));
      const along = rnd(RW + 40, B - 40);
      let x: number;
      let y: number;
      if (side === 0) {
        x = bi * B + along;
        y = bj * B + walk;
      } else if (side === 1) {
        x = bi * B + along;
        y = (bj + 1) * B - SIDE / 2;
      } else if (side === 2) {
        x = bi * B + walk;
        y = bj * B + along;
      } else {
        x = (bi + 1) * B - SIDE / 2;
        y = bj * B + along;
      }
      if (x < 60 || x > SIZE - 60 || y < 60 || y > SIZE - 60) continue;
      // pressure ramp-up: calls appear further and further away as the shift drags on
      const minD = initial ? 0 : Math.min(1700, 460 + (this.level - 1) * 170 + this.time * 1.6);
      const need = attempt > 12 ? 0 : minD;
      if (!initial && dist(x, y, this.px, this.py) < need) continue;
      if (this.patients.some((p) => dist(p.x, p.y, x, y) < 160)) continue;
      if (this.world.trees.some((t) => dist(t.x, t.y, x, y) < 46)) continue;
      if (this.world.buildings.some((b) => x > b.x - 30 && x < b.x + b.w + 30 && y > b.y - 30 && y < b.y + b.h + 30)) continue;
      const d = DIAGS[Math.floor(Math.random() * Math.min(DIAGS.length, 3 + this.level))];
      const p: Patient = {
        id: this.patientId++,
        x,
        y,
        name: NAMES[Math.floor(Math.random() * NAMES.length)],
        label: d.label,
        drain: d.drain,
        mult: d.mult,
        // later shifts start with weaker patients — upgrades become mandatory
        hp: clamp(105 - (this.level - 1) * 8, 55, 100),
        seed: Math.random(),
        born: this.time,
      };
      this.patients.push(p);
      if (!initial) {
        this.cb.onToast({ text: `Новый вызов: ${p.name}, ${p.label}`, kind: "info" });
        this.sfx.click();
      }
      this.emitHud();
      return;
    }
  }

  private spawnCar(initial: boolean) {
    for (let attempt = 0; attempt < 15; attempt++) {
      const grid = Math.floor(rnd(0, SIZE / B + 1)) * B;
      const horiz = Math.random() < 0.5;
      const along = rnd(60, SIZE - 60);
      let x: number;
      let y: number;
      let dir: number;
      if (horiz) {
        dir = Math.random() < 0.5 ? 0 : 2;
        x = along;
        y = grid + laneFor(dir);
      } else {
        dir = Math.random() < 0.5 ? 1 : 3;
        y = along;
        x = grid + laneFor(dir);
      }
      if (x < 40 || x > SIZE - 40 || y < 40 || y > SIZE - 40) continue;
      if (dist(x, y, this.px, this.py) < (initial ? 420 : 560)) continue;
      if (this.cars.some((c) => dist(c.x, c.y, x, y) < 90)) continue;
      const car: Car = {
        x,
        y,
        dir,
        lane: horiz ? y - grid : x - grid,
        speed: rnd(60, 110),
        cruise: rnd(95, 150),
        color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
        yieldT: 0,
        crashCd: 0,
        ang: dirAngle(dir),
        gate: 0,
        turn: null,
        stuckT: 0,
      };
      this.setGate(car);
      this.cars.push(car);
      return;
    }
  }

  private spawnPowerup() {
    for (let attempt = 0; attempt < 15; attempt++) {
      const x = rnd(120, SIZE - 120);
      const y = rnd(120, SIZE - 120);
      if (!isOnRoad(x, y)) continue;
      if (dist(x, y, this.px, this.py) < 320) continue;
      const r = Math.random();
      const kind: Powerup["kind"] = r < 0.38 ? "med" : r < 0.72 ? "fuel" : "star";
      this.powerups.push({ x, y, kind, t: 0 });
      return;
    }
  }

  // ----- fx helpers -----
  private puff(x: number, y: number, kind: "smoke" | "dust") {
    this.particles.push({
      x,
      y,
      vx: rnd(-24, 24),
      vy: rnd(-24, 24),
      life: 0,
      max: rnd(0.5, 1),
      size: rnd(4, 9),
      color: kind === "smoke" ? "rgba(120,130,150,0.5)" : "rgba(150,120,70,0.4)",
      kind,
    });
  }

  private ring(x: number, y: number, color: string) {
    this.particles.push({ x, y, vx: 0, vy: 0, life: 0, max: 0.5, size: 10, color, kind: "ring" });
  }

  private float(x: number, y: number, text: string, color: string, size: number) {
    this.floaters.push({ x, y, text, color, t: 0, size });
  }

  private emitHud() {
    this.cb.onHud(this.snap());
  }

  private snap(): HudSnap {
    let nearestDist: number | null = null;
    if (!this.carrying && this.patients.length) {
      nearestDist = Math.min(...this.patients.map((p) => dist(p.x, p.y, this.px, this.py)));
    }
    return {
      score: this.score,
      money: this.money,
      combo: this.combo,
      comboMult: 1 + Math.min(this.combo, 10) * 0.1,
      fuel: this.fuel,
      fuelMax: this.stats.fuelMax,
      lives: this.lives,
      level: this.level,
      rescued: this.rescued,
      speed: Math.round(Math.abs(this.speed) * 0.35),
      night: this.night01(),
      carrying: this.carrying
        ? { name: this.carrying.name, label: this.carrying.label, hp: this.carrying.hp, carryT: this.carryT }
        : null,
      nearestDist,
      targetKind: this.carrying ? "hospital" : this.patients.length ? "patient" : null,
      hornCd01: this.hornCd / this.stats.hornCd,
      sirenOn: !!this.carrying,
    };
  }

  private night01() {
    return clamp(0.5 - Math.cos(this.dayT * Math.PI * 2) * 0.72, 0, 1);
  }

  // ================= RENDER =================
  private render() {
    const ctx = this.ctx;
    const dpr = this.dpr;
    const vw = this.canvas.width / dpr;
    const vh = this.canvas.height / dpr;
    const night = this.night01();
    const shX = this.shake > 0 ? rnd(-this.shake, this.shake) : 0;
    const shY = this.shake > 0 ? rnd(-this.shake, this.shake) : 0;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0a0f1e";
    ctx.fillRect(0, 0, vw, vh);

    ctx.save();
    ctx.translate(vw / 2 + shX, vh / 2 + shY);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.camX, -this.camY);

    const viewL = this.camX - vw / 2 / this.zoom - 60;
    const viewT = this.camY - vh / 2 / this.zoom - 60;
    const viewW = vw / this.zoom + 120;
    const viewH = vh / this.zoom + 120;
    const inView = (x: number, y: number, pad = 90) =>
      x > viewL - pad && x < viewL + viewW + pad && y > viewT - pad && y < viewT + viewH + pad;

    // ground pattern
    if (this.pattern) {
      ctx.fillStyle = this.pattern;
      ctx.fillRect(viewL, viewT, viewW, viewH);
    }

    // parks
    for (const p of this.world.parks) {
      if (!inView(p.x + p.w / 2, p.y + p.h / 2, p.w)) continue;
      ctx.fillStyle = "#2c7a4b";
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 3;
      ctx.strokeRect(p.x + 4, p.y + 4, p.w - 8, p.h - 8);
      // flower dots
      let n = Math.floor(p.seed * 999);
      for (let i = 0; i < 26; i++) {
        n = (n * 16807 + 11) % 2147483647;
        const fx = p.x + 20 + (n % (p.w - 40));
        n = (n * 16807 + 11) % 2147483647;
        const fy = p.y + 20 + (n % (p.h - 40));
        ctx.fillStyle = i % 3 === 0 ? "#ffd9e8" : i % 3 === 1 ? "#fff3b0" : "#d0f0ff";
        ctx.fillRect(fx, fy, 4, 4);
      }
    }

    // skid marks
    ctx.lineCap = "round";
    for (const s of this.skids) {
      ctx.strokeStyle = `rgba(20,22,28,${0.4 * (1 - s.t / 3.2)})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }

    // hospital bay
    const h = this.world.hospital;
    if (inView(h.bayX, h.bayY, 160)) {
      const bp = 0.6 + Math.sin(this.time * 4) * 0.4;
      ctx.strokeStyle = this.carrying ? `rgba(37,232,200,${0.4 + bp * 0.5})` : "rgba(230,240,255,0.5)";
      ctx.lineWidth = 4;
      ctx.setLineDash([14, 10]);
      ctx.beginPath();
      ctx.arc(h.bayX, h.bayY, h.bayR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.arc(h.bayX, h.bayY, h.bayR - 6, 0, Math.PI * 2);
      ctx.fill();
      drawCross(ctx, h.bayX, h.bayY - 8, 30, this.carrying ? "#25e8c8" : "#ff3b4e");
      ctx.font = "15px 'Russo One'";
      ctx.textAlign = "center";
      ctx.fillStyle = this.carrying ? "#25e8c8" : "#e8eefc";
      ctx.fillText("ПРИЁМ", h.bayX, h.bayY + 30);
    }

    // gas zones
    for (const g of this.world.gas) {
      if (!inView(g.x, g.y, 140)) continue;
      const low = this.fuel < this.stats.fuelMax * 0.32;
      const gp = 0.6 + Math.sin(this.time * 5) * 0.4;
      ctx.strokeStyle = low ? `rgba(255,207,63,${0.45 + gp * 0.45})` : "rgba(255,207,63,0.4)";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 9]);
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // pump detail
      ctx.fillStyle = "#c81e33";
      ctx.fillRect(g.pump.x + 4, g.pump.y + 6, g.pump.w - 8, 8);
      ctx.font = "13px 'Russo One'";
      ctx.textAlign = "center";
      ctx.fillStyle = "#171a22";
      ctx.fillText("АЗС", g.pump.x + g.pump.w / 2, g.pump.y + 34);
      // sign
      ctx.fillStyle = "#ffcf3f";
      rr(ctx, g.canopy.x + g.canopy.w - 56, g.canopy.y - 26, 52, 22, 4);
      ctx.fill();
      ctx.fillStyle = "#171a22";
      ctx.fillText("2₽/Л", g.canopy.x + g.canopy.w - 30, g.canopy.y - 10);
    }

    // powerups
    for (const p of this.powerups) {
      if (!inView(p.x, p.y)) continue;
      const bobY = Math.sin(p.t * 4) * 4;
      const fade = p.t > 15 ? 1 - (p.t - 15) / 3 : 1;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y + bobY);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(0, 12 - bobY, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      if (p.kind === "med") {
        ctx.fillStyle = "#fff";
        rr(ctx, -11, -11, 22, 22, 5);
        ctx.fill();
        ctx.strokeStyle = "#c9d4e8";
        ctx.lineWidth = 2;
        ctx.stroke();
        drawCross(ctx, 0, 0, 13, "#ff3b4e");
      } else if (p.kind === "fuel") {
        ctx.fillStyle = "#ffcf3f";
        rr(ctx, -10, -12, 20, 24, 4);
        ctx.fill();
        ctx.strokeStyle = "#8a6a00";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#8a6a00";
        ctx.fillRect(-6, -6, 12, 4);
        ctx.fillRect(8, -8, 4, 10);
      } else {
        ctx.fillStyle = "#ffe27a";
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? 13 : 6;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#b58a00";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    }

    // patients
    for (const p of this.patients) {
      if (!inView(p.x, p.y, 120)) continue;
      drawPatient(ctx, p.x, p.y, this.time, p.hp / 100, p.seed, p.hp < 35);
      ctx.font = "600 11px Rubik";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(10,14,26,0.75)";
      rr(ctx, p.x - 40, p.y + 36, 80, 16, 5);
      ctx.fill();
      ctx.fillStyle = "#ffd9de";
      ctx.fillText(p.label, p.x, p.y + 48);
    }

    // trees
    for (const t of this.world.trees) {
      if (!inView(t.x, t.y)) continue;
      drawTree(ctx, t.x, t.y, t.r, t.seed);
    }

    // buildings
    for (const b of this.world.buildings) {
      if (!inView(b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h))) continue;
      drawBuilding(ctx, b, night, this.time, b === this.world.hospital.bld);
    }

    // lamps
    for (const l of this.world.lamps) {
      if (!inView(l.x, l.y)) continue;
      ctx.fillStyle = "#5a6478";
      ctx.beginPath();
      ctx.arc(l.x, l.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = night > 0.3 ? "#ffe9a8" : "#c8d2e4";
      ctx.beginPath();
      ctx.arc(l.x, l.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // traffic (visual heading is smoothed, so turns look like real maneuvers)
    for (const c of this.cars) {
      if (!inView(c.x, c.y)) continue;
      drawTrafficCar(ctx, c.x, c.y, c.ang, c.color, c.speed < c.cruise * 0.4, night);
    }

    // horn shockwave
    if (this.hornT > 0) {
      const a = this.hornT / this.stats.hornDur;
      ctx.strokeStyle = `rgba(255,207,63,${a * 0.7})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(this.px, this.py, this.stats.hornRadius * (1.15 - a * 0.15), 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,207,63,${a * 0.35})`;
      ctx.beginPath();
      ctx.arc(this.px, this.py, this.stats.hornRadius * 0.6 * (1.15 - a * 0.15), 0, Math.PI * 2);
      ctx.stroke();
    }

    // ambulance
    const phase = (this.time * 1.6) % 1;
    const braking =
      (this.keys.has("arrowdown") || this.keys.has("s") || this.keys.has("ы") || this.tBrake > 0.25) &&
      this.speed > 12;
    drawAmbulance(ctx, this.px, this.py, this.pa, this.skin, phase, !!this.carrying, braking, night);

    // carried patient indicator above ambulance
    if (this.carrying) {
      const bx = this.px;
      const by = this.py - 46;
      ctx.fillStyle = "rgba(8,12,24,0.8)";
      rr(ctx, bx - 30, by - 8, 60, 12, 5);
      ctx.fill();
      const hp01 = this.carrying.hp / 100;
      ctx.fillStyle = hp01 > 0.5 ? "#3ddc6b" : hp01 > 0.25 ? "#ffcf3f" : "#ff2038";
      if (hp01 > 0.02) {
        rr(ctx, bx - 28, by - 6, 56 * hp01, 8, 3);
        ctx.fill();
      }
    }

    // progress rings
    this.progressRing(this.boardProg, this.boardTarget?.x ?? this.px, this.boardTarget?.y ?? this.py, "#3ddc6b", "ПОСАДКА");
    if (this.carrying && dist(this.px, this.py, h.bayX, h.bayY) < h.bayR) {
      this.progressRing(this.treatProg, this.px, this.py, "#25e8c8", "ЛЕЧЕНИЕ");
    }
    for (const g of this.world.gas) {
      if (this.fuelProg > 0 && dist(this.px, this.py, g.x, g.y) < g.r) {
        this.progressRing(this.fuelProg, this.px, this.py - 0.001, "#ffcf3f", "ЗАПРАВКА");
      }
    }

    // particles
    for (const p of this.particles) {
      const a = 1 - p.life / p.max;
      if (p.kind === "ring") {
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = a;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + p.life * 160, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (p.kind === "confetti") {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size * 0.7);
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = a * 0.9;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.kind === "smoke" || p.kind === "dust" ? 1 + p.life * 1.6 : a), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // floaters
    for (const f of this.floaters) {
      const a = f.t < 0.15 ? f.t / 0.15 : 1 - Math.max(0, (f.t - 1) / 0.6);
      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.font = `${f.size}px 'Russo One'`;
      ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(8,10,20,0.85)";
      ctx.lineWidth = 4;
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }

    // ----- night lighting -----
    if (night > 0.02) {
      ctx.fillStyle = `rgba(6,10,28,${0.6 * night})`;
      ctx.fillRect(viewL, viewT, viewW, viewH);
      ctx.globalCompositeOperation = "lighter";
      // headlights
      for (const side of [-11, 11]) {
        const hx = this.px + Math.cos(this.pa) * 40 - Math.sin(this.pa) * side;
        const hy = this.py + Math.sin(this.pa) * 40 + Math.cos(this.pa) * side;
        const ex = hx + Math.cos(this.pa) * 190;
        const ey = hy + Math.sin(this.pa) * 190;
        const grad = ctx.createRadialGradient(ex, ey, 10, ex, ey, 150);
        grad.addColorStop(0, `rgba(255,240,180,${0.28 * night})`);
        grad.addColorStop(1, "rgba(255,240,180,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ex, ey, 150, 0, Math.PI * 2);
        ctx.fill();
      }
      // siren glow
      if (this.carrying) {
        const col = phase < 0.5 ? "255,45,64" : "46,107,255";
        const grad = ctx.createRadialGradient(this.px, this.py, 5, this.px, this.py, 130);
        grad.addColorStop(0, `rgba(${col},${0.4 * night})`);
        grad.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.px, this.py, 130, 0, Math.PI * 2);
        ctx.fill();
      }
      // lamp pools
      for (const l of this.world.lamps) {
        if (!inView(l.x, l.y, 120)) continue;
        const grad = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, 95);
        grad.addColorStop(0, `rgba(255,226,150,${0.3 * night})`);
        grad.addColorStop(1, "rgba(255,226,150,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(l.x, l.y, 95, 0, Math.PI * 2);
        ctx.fill();
      }
      // patient beacons
      for (const p of this.patients) {
        if (!inView(p.x, p.y, 100)) continue;
        const grad = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 70);
        grad.addColorStop(0, `rgba(255,120,130,${0.3 * night})`);
        grad.addColorStop(1, "rgba(255,120,130,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 70, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }

    ctx.restore();

    // ================= screen space =================
    // direction arrow to target
    const target = this.carrying
      ? { x: h.bayX, y: h.bayY, kind: "hospital" as const }
      : this.nearestPatient();
    if (target) {
      const d = dist(this.px, this.py, target.x, target.y);
      const ang = Math.atan2(target.y - this.py, target.x - this.px);
      const col = target.kind === "hospital" ? "#25e8c8" : "#ff3b4e";
      ctx.save();
      ctx.translate(vw / 2 + shX, vh / 2 + shY);
      const pulse = 1 + Math.sin(this.time * 6) * 0.08;
      ctx.rotate(ang);
      ctx.translate(64 * pulse, 0);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-8, -11);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-8, 11);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.rotate(-ang);
      ctx.font = "13px 'Russo One'";
      ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(8,10,20,0.85)";
      ctx.lineWidth = 4;
      const meters = `${Math.round(d * 0.2 / 5) * 5} м`;
      ctx.strokeText(meters, 0, 96);
      ctx.fillStyle = col;
      ctx.fillText(meters, 0, 96);
      ctx.restore();
    }

    // red damage flash
    if (this.flashT > 0) {
      ctx.fillStyle = `rgba(255,32,56,${this.flashT * 0.45})`;
      ctx.fillRect(0, 0, vw, vh);
    }

    // vignette
    const vg = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.42, vw / 2, vh / 2, Math.max(vw, vh) * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(2,4,12,0.55)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, vw, vh);

    // minimap
    this.drawMinimap(vw, vh);

    // horn cooldown pip
    const hx0 = 18;
    const hy0 = vh - 52;
    ctx.fillStyle = "rgba(8,13,28,0.85)";
    rr(ctx, hx0, hy0, 150, 36, 8);
    ctx.fill();
    ctx.strokeStyle = "#2a3f73";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = "11px 'Russo One'";
    ctx.textAlign = "left";
    ctx.fillStyle = "#8fa0c8";
    ctx.fillText("ГУДОК [SPACE]", hx0 + 10, hy0 + 15);
    ctx.fillStyle = "#0a1122";
    rr(ctx, hx0 + 10, hy0 + 21, 130, 7, 3);
    ctx.fill();
    const ready = this.hornCd <= 0;
    ctx.fillStyle = ready ? "#ffcf3f" : "#4a567a";
    const cdw = ready ? 130 : 130 * (1 - this.hornCd / this.stats.hornCd);
    if (cdw > 1) {
      rr(ctx, hx0 + 10, hy0 + 21, cdw, 7, 3);
      ctx.fill();
    }
  }

  private progressRing(prog: number, x: number, y: number, color: string, label: string) {
    if (prog <= 0.001) return;
    const ctx = this.ctx;
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(x, y, 44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 44, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(prog, 0, 1));
    ctx.stroke();
    ctx.font = "12px 'Russo One'";
    ctx.textAlign = "center";
    ctx.strokeStyle = "rgba(8,10,20,0.85)";
    ctx.lineWidth = 4;
    ctx.strokeText(label, x, y - 54);
    ctx.fillStyle = color;
    ctx.fillText(label, x, y - 54);
  }

  private nearestPatient(): { x: number; y: number; kind: "patient" } | null {
    let best: Patient | null = null;
    let bd = 1e9;
    for (const p of this.patients) {
      const d = dist(p.x, p.y, this.px, this.py);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best ? { x: best.x, y: best.y, kind: "patient" } : null;
  }

  private drawMinimap(vw: number, vh: number) {
    const ctx = this.ctx;
    const S = 176;
    const mx = vw - S - 14;
    const my = vh - S - 14;
    ctx.save();
    ctx.globalAlpha = 0.94;
    ctx.drawImage(this.world.minimap, mx, my, S, S);
    ctx.globalAlpha = 1;
    const k = S / SIZE;
    // patients blink
    const blink = Math.sin(this.time * 7) > -0.3;
    if (blink) {
      for (const p of this.patients) {
        ctx.fillStyle = p.hp < 35 ? "#ff2038" : "#ffcf3f";
        ctx.beginPath();
        ctx.arc(mx + p.x * k, my + p.y * k, p.hp < 35 ? 4 : 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // ambulance
    ctx.save();
    ctx.translate(mx + this.px * k, my + this.py * k);
    ctx.rotate(this.pa);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // target ring
    const t = this.carrying
      ? { x: this.world.hospital.bayX, y: this.world.hospital.bayY }
      : this.nearestPatient();
    if (t) {
      ctx.strokeStyle = this.carrying ? "#25e8c8" : "#ff3b4e";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(mx + t.x * k, my + t.y * k, 6 + Math.sin(this.time * 6) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = "#2a3f73";
    ctx.lineWidth = 2;
    ctx.strokeRect(mx, my, S, S);
    ctx.font = "10px 'Russo One'";
    ctx.textAlign = "left";
    ctx.fillStyle = "#8fa0c8";
    ctx.fillText("КАРТА ГОРОДА", mx + 2, my - 5);
    ctx.restore();
  }
}
