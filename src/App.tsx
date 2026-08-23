import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  gameplayStart,
  gameplayStop,
  initYandexSDK,
  reportGameReady,
  showFullscreenAdv,
  showRewardedVideo,
  subscribePlatformEvents,
} from "./game/ads";
import { SFX } from "./game/audio";
import { detectAppLanguage } from "./game/i18n";
import { Game, type GameStats, type HudSnap, type Toast } from "./game/engine";
import { submitScore } from "./game/leaderboard";
import {
  ACH_BY_ID,
  checkAchievements,
  loadMeta,
  MAX_LVL,
  saveMeta,
  SKINS,
  skinUnlocked,
  UPGRADE_DEFS,
  type AchievementDef,
  type MetaState,
  type Upgrades,
} from "./game/meta";
import Hud from "./ui/Hud";
import { LoadingScreen } from "./ui/LoadingScreen";
import { Garage, GameOverOverlay, HowTo, MainMenu, PauseOverlay } from "./ui/Screens";
import TouchControls from "./ui/TouchControls";

const sfx = new SFX();

type ScreenId = "menu" | "howto" | "garage" | "game";

interface ToastItem extends Toast {
  id: number;
}

const REWARD_WINDOW_MS = 4000;

// ================= in-game screen =================
function GameScreen({
  meta,
  muted,
  best,
  isRecord,
  isTouch,
  ready,
  rewardActive,
  rewardKey,
  newAchs,
  onGameOver,
  onContinueAd,
  onLoaded,
  onRestart,
  onQuit,
  onGarage,
  onToggleMute,
}: {
  meta: MetaState;
  muted: boolean;
  best: number;
  isRecord: boolean;
  isTouch: boolean;
  ready: boolean;
  rewardActive: boolean;
  rewardKey: number;
  newAchs: AchievementDef[];
  onGameOver: (s: GameStats) => void;
  onContinueAd: () => Promise<boolean>;
  onLoaded: () => void;
  onRestart: () => void;
  onQuit: () => void;
  onGarage: () => void;
  onToggleMute: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Game | null>(null);
  const [hud, setHud] = useState<HudSnap | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState<GameStats | null>(null);
  const [adBusy, setAdBusy] = useState(false);
  const toastId = useRef(1);
  const overRef = useRef(false);

  const addToast = useCallback((t: Toast) => {
    const id = toastId.current++;
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 2800);
  }, []);

  const togglePause = useCallback(() => {
    if (overRef.current) return;
    sfx.click();
    setPaused((p) => !p);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new Game(canvas, {
      upgrades: meta.upgrades,
      skinId: meta.skin,
      startMoney: meta.money,
      sfx,
      cb: {
        onHud: setHud,
        onGameOver: (s) => {
          overRef.current = true;
          setOver(s);
          onGameOver(s);
        },
        onToast: addToast,
        onPauseRequest: togglePause,
        onResumeRequest: () => {
          if (!overRef.current) setPaused(false);
        },
        onLoaded,
      },
    });
    engineRef.current = game;
    game.start();
    return () => {
      game.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setPaused(paused);
  }, [paused]);

  // Yandex platform signal: gameplay active vs paused / finished
  const isPlaying = ready && !paused && !over;
  useEffect(() => {
    if (isPlaying) gameplayStart();
    else gameplayStop();
  }, [isPlaying]);

  const touchInput = useCallback((v: { steer: number; throttle: number; brake: number }) => {
    engineRef.current?.setTouchInput(v);
  }, []);
  const touchHorn = useCallback((h: boolean) => {
    engineRef.current?.setTouchInput({ horn: h });
  }, []);

  const handleContinueAd = useCallback(() => {
    if (adBusy) return Promise.resolve(false);
    setAdBusy(true);
    return onContinueAd().then((ok) => {
      setAdBusy(false);
      if (ok) {
        engineRef.current?.continueRun();
        overRef.current = false;
        setOver(null);
      }
      return ok;
    });
  }, [adBusy, onContinueAd]);

  const toastColor = (k: Toast["kind"]) =>
    k === "good"
      ? { border: "#1f6e4a", color: "#5dff9e" }
      : k === "bad"
        ? { border: "#8f2438", color: "#ff8b98" }
        : { border: "#2a3f73", color: "#c3d0ee" };

  return (
    <div className="relative h-full w-full bg-[#0a0f1e]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      <Hud hud={hud} muted={muted} showKeys={!isTouch} onPause={togglePause} onMute={onToggleMute} />

      {/* touch controls on mobile — only while actually driving */}
      {isTouch && !paused && !over && <TouchControls onInput={touchInput} onHorn={touchHorn} />}

      {/* toasts */}
      <div className="pointer-events-none absolute left-1/2 top-[104px] z-20 flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => {
          const c = toastColor(t.kind);
          return (
            <div
              key={t.id}
              className="toast-in hud-chip px-4 py-2 font-disp text-[13px] tracking-wide"
              style={{ borderColor: c.border, color: c.color }}
            >
              {t.text}
            </div>
          );
        })}
      </div>

      {paused && !over && (
        <PauseOverlay
          hud={hud}
          muted={muted}
          onResume={togglePause}
          onRestart={onRestart}
          onMenu={onQuit}
          onMute={onToggleMute}
        />
      )}

      {over && (
        <GameOverOverlay
          stats={over}
          best={best}
          isRecord={isRecord}
          rewardActive={rewardActive}
          rewardBusy={adBusy}
          rewardKey={rewardKey}
          newAchs={newAchs}
          onContinueAd={() => void handleContinueAd()}
          onRetry={onRestart}
          onGarage={onGarage}
          onMenu={onQuit}
        />
      )}
    </div>
  );
}

