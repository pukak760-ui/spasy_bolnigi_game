// ---- Language auto-detection (Yandex Games requirement 2.14) ----
// The user language is read from ysdk.environment.i18n.lang strictly AT STARTUP
// (before any gameplay) and is used to load the matching translation set.
// The game declares a single supported language (Russian); any unsupported
// platform/browser language resolves to the documented fallback set.

import { initYandexSDK } from "./ads";

export const SUPPORTED_LANGS = ["ru"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

/** Fallback language set used when the user language is not supported. */
export const FALLBACK_LANG: SupportedLang = "ru";

let current: SupportedLang = FALLBACK_LANG;
let platformRaw: string | null = null;
let detected = false;

function normalize(raw: string | null | undefined): string {
  return (raw ?? "").toLowerCase().split(/[-_]/)[0].trim();
}

function pickLang(candidates: Array<string | null | undefined>): SupportedLang {
  for (const c of candidates) {
    const n = normalize(c);
    if (n && (SUPPORTED_LANGS as readonly string[]).includes(n)) return n as SupportedLang;
  }
  return FALLBACK_LANG;
}

/**
 * Detects the game language. Must be awaited once at app startup.
 * 1) Yandex SDK: ysdk.environment.i18n.lang ('ru', 'en', 'tr', ...)
 * 2) Outside the platform (local dev): the browser language
 * 3) Fallback set: Russian (the game's only supported language)
 * The result also sets <html lang="..."> and drives number/date formatting.
 */
export async function detectAppLanguage(): Promise<SupportedLang> {
  if (detected) return current;
  detected = true;

  // resolves as soon as the SDK script finishes loading (or the timeout hits),
  // which always happens long before the first shift can start
  await initYandexSDK();

  const sdk = window.ysdk;
  platformRaw = sdk?.environment?.i18n?.lang ?? null;

  const candidates: Array<string | null | undefined> = [platformRaw];
  if (typeof navigator !== "undefined") {
    candidates.push(navigator.language, ...(navigator.languages ?? []));
  }
  current = pickLang(candidates);

  if (typeof document !== "undefined") {
    document.documentElement.lang = current;
  }
  console.info(
    `[i18n] platform lang="${platformRaw ?? "-"}" ` +
      `browser="${typeof navigator !== "undefined" ? navigator.language : "-"}" ` +
      `-> game lang="${current}" (supported: ${SUPPORTED_LANGS.join(",")}; fallback: ${FALLBACK_LANG})`
  );
  return current;
}

export const appLang = (): SupportedLang => current;

/** Locale string used for Intl number formatting (scores, money). */
export const appLocale = (): string => (current === "ru" ? "ru-RU" : "en-US");

export function fmtScore(n: number): string {
  try {
    return n.toLocaleString(appLocale());
  } catch {
    return String(n);
  }
}

// ---------------- translation sets ----------------
// Dictionaries are keyed by the detected language; the loader selects the set
// (or the fallback) — adding a new locale only requires a new entry here.

export interface GameDict {
  loading: {
    brand: string;
    title: string;
    tipLabel: string;
    stages: string[];
    tips: string[];
  };
}

const DICTS: Record<SupportedLang, GameDict> = {
  ru: {
    loading: {
      brand: "СПАСИ БОЛЬНОГО!",
      title: "ЗАГРУЗКА СМЕНЫ",
      tipLabel: "СОВЕТ · ",
      stages: [
        "ПОДКЛЮЧЕНИЕ К ПЛАТФОРМЕ",
        "ЗАГРУЗКА ШРИФТОВ",
        "ГЕНЕРАЦИЯ ГОРОДА",
        "РАЗМЕЩЕНИЕ ПАЦИЕНТОВ",
        "ВЫЕЗЖАЕМ!",
      ],
      tips: [
        "Гудок (SPACE) заставляет машины уступать дорогу",
        "Каждые 4 спасённых — новая смена: больные дальше и слабее",
        "Заправка на АЗС: встань в жёлтую зону и остановись",
        "Редкие скины открываются за достижения в гараже",
        "Удар о здание на скорости отнимает здоровье пациента",
        "Аптечки на дорогах лечат пациента на +24",
      ],
    },
  },
};

/** Returns the translation set for the detected language (or the fallback). */
export const dict = (): GameDict => DICTS[current] ?? DICTS[FALLBACK_LANG];
