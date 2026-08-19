// ---- meta progression: upgrades, skins, persistence ----

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

export const UPGRADE_DEFS: UpgradeDef[] = [
  {
    key: "engine",
    name: "Двигатель",
    desc: "Максимальная скорость и разгон машины",
    costs: [300, 700, 1400, 2600],
    icon: "engine",
  },
  {
    key: "brake",
    name: "Тормоза и руль",
    desc: "Торможение и манёвренность на поворотах",
    costs: [250, 600, 1200, 2200],
    icon: "brake",
  },
  {
    key: "medkit",
    name: "Медоборудование",
    desc: "Пациенты теряют здоровье медленнее",
    costs: [350, 800, 1500, 2800],
    icon: "medkit",
  },
  {
    key: "tank",
    name: "Топливный бак",
    desc: "Больше бензина — дольше смена без заправки",
    costs: [200, 500, 1000, 1900],
    icon: "tank",
  },
  {
    key: "siren",
    name: "Сирена-гудок",
    desc: "Гудок дольше действует и быстрее перезаряжается",
    costs: [250, 650, 1300, 2400],
    icon: "siren",
  },
];

export interface SkinDef {
  id: string;
  name: string;
  body: string;
  stripe: string;
  accent: string;
  needSaved: number;
}

export const SKINS: SkinDef[] = [
  { id: "white", name: "Классика", body: "#f4f7ff", stripe: "#ff3b4e", accent: "#2e6bff", needSaved: 0 },
  { id: "red", name: "Пожарный", body: "#e5383b", stripe: "#f4f7ff", accent: "#ffcf3f", needSaved: 5 },
  { id: "hiviz", name: "Сигнальный", body: "#ffd23f", stripe: "#171a22", accent: "#ff5d2e", needSaved: 10 },
  { id: "night", name: "Ночной дозор", body: "#1b2338", stripe: "#25e8c8", accent: "#25e8c8", needSaved: 20 },
];

export function getSkin(id: string): SkinDef {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
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

const KEY = "spasi-bolnogo-save-v1";

export function loadMeta(): MetaState {
  const def: MetaState = {
    money: 0,
    best: 0,
    savedTotal: 0,
    upgrades: { engine: 0, brake: 0, medkit: 0, tank: 0, siren: 0 },
    skin: "white",
    muted: false,
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return def;
    const p = JSON.parse(raw) as Partial<MetaState>;
    return {
      ...def,
      ...p,
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
