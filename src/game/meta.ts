// ---- meta progression: upgrades, skins, achievements, persistence ----

export interface Upgrades {
  engine: number;
  brake: number;
  medkit: number;
  tank: number;
  siren: number;
}

export interface MetaState {
  money: number;
  best: number;
  savedTotal: number;
  totalShifts: number;
  totalEarned: number;
  bestTimeShift: number; // seconds survived in one shift
  bestRescuedShift: number; // patients saved in one shift
  upgrades: Upgrades;
  skin: string;
  muted: boolean;
  achv: string[]; // unlocked achievement ids
}

export interface UpgradeDef {
  key: keyof Upgrades;
  name: string;
  desc: string;
  costs: number[];
  icon: "engine" | "brake" | "medkit" | "tank" | "siren";
}

export const MAX_LVL = 4;

export const UPGRADE_DEFS: UpgradeDef[] = [
  {
    key: "engine",
    name: "Двигатель",
    desc: "Максимальная скорость и разгон машины",
    costs: [360, 840, 1680, 3120],
    icon: "engine",
  },
  {
    key: "brake",
    name: "Тормоза и руль",
    desc: "Торможение и манёвренность на поворотах",
    costs: [300, 720, 1440, 2640],
    icon: "brake",
  },
  {
    key: "medkit",
    name: "Медоборудование",
    desc: "Пациенты теряют здоровье медленнее",
    costs: [420, 960, 1800, 3360],
    icon: "medkit",
  },
  {
    key: "tank",
    name: "Топливный бак",
    desc: "Больше бензина — дольше смена без заправки",
    costs: [240, 600, 1200, 2280],
    icon: "tank",
  },
  {
    key: "siren",
    name: "Сирена-гудок",
    desc: "Гудок дольше действует и быстрее перезаряжается",
    costs: [300, 780, 1560, 2880],
    icon: "siren",
  },
];

// ================= ACHIEVEMENTS =================
export type Metric = "rescuedShift" | "rescuedTotal" | "shifts" | "earned" | "timeShift";

export interface AchvDef {
  id: string;
  name: string;
  desc: string;
  metric: Metric;
  target: number;
  reward: number;
}

export const ACHV: AchvDef[] = [
  { id: "r1", name: "Первая помощь", desc: "Спаси 1 пациента за смену", metric: "rescuedShift", target: 1, reward: 100 },
  { id: "r2", name: "Фельдшер", desc: "Спаси 6 пациентов за смену", metric: "rescuedShift", target: 6, reward: 300 },
  { id: "r3", name: "Врач по вызову", desc: "Спаси 10 пациентов за смену", metric: "rescuedShift", target: 10, reward: 600 },
  { id: "r4", name: "Легенда службы 03", desc: "Спаси 15 пациентов за смену", metric: "rescuedShift", target: 15, reward: 1200 },
  { id: "t1", name: "Первая смена", desc: "Отработай 1 смену", metric: "shifts", target: 1, reward: 100 },
  { id: "t2", name: "Постоянный график", desc: "Отработай 5 смен", metric: "shifts", target: 5, reward: 400 },
  { id: "t3", name: "Ветеран города", desc: "Отработай 15 смен — открывает скин «Божья коровка»", metric: "shifts", target: 15, reward: 900 },
  { id: "t4", name: "Спаситель города", desc: "Отработай 30 смен", metric: "shifts", target: 30, reward: 2000 },
  { id: "s1", name: "Первая десятка", desc: "Спаси 10 пациентов за всё время", metric: "rescuedTotal", target: 10, reward: 200 },
  { id: "s2", name: "Полсотни жизней", desc: "Спаси 50 пациентов — открывает скин «Зебра»", metric: "rescuedTotal", target: 50, reward: 800 },
  { id: "s3", name: "Сотня спасённых", desc: "Спаси 100 пациентов за всё время", metric: "rescuedTotal", target: 100, reward: 2000 },
  { id: "m1", name: "Первая зарплата", desc: "Заработай 1 000₽ за всё время", metric: "earned", target: 1000, reward: 150 },
  { id: "m2", name: "Состоятельный", desc: "Заработай 5 000₽ за всё время", metric: "earned", target: 5000, reward: 500 },
  { id: "m3", name: "Магнат скорой", desc: "Заработай 15 000₽ — открывает скин «Тигр»", metric: "earned", target: 15000, reward: 1500 },
  { id: "c1", name: "Марафонец", desc: "Продержись 3 минуты за смену", metric: "timeShift", target: 180, reward: 250 },
  { id: "c2", name: "Выносливый", desc: "Продержись 6 минут за смену", metric: "timeShift", target: 360, reward: 600 },
  { id: "c3", name: "Железные нервы", desc: "Продержись 10 минут за смену", metric: "timeShift", target: 600, reward: 1500 },
];

