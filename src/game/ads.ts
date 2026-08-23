// ---- Yandex Games SDK wrappers: init, fullscreen ads, rewarded video, gameplay/loading signals ----
// Docs: https://yandex.ru/dev/games/
// index.html contains the canonical docs snippet:
//   <script async src="/sdk.js" onload="initSDK()" onerror="failSDK()"></script>
// where initSDK() calls `YaGames.init()` directly and stores the instance in
// window.ysdk, then dispatches "ysdk-ready". This module consumes that instance
// (with a defensive fallback init of its own) so the SDK is never used before init.

interface YAdvCallbacks {
  onOpen?: () => void;
  onClose?: (wasShown: boolean) => void;
  onError?: (error: unknown) => void;
  onRewarded?: () => void;
}

export interface YLBPlayer {
  uniqueID?: string;
  publicName?: string;
  getAvatarSrc?: (size: "small" | "medium" | "large") => string;
}

export interface YLBEntry {
  rank: number;
  score: number;
  formattedScore?: string;
  player: YLBPlayer | null;
}

interface YLeaderboards {
  getEntries: (
    name: string,
    opts?: { quantityTop?: number; includeUser?: boolean; quantityAround?: number }
  ) => Promise<{ entries: YLBEntry[] }>;
  setScore: (name: string, score: number) => Promise<unknown>;
}

interface YSDK {
  adv: {
    showFullscreenAdv: (cb?: YAdvCallbacks) => void;
    showRewardedVideo: (cb?: YAdvCallbacks) => void;
  };
  features?: {
    LoadingAPI?: { ready?: () => void };
    GameplayAPI?: { start?: () => void; stop?: () => void };
  };
  leaderboards?: YLeaderboards;
  isAvailableMethod?: (method: string) => Promise<boolean>;
  environment?: {
    i18n?: { lang?: string; tld?: string };
    payload?: string;
  };
}

declare global {
  interface Window {
    YaGames?: { init: (opts?: unknown) => Promise<YSDK> };
    ysdk?: YSDK;
    __YSDK_STATE__?: "ready" | "failed";
  }
}

let readyPromise: Promise<boolean> | null = null;
let reportedReady = false;

/**
 * Resolves when the SDK is ready. `YaGames.init()` itself is called by the
 * canonical inline handler in index.html (onload → initSDK()). This function
 * only consumes the result: it returns the already-initialized instance, waits
 * for the "ysdk-ready"/"ysdk-failed" events, or — as a defensive fallback when
 * the inline handler somehow did not run — initializes the SDK itself.
 * Resolves `true` on the platform, `false` outside Yandex Games.
 */
export function initYandexSDK(): Promise<boolean> {
  if (!readyPromise) {
    readyPromise = new Promise<boolean>((resolve) => {
      let settled = false;
      const done = (ok: boolean) => {
        if (!settled) {
          settled = true;
          window.clearTimeout(giveUp);
          window.removeEventListener("ysdk-ready", onReady);
          window.removeEventListener("ysdk-failed", onFailed);
          resolve(ok);
        }
      };

      // Defensive fallback: script is present but the inline onload handler never ran.
      const fallbackInit = () => {
        const YG = window.YaGames;
        if (!YG) {
          done(false);
          return;
        }
        YG.init()
          .then((sdk) => {
            window.ysdk = sdk;
            console.info("[ads] Yandex Games SDK initialized (fallback path)");
            done(true);
          })
          .catch((e) => {
            console.warn("[ads] YaGames.init failed", e);
            done(false);
          });
      };

      const onReady = () => {
        console.info("[ads] Yandex Games SDK initialized");
        done(true);
      };
      const onFailed = () => {
        console.info("[ads] /sdk.js failed to load — running outside Yandex Games");
        done(false);
      };

      // Already initialized by the inline handler (most common case on the platform)?
      if (window.ysdk || window.__YSDK_STATE__ === "ready") return done(true);
      if (window.__YSDK_STATE__ === "failed") return done(false);

      // Wait for the inline handler's events...
      window.addEventListener("ysdk-ready", onReady);
      window.addEventListener("ysdk-failed", onFailed);
      const giveUp = window.setTimeout(() => {
        if (window.YaGames && !window.ysdk) {
          // ...but if 5s passed with the script loaded and no init — heal ourselves.
          console.info("[ads] inline initSDK() never ran — falling back to direct init");
          window.removeEventListener("ysdk-ready", onReady);
          window.removeEventListener("ysdk-failed", onFailed);
          fallbackInit();
        } else {
          console.info("[ads] SDK not detected in time — running outside Yandex Games");
          done(false);
        }
      }, 5000);
    });
  }
  return readyPromise;
}

