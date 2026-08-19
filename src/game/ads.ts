// ---- Yandex Games SDK ad wrappers (fullscreen between shifts + rewarded video) ----

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
}

declare global {
  interface Window {
    YaGames?: { init: (opts?: unknown) => Promise<YSDK> };
    ysdk?: YSDK;
  }
}

let readyPromise: Promise<void> | null = null;

/** Initializes the Yandex Games SDK (no-op outside the platform). */
export function initYandexSDK(): Promise<void> {
  if (!readyPromise) {
    readyPromise = new Promise<void>((resolve) => {
      const YG = window.YaGames;
      if (!YG) {
        console.info("[ads] YaGames SDK not found — running outside Yandex Games");
        resolve();
        return;
      }
      YG.init()
        .then((sdk) => {
          window.ysdk = sdk;
          resolve();
        })
        .catch(() => resolve());
    });
  }
  return readyPromise;
}

const sdk = () => window.ysdk;

/**
 * Fullscreen interstitial (shown strictly after every 3rd shift).
 * `done` is guaranteed to be called exactly once.
 */
export function showFullscreenAdv(done: () => void) {
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
}

/**
 * Rewarded video ("continue for an ad" button).
 * Exactly one of onRewarded / onFail is called.
 */
export function showRewardedVideo(cb: { onRewarded: () => void; onFail: () => void }) {
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
}
