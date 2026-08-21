// ---- Yandex Games SDK ad wrappers (fullscreen between shifts + rewarded video) ----
// Docs: https://yandex.ru/dev/games/ — /sdk.js is included in index.html as
// <script async src="/sdk.js" onload="initSDK()" onerror="failSDK()"> (in <head>).
// initSDK() / failSDK() dispatch "ysdk-loaded" / "ysdk-failed" events that this
// module waits for, so YaGames.init() is always called only after the script
// has loaded — exactly the order required by the platform.

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

/**
 * Initializes the Yandex Games SDK.
 * Safe to call at any moment: if the sdk.js script is still loading,
 * the init waits for the onload/onerror events (with a hard timeout),
 * so `YaGames` can never be "not defined" here.
 * Resolves `true` when the platform SDK is ready, `false` outside Yandex Games.
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
          done(false); // script loaded but YaGames is absent — treat as no SDK
          return;
        }
        YG.init()
          .then((sdk) => {
            window.ysdk = sdk;
            // tell the platform the game is ready (optional, recommended)
            try {
              sdk.features?.LoadingAPI?.ready?.();
            } catch {
              /* older SDK builds may lack LoadingAPI */
            }
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

      // script already finished before this module ran?
      if (window.__YSDK_STATE__ === "loaded") return tryInit();
      if (window.__YSDK_STATE__ === "failed") return onFailed();
      if (window.YaGames) return tryInit();

      // otherwise wait for the script events
      window.addEventListener("ysdk-loaded", onLoaded);
      window.addEventListener("ysdk-failed", onFailed);
      // hard timeout: local dev without /sdk.js must not hang
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
 * Fullscreen interstitial (shown strictly after every 3rd finished shift).
 * `done` is guaranteed to be called exactly once.
 */
export function showFullscreenAdv(done: () => void) {
  void initYandexSDK().then(() => {
    const s = sdk();
    if (!s?.adv) {
      console.info("[ads] fullscreen skipped (no SDK)");
      window.setTimeout(done, 250);
      return;
    }
    let finished = false;
    const finish = () => {
      if (!finished) {
        finished = true;
        done();
      }
    };
    try {
      s.adv.showFullscreenAdv({
        onOpen: () => {},
        onClose: () => finish(),
        onError: () => finish(),
      });
      // safety net in case the platform never fires callbacks
      window.setTimeout(finish, 60000);
    } catch {
      finish();
    }
  });
}

/**
 * Rewarded video ("continue for an ad" button).
 * Exactly one of onRewarded / onFail is called.
 */
export function showRewardedVideo(cb: { onRewarded: () => void; onFail: () => void }) {
  void initYandexSDK().then(() => {
    const s = sdk();
    if (!s?.adv) {
      console.info("[ads] rewarded simulated (no SDK)");
      window.setTimeout(cb.onRewarded, 500);
      return;
    }
    let rewarded = false;
    let settled = false;
    const fail = () => {
      if (!rewarded && !settled) {
        settled = true;
        cb.onFail();
      }
    };
    try {
      s.adv.showRewardedVideo({
        onOpen: () => {},
        onRewarded: () => {
          rewarded = true;
          cb.onRewarded();
        },
        onClose: () => fail(),
        onError: () => fail(),
      });
      window.setTimeout(fail, 90000);
    } catch {
      fail();
    }
  });
}
