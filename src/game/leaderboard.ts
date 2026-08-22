// ---- Yandex Games leaderboard («top_scores») ----
import { initYandexSDK } from "./ads";

/** Technical leaderboard name from the Yandex Games console. */
const LEADERBOARD_NAME = "top_scores";

export interface LBRow {
  rank: number;
  score: number;
  name: string;
  avatar: string | null;
}

/**
 * Loads the Top-10. Resolves to `null` when the SDK / leaderboard is unavailable
 * (local dev, offline, guest) so the UI can render a graceful fallback.
 */
export async function fetchLeaderboard(): Promise<LBRow[] | null> {
  await initYandexSDK();
  const s = window.ysdk;
  if (!s?.leaderboards) {
    console.warn("[lb] Leaderboards unavailable (no SDK)");
    return null;
  }
  try {
    const res = await s.leaderboards.getEntries(LEADERBOARD_NAME, {
      quantityTop: 10,
      includeUser: true,
      quantityAround: 3,
    });
    const rows: LBRow[] = [];
    const seen = new Set<number>();
    for (const e of res.entries ?? []) {
      if (!e || e.rank <= 0 || seen.has(e.rank)) continue;
      seen.add(e.rank);
      let avatar: string | null = null;
      try {
        avatar = e.player?.getAvatarSrc?.("small") ?? null;
      } catch {
        avatar = null;
      }
      rows.push({
        rank: e.rank,
        score: e.score,
        name: e.player?.publicName?.trim() || "Игрок",
        avatar,
      });
    }
    rows.sort((a, b) => a.rank - b.rank);
    return rows.slice(0, 10);
  } catch (err) {
    console.warn("[lb] getEntries failed (guest/offline?):", err);
    return null;
  }
}

/**
 * Submits the final run score. Guarded by isAvailableMethod, never throws —
 * guests and offline players simply skip the submission.
 */
export async function submitScore(score: number): Promise<void> {
  if (!Number.isFinite(score) || score <= 0) return;
  await initYandexSDK();
  const s = window.ysdk;
  if (!s?.leaderboards) return;
  try {
    const ok = s.isAvailableMethod ? await s.isAvailableMethod("leaderboards.setScore") : true;
    if (!ok) {
      console.info("[lb] setScore not available for this user (guest?)");
      return;
    }
    await s.leaderboards.setScore(LEADERBOARD_NAME, Math.round(score));
    console.info("[lb] Score submitted:", Math.round(score));
  } catch (err) {
    console.warn("[lb] setScore failed:", err);
  }
}