// ================= app shell =================
export default function App() {
  const [screen, setScreen] = useState<ScreenId>("menu");
  const [meta, setMeta] = useState<MetaState>(() => loadMeta());
  const [runId, setRunId] = useState(0);
  const [isRecord, setIsRecord] = useState(false);
  const [rewardOn, setRewardOn] = useState(false);
  const [rewardKey, setRewardKey] = useState(0);
  const [newAchs, setNewAchs] = useState<AchievementDef[]>([]);
  // becomes true once the engine has rendered its first frame → hides the loader
  const [gameReady, setGameReady] = useState(false);

  const metaRef = useRef(meta);
  metaRef.current = meta;
  const statsRef = useRef<GameStats | null>(null);
  const finalizedRef = useRef(false);
  const rewardTimerRef = useRef<number | null>(null);
  // true while an ad is on screen — blocks the mute-sync effect from un-muting mid-ad
  const adActiveRef = useRef(false);

  // mobile / touch detection (moderation: show touch controls, hide key hints)
  const isTouch = useMemo(
    () =>
      typeof window !== "undefined" &&
      ("ontouchstart" in window || (navigator.maxTouchPoints ?? 0) > 0),
    []
  );

  useEffect(() => {
    saveMeta(meta);
    // don't let a state update un-mute the game while an ad is on screen
    if (!adActiveRef.current) sfx.muted = meta.muted;
  }, [meta]);

  // Yandex Games SDK init (no-op outside the platform)
  useEffect(() => {
    void initYandexSDK();
    // platform pause/resume events (ysdk.on) → window events the engine listens to
    const unsub = subscribePlatformEvents();
    return () => unsub();
  }, []);

  // Requirement 2.14: auto-detect the user language AT STARTUP (before any gameplay)
  useEffect(() => {
    void detectAppLanguage();
  }, []);

  // Duplicate LoadingAPI.ready() signal from the app side (idempotent — the
  // primary call is inline in index.html). Fires right after the menu paints;
  // deliberately NOT gated on document.fonts.ready: webfonts are optional and
  // must never delay the platform loading signal.
  useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => reportGameReady());
    });
    const t = window.setTimeout(() => reportGameReady(), 1500);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(t);
    };
  }, []);

  /** Full silence while an ad is on screen; restored to the user's setting on ad close. */
  const muteForAd = useCallback(() => {
    adActiveRef.current = true;
    sfx.stopAll();
    sfx.muted = true;
  }, []);
  const unmuteAfterAd = useCallback(() => {
    adActiveRef.current = false;
    sfx.muted = metaRef.current.muted;
  }, []);

  const clearRewardTimer = useCallback(() => {
    if (rewardTimerRef.current !== null) {
      window.clearTimeout(rewardTimerRef.current);
      rewardTimerRef.current = null;
    }
  }, []);

  /** Counts the shift as finished: achievements, totals, interstitial every 3rd. */
  const finalizeShift = useCallback(() => {
    if (finalizedRef.current) return;
    const s = statsRef.current;
    if (!s) return;
    finalizedRef.current = true;

    const m: MetaState = {
      ...metaRef.current,
      shiftsTotal: metaRef.current.shiftsTotal + 1,
      bestShiftSaved: Math.max(metaRef.current.bestShiftSaved, s.rescued),
      bestShiftTime: Math.max(metaRef.current.bestShiftTime, s.timeSec),
      totalEarned: metaRef.current.totalEarned + Math.max(0, s.moneyDelta),
      totalPlayTime: metaRef.current.totalPlayTime + s.timeSec,
    };
    const fresh = checkAchievements(m);
    setNewAchs(fresh.map((id) => ACH_BY_ID[id]).filter(Boolean));
    if (fresh.length) sfx.levelup();
    setMeta(m);

    // strict Yandex rule: fullscreen interstitial after every 3rd completed shift.
    // Sound is fully muted while the ad is open and restored in onClose.
    if (m.shiftsTotal % 3 === 0) {
      muteForAd();
      showFullscreenAdv({ onOpen: () => {}, onClose: () => unmuteAfterAd() });
    }
  }, [muteForAd, unmuteAfterAd]);

  const handleLoaded = useCallback(() => setGameReady(true), []);

  // safety net: never leave the player stuck on the loader
  useEffect(() => {
    if (screen !== "game") return;
    const t = window.setTimeout(() => setGameReady(true), 3500);
    return () => window.clearTimeout(t);
  }, [screen, runId]);

  const startGame = useCallback(() => {
    // if the previous shift ended but its 4s reward window never elapsed, count it now
    finalizeShift();
    sfx.unlock();
    sfx.click();
    setIsRecord(false);
    setNewAchs([]);
    setRewardOn(false);
    setGameReady(false);
    clearRewardTimer();
    statsRef.current = null;
    finalizedRef.current = false;
    setRunId((r) => r + 1);
    setScreen("game");
  }, [clearRewardTimer, finalizeShift]);

  // Enter to start from menu
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (screen === "menu" && e.key === "Enter") startGame();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, startGame]);

  const handleGameOver = useCallback(
    (s: GameStats) => {
      statsRef.current = s;
      finalizedRef.current = false;
      setIsRecord(s.score > 0 && s.score > metaRef.current.best);
      // send the final run score to the Yandex leaderboard (safe for guests/offline)
      void submitScore(s.score);
      // bank the run earnings & records immediately (they persist either way)
      setMeta((m) => ({
        ...m,
        money: Math.max(0, m.money + s.moneyDelta),
        best: Math.max(m.best, s.score),
        savedTotal: m.savedTotal + s.rescued,
      }));
      // 4-second rewarded window
      setRewardOn(true);
      setRewardKey((k) => k + 1);
      clearRewardTimer();
      rewardTimerRef.current = window.setTimeout(() => {
        setRewardOn(false);
        finalizeShift();
      }, REWARD_WINDOW_MS);
    },
    [clearRewardTimer, finalizeShift]
  );

  /** Rewarded video → refill fuel and keep the same run going. */
  const handleContinueAd = useCallback((): Promise<boolean> => {
    // hide the 4s window and cancel the finalize timer the moment the ad opens,
    // so the shift can't be finalized or double-counted while the video plays
    clearRewardTimer();
    setRewardOn(false);
    muteForAd();
    return new Promise((resolve) => {
      let granted = false;
      showRewardedVideo({
        onOpen: () => {},
        // the reward (full tank) is granted ONLY when the platform confirms it
        onRewarded: () => {
          granted = true;
        },
        // always fires when the ad closes — restore sound & resume without overlay stacking
        onClose: () => {
          unmuteAfterAd();
          if (granted) sfx.cash();
          resolve(granted);
        },
      });
    });
  }, [clearRewardTimer, muteForAd, unmuteAfterAd]);

  const leaveRun = useCallback(
    (next: ScreenId) => {
      finalizeShift();
      setRewardOn(false);
      clearRewardTimer();
      setScreen(next);
    },
    [clearRewardTimer, finalizeShift]
  );

  const buyUpgrade = useCallback((k: keyof Upgrades) => {
    const def = UPGRADE_DEFS.find((d) => d.key === k);
    if (!def) return;
    const m = metaRef.current;
    const lvl = m.upgrades[k];
    if (lvl >= MAX_LVL) return;
    const cost = def.costs[lvl];
    if (m.money < cost) {
      sfx.deny();
      return;
    }
    sfx.buy();
    setMeta((prev) => ({ ...prev, money: prev.money - cost, upgrades: { ...prev.upgrades, [k]: lvl + 1 } }));
  }, []);

  const chooseSkin = useCallback((id: string) => {
    const s = SKINS.find((x) => x.id === id);
    if (!s || !skinUnlocked(metaRef.current, s)) {
      sfx.deny();
      return;
    }
    sfx.click();
    setMeta((m) => ({ ...m, skin: id }));
  }, []);

  const toggleMute = useCallback(() => {
    setMeta((m) => {
      const next = { ...m, muted: !m.muted };
      sfx.muted = next.muted;
      if (!next.muted) window.setTimeout(() => sfx.click(), 60);
      return next;
    });
  }, []);

  if (screen === "menu") {
    return (
      <MainMenu
        meta={meta}
        onPlay={startGame}
        onGarage={() => {
          sfx.click();
          setScreen("garage");
        }}
        onHowTo={() => {
          sfx.click();
          setScreen("howto");
        }}
        onToggleMute={toggleMute}
      />
    );
  }

  if (screen === "howto") {
    return (
      <HowTo
        onBack={() => {
          sfx.click();
          setScreen("menu");
        }}
      />
    );
  }

  if (screen === "garage") {
    return <Garage meta={meta} onBuy={buyUpgrade} onSkin={chooseSkin} onBack={() => setScreen("menu")} />;
  }

  return (
    <>
    <GameScreen
      key={runId}
      meta={meta}
      muted={meta.muted}
      best={meta.best}
      isRecord={isRecord}
      isTouch={isTouch}
      ready={gameReady}
      rewardActive={rewardOn}
      rewardKey={rewardKey}
      newAchs={newAchs}
      onGameOver={handleGameOver}
      onContinueAd={handleContinueAd}
      onLoaded={handleLoaded}
      onRestart={startGame}
      onQuit={() => leaveRun("menu")}
      onGarage={() => leaveRun("garage")}
      onToggleMute={toggleMute}
    />
    {screen === "game" && <LoadingScreen hidden={gameReady} />}
    </>
  );
}