export function metricValue(m: MetaState, k: Metric): number {
  switch (k) {
    case "rescuedShift":
      return m.bestRescuedShift;
    case "rescuedTotal":
      return m.savedTotal;
    case "shifts":
      return m.totalShifts;
    case "earned":
      return m.totalEarned;
    case "timeShift":
      return m.bestTimeShift;
  }
}

/** Mutates meta (achv list + reward money). Returns freshly unlocked defs. */
export function checkAchievements(m: MetaState): AchvDef[] {
  const newly: AchvDef[] = [];
  for (const a of ACHV) {
    if (m.achv.includes(a.id)) continue;
    if (metricValue(m, a.metric) >= a.target) {
      m.achv.push(a.id);
      m.money += a.reward;
      newly.push(a);
    }
  }
  return newly;
}

// ================= SKINS =================
export interface SkinDef {
  id: string;
  name: string;
  body: string;
  stripe: string;
  accent: string;
  needSaved?: number;
  needAchv?: string;
  pattern?: "tiger" | "zebra" | "ladybug";
}

export const SKINS: SkinDef[] = [
  { id: "white", name: "Классика", body: "#f4f7ff", stripe: "#ff3b4e", accent: "#2e6bff", needSaved: 0 },
  { id: "red", name: "Пожарный", body: "#e5383b", stripe: "#f4f7ff", accent: "#ffcf3f", needSaved: 5 },
  { id: "hiviz", name: "Сигнальный", body: "#ffd23f", stripe: "#171a22", accent: "#ff5d2e", needSaved: 10 },
  { id: "night", name: "Ночной дозор", body: "#1b2338", stripe: "#25e8c8", accent: "#25e8c8", needSaved: 20 },
  { id: "tiger", name: "Тигр", body: "#f59e2d", stripe: "#1a1208", accent: "#1a1208", needAchv: "m3", pattern: "tiger" },
  { id: "zebra", name: "Зебра", body: "#f2f2f2", stripe: "#141414", accent: "#141414", needAchv: "s2", pattern: "zebra" },
  { id: "ladybug", name: "Божья коровка", body: "#e5383b", stripe: "#141414", accent: "#141414", needAchv: "t3", pattern: "ladybug" },
];

export function getSkin(id: string): SkinDef {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}

export function skinUnlocked(s: SkinDef, m: MetaState): boolean {
  if (s.needAchv) return m.achv.includes(s.needAchv);
  return m.savedTotal >= (s.needSaved ?? 0);
}

// stat mapping from upgrade levels
export function computeStats(u: Upgrades) {
  return {
    maxSpeed: 300 + 38 * u.engine,
    accel: 330 + 45 * u.engine,
    brake: 430 + 65 * u.brake,
    turn: 2.5 + 0.14 * u.brake,
    carryDrain: 1 - 0.13 * u.medkit,
    waitDrain: 1 - 0.06 * u.medkit,
    fuelMax: 100 + 28 * u.tank,
    hornDur: 2.2 + 0.5 * u.siren,
    hornCd: 5.2 - 0.45 * u.siren,
    hornRadius: 190 + 26 * u.siren,
  };
}

const KEY = "spasi-bolnogo-save-v2";

export function loadMeta(): MetaState {
  const def: MetaState = {
    money: 0,
    best: 0,
    savedTotal: 0,
    totalShifts: 0,
    totalEarned: 0,
    bestTimeShift: 0,
    bestRescuedShift: 0,
    upgrades: { engine: 0, brake: 0, medkit: 0, tank: 0, siren: 0 },
    skin: "white",
    muted: false,
    achv: [],
  };
  try {
    // migrate old v1 saves (keep best record and progress)
    const oldRaw = localStorage.getItem("spasi-bolnogo-save-v1");
    const raw = localStorage.getItem(KEY) ?? oldRaw;
    if (!raw) return def;
    const p = JSON.parse(raw) as Partial<MetaState>;
    return {
      ...def,
      ...p,
      upgrades: { ...def.upgrades, ...(p.upgrades ?? {}) },
      achv: Array.isArray(p.achv) ? p.achv : [],
    };
  } catch {
    return def;
  }
}

export function saveMeta(m: MetaState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* storage unavailable — play session-only */
  }
}