const sdk = () => window.ysdk;

/**
 * Signal the platform that the game has finished loading and the main menu is shown.
 * Must be called once, exactly when the player sees the menu (moderation requirement).
 */
export function reportGameReady() {
  if (reportedReady) return;
  reportedReady = true;
  void initYandexSDK().then(() => {
    try {
      sdk()?.features?.LoadingAPI?.ready?.();
    } catch {
      /* older SDK builds may lack LoadingAPI */
    }
  });
}

/** Gameplay is active (a run is in progress and not paused). */
export function gameplayStart() {
  void initYandexSDK().then(() => {
    try {
      sdk()?.features?.GameplayAPI?.start?.();
    } catch {
      /* ignore */
    }
  });
}

/** Gameplay paused / finished / left (moderation requires this on pause, game-over, menu). */
export function gameplayStop() {
  void initYandexSDK().then(() => {
    try {
      sdk()?.features?.GameplayAPI?.stop?.();
    } catch {
      /* ignore */
    }
  });
}

/**
 * Fullscreen interstitial (shown strictly after every 3rd finished shift).
 * `onClose` is guaranteed to fire exactly once — restore sound there.
 */
// platform rule: at most one interstitial per minute
let lastFullscreenAt = 0;
const FULLSCREEN_MIN_INTERVAL_MS = 60_000;

export function showFullscreenAdv(opts: { onOpen?: () => void; onClose: () => void }) {
  const now = Date.now();
  if (now - lastFullscreenAt < FULLSCREEN_MIN_INTERVAL_MS) {
    console.info("[ads] fullscreen skipped (1-minute cooldown)");
    window.setTimeout(() => {
      opts.onOpen?.();
      opts.onClose();
    }, 60);
    return;
  }
  lastFullscreenAt = now;
  void initYandexSDK().then(() => {
    const s = sdk();
    if (!s?.adv) {
      console.info("[ads] fullscreen skipped (no SDK)");
      window.setTimeout(() => {
        opts.onOpen?.();
        opts.onClose();
      }, 250);
      return;
    }
    let closed = false;
    const close = () => {
      if (!closed) {
        closed = true;
        opts.onClose();
      }
    };
    try {
      s.adv.showFullscreenAdv({
        onOpen: () => opts.onOpen?.(),
        onClose: () => close(),
        onError: () => close(),
      });
      window.setTimeout(close, 60000); // safety net
    } catch {
      close();
    }
  });
}

/**
 * Rewarded video ("continue for an ad").
 * `onRewarded` fires only if the reward was granted; `onClose` ALWAYS fires once when
 * the ad window closes — resolve the promise and restore sound there.
 */
export function showRewardedVideo(opts: {
  onOpen?: () => void;
  onRewarded: () => void;
  onClose: () => void;
}) {
  void initYandexSDK().then(() => {
    const s = sdk();
    if (!s?.adv) {
      console.info("[ads] rewarded simulated (no SDK)");
      window.setTimeout(() => {
        opts.onOpen?.();
        opts.onRewarded();
        opts.onClose();
      }, 500);
      return;
    }
    let closed = false;
    const close = () => {
      if (!closed) {
        closed = true;
        opts.onClose();
      }
    };
    try {
      s.adv.showRewardedVideo({
        onOpen: () => opts.onOpen?.(),
        onRewarded: () => opts.onRewarded(),
        onClose: () => close(),
        onError: () => close(),
      });
      window.setTimeout(close, 90000); // safety net
    } catch {
      close();
    }
  });
}
