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
  shiftsTotal: number;
  bestShiftSaved: number;
  bestShiftTime: number;
  totalEarned: number;
  totalPlayTime: number;
  achievements: string[];
  upgrades: Upgrades;
  skin: string;
  muted: boolean;
}

export interface UpgradeDef {
  key: keyof Upgrades;
  name: string;
  desc: string;
  costs: number[]; // cost to buy level i+1 (max 4 purchases)
  icon: "engine" | "brake" | "medkit" | "tank" | "siren";
}

export const MAX_LVL = 4;

// prices raised ~20% compared to the first release
export const UPGRADE_DEFS: UpgradeDef[] = [
  {
    key: "engine",
    name: "Двигатель",
    desc: "Максимальная скорость и разгон машины",
    costs: [360, 840, 1700, 3100],
    icon: "engine",
  },
  {
    key: "brake",
    name: "Тормоза и руль",
    desc: "Торможение и манёвренность на поворотах",
    costs: [300, 720, 1450, 2650],
    icon: "brake",
  },
  {
    key: "medkit",
    name: "Медоборудование",
    desc: "Пациенты теряют здоровье медленнее",
    costs: [420, 960, 1800, 3400],
    icon: "medkit",
  },
  {
    key: "tank",
    name: "Топливный бак",
    desc: "Больше бензина — дольше смена без заправки",
    costs: [240, 600, 1200, 2300],
    icon: "tank",
  },
  {
    key: "siren",
    name: "Сирена-гудок",
    desc: "Гудок дольше действует и быстрее перезаряжается",
    costs: [300, 780, 1550, 2900],
    icon: "siren",
  },
];

// ================= achievements =================

export type AchMetric =
  | "savedTotal"
  | "bestShiftSaved"
  | "shiftsTotal"
  | "totalEarned"
  | "bestShiftTime"
  | "totalPlayTime";

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  metric: AchMetric;
  target: number;
  skin?: string; // skin id unlocked by this achievement
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "shifts_1", name: "Первая смена", desc: "Заверши 1 смену", metric: "shiftsTotal", target: 1, skin: "hiviz" },
  { id: "saved_5", name: "Фельдшер", desc: "Спаси 5 больных всего", metric: "savedTotal", target: 5, skin: "red" },
  { id: "shift_4", name: "Тяжёлая смена", desc: "Спаси 4 больных за одну смену", metric: "bestShiftSaved", target: 4 },
  { id: "time_120", name: "Марафонец", desc: "Продержись 2 минуты на смене", metric: "bestShiftTime", target: 120 },
  { id: "saved_25", name: "Врач", desc: "Спаси 25 больных всего", metric: "savedTotal", target: 25, skin: "night" },
  { id: "money_2000", name: "Казначей", desc: "Заработай 2 000₽ за всё время", metric: "totalEarned", target: 2000 },
  { id: "shifts_5", name: "Дежурный", desc: "Заверши 5 смен", metric: "shiftsTotal", target: 5 },
  { id: "shift_8", name: "Тигриная смена", desc: "Спаси 8 больных за одну смену", metric: "bestShiftSaved", target: 8, skin: "tiger" },
  { id: "shifts_10", name: "Ветеран маршрута", desc: "Заверши 10 смен", metric: "shiftsTotal", target: 10, skin: "zebra" },
  { id: "time_300", name: "Ночной дозор", desc: "Продержись 5 минут на смене", metric: "bestShiftTime", target: 300 },
  { id: "saved_50", name: "Главврач", desc: "Спаси 50 больных всего", metric: "savedTotal", target: 50 },
  { id: "money_10000", name: "Магнат «03»", desc: "Заработай 10 000₽ за всё время", metric: "totalEarned", target: 10000, skin: "gold" },
  { id: "saved_100", name: "Легenda «03»", desc: "Спаси 100 больных всего", metric: "savedTotal", target: 100, skin: "ladybug" },
  { id: "play_1800", name: "Полчаса за рулём", desc: "Проведи 30 минут на сменах суммарно", metric: "totalPlayTime", target: 1800 },
];

