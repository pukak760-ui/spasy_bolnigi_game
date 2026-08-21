// ---- Yandex Games SDK wrappers: init, fullscreen ads, rewarded video, gameplay/loading signals ----
// Docs: https://yandex.ru/dev/games/
// /sdk.js is included in index.html as <script async src="/sdk.js" onload="initSDK()" onerror="failSDK()">.
// initSDK()/failSDK() set window.__YSDK_STATE__ and dispatch "ysdk-loaded"/"ysdk-failed",
// which this module waits for so YaGames.init() is never called before the script loads.

interface YAdvCallbacks {
  onOpen?: () => void;
  onClose?: (wasShown: boolean) => void;
  onError?: (error: unknown) => void;
  onRewarded?: () => void;
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
}

declare global {
  interface Window {
    YaGames?: { init: (opts?: unknown) => Promise<YSDK> };
    ysdk?: YSDK;
    __YSDK_STATE__?: "loaded" | "failed";
  }
}

let readyPromise: Promise<boolean> | null = null;
let reportedReady = false;

/**
 * Initializes the SDK. Safe to call anytime: if /sdk.js is still loading it waits
 * for the onload/onerror events (with a hard timeout), so `YaGames` is always defined
 * here. Resolves `true` when the platform SDK is ready, `false` outside Yandex Games.
 */
export function initYandexSDK(): Promise<boolean> {
  if (!readyPromise) {
    readyPromise = new Promise<boolean>((resolve) => {
      let settled = false;
      const done = (ok: boolean) => {
        if (!settled) {
          settled = true;
          window.clearTimeout(giveUp);
          window.removeEventListener("ysdk-loaded", onLoaded);
          window.removeEventListener("ysdk-failed", onFailed);
          resolve(ok);
        }
      };

      const tryInit = () => {
        const YG = window.YaGames;
        if (!YG) {
          done(false);
          return;
        }
        YG.init()
          .then((sdk) => {
            window.ysdk = sdk;
            console.info("[ads] Yandex Games SDK initialized");
            done(true);
          })
          .catch((e) => {
            console.warn("[ads] YaGames.init failed", e);
            done(false);
          });
      };

      const onLoaded = () => tryInit();
      const onFailed = () => {
        console.info("[ads] /sdk.js failed to load — running outside Yandex Games");
        done(false);
      };

      if (window.__YSDK_STATE__ === "loaded") return tryInit();
      if (window.__YSDK_STATE__ === "failed") return onFailed();
      if (window.YaGames) return tryInit();

      window.addEventListener("ysdk-loaded", onLoaded);
      window.addEventListener("ysdk-failed", onFailed);
      const giveUp = window.setTimeout(() => {
        console.info("[ads] SDK not detected in time — running outside Yandex Games");
        done(false);
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
export function showFullscreenAdv(opts: { onOpen?: () => void; onClose: () => void }) {
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