export const ACH_BY_ID: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a])
);

export function achValue(m: MetaState, metric: AchMetric): number {
  return m[metric];
}

/** Mutates meta.achievements, returns ids of freshly unlocked achievements. */
export function checkAchievements(m: MetaState): string[] {
  const got: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!m.achievements.includes(a.id) && achValue(m, a.metric) >= a.target) {
      m.achievements.push(a.id);
      got.push(a.id);
    }
  }
  return got;
}

export function achName(id: string): string {
  return ACH_BY_ID[id]?.name ?? id;
}

// ================= skins =================

export interface SkinDef {
  id: string;
  name: string;
  body: string;
  stripe: string;
  accent: string;
  pattern?: "tiger" | "zebra" | "dots" | "shine";
  ach?: string; // achievement id required to unlock
  rare?: boolean;
}

export const SKINS: SkinDef[] = [
  { id: "white", name: "Классика", body: "#f4f7ff", stripe: "#ff3b4e", accent: "#2e6bff" },
  { id: "hiviz", name: "Сигнальный", body: "#ffd23f", stripe: "#171a22", accent: "#ff5d2e", ach: "shifts_1" },
  { id: "red", name: "Пожарный", body: "#e5383b", stripe: "#f4f7ff", accent: "#ffcf3f", ach: "saved_5" },
  { id: "night", name: "Ночной патруль", body: "#1b2338", stripe: "#25e8c8", accent: "#25e8c8", ach: "saved_25" },
  { id: "tiger", name: "Тигр", body: "#ff8c1a", stripe: "#171a22", accent: "#171a22", pattern: "tiger", ach: "shift_8", rare: true },
  { id: "zebra", name: "Зебра", body: "#f2f2f2", stripe: "#171a22", accent: "#171a22", pattern: "zebra", ach: "shifts_10", rare: true },
  { id: "ladybug", name: "Божья коровка", body: "#e5383b", stripe: "#171a22", accent: "#171a22", pattern: "dots", ach: "saved_100", rare: true },
  { id: "gold", name: "Золотая", body: "#eec643", stripe: "#7a5a00", accent: "#fff2b8", pattern: "shine", ach: "money_10000", rare: true },
];

export function getSkin(id: string): SkinDef {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}

export function skinUnlocked(m: MetaState, s: SkinDef): boolean {
  return !s.ach || m.achievements.includes(s.ach);
}

// stat mapping from upgrade levels
export function computeStats(u: Upgrades) {
  return {
    maxSpeed: 300 + 38 * u.engine,
    accel: 330 + 45 * u.engine,
    brake: 430 + 65 * u.brake,
    turn: 2.5 + 0.14 * u.brake,
    carryDrain: 1 - 0.13 * u.medkit, // multiplier
    waitDrain: 1 - 0.06 * u.medkit,
    fuelMax: 100 + 28 * u.tank,
    hornDur: 2.2 + 0.5 * u.siren,
    hornCd: 5.2 - 0.45 * u.siren,
    hornRadius: 190 + 26 * u.siren,
  };
}

const KEY = "spasi-bolnogo-save-v2";

export function defaultMeta(): MetaState {
  return {
    money: 0,
    best: 0,
    savedTotal: 0,
    shiftsTotal: 0,
    bestShiftSaved: 0,
    bestShiftTime: 0,
    totalEarned: 0,
    totalPlayTime: 0,
    achievements: [],
    upgrades: { engine: 0, brake: 0, medkit: 0, tank: 0, siren: 0 },
    skin: "white",
    muted: false,
  };
}

export function loadMeta(): MetaState {
  const def = defaultMeta();
  try {
    // migrate from v1 save if present
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem("spasi-bolnogo-save-v1");
    if (!raw) return def;
    const p = JSON.parse(raw) as Partial<MetaState>;
    return {
      ...def,
      ...p,
      achievements: Array.isArray(p.achievements) ? p.achievements : [],
      upgrades: { ...def.upgrades, ...(p.upgrades ?? {}) },
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
