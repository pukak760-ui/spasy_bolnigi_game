import { useCallback, useEffect, useRef, useState } from "react";
import { SFX } from "./game/audio";
import { Game, type GameStats, type HudSnap, type Toast } from "./game/engine";
import { loadMeta, MAX_LVL, saveMeta, SKINS, UPGRADE_DEFS, type MetaState, type Upgrades } from "./game/meta";
import Hud from "./ui/Hud";
import { Garage, GameOverOverlay, HowTo, MainMenu, PauseOverlay } from "./ui/Screens";

const sfx = new SFX();

type ScreenId = "menu" | "howto" | "garage" | "game";

interface ToastItem extends Toast {
  id: number;
}

// ================= in-game screen =================
function GameScreen({
  meta,
  muted,
  best,
  isRecord,
  onGameOver,
  onRestart,
  onQuit,
  onGarage,
  onToggleMute,
}: {
  meta: MetaState;
  muted: boolean;
  best: number;
  isRecord: boolean;
  onGameOver: (s: GameStats) => void;
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

  const toastColor = (k: Toast["kind"]) =>
    k === "good"
      ? { border: "#1f6e4a", color: "#5dff9e" }
      : k === "bad"
        ? { border: "#8f2438", color: "#ff8b98" }
        : { border: "#2a3f73", color: "#c3d0ee" };

  return (
    <div className="relative h-full w-full bg-[#0a0f1e]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      <Hud hud={hud} muted={muted} onPause={togglePause} onMute={onToggleMute} />

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
  const [lastStats, setLastStats] = useState<GameStats | null>(null);
  const [isRecord, setIsRecord] = useState(false);

  useEffect(() => {
    saveMeta(meta);
    sfx.muted = meta.muted;
  }, [meta]);

  const startGame = useCallback(() => {
    sfx.unlock();
    sfx.click();
    setLastStats(null);
    setIsRecord(false);
    setRunId((r) => r + 1);
    setScreen("game");
  }, []);

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
      setIsRecord(s.score > 0 && s.score > meta.best);
      setMeta((m) => ({
        ...m,
        money: Math.max(0, m.money + s.moneyDelta),
        best: Math.max(m.best, s.score),
        savedTotal: m.savedTotal + s.rescued,
      }));
    },
    [meta.best]
  );

  const buyUpgrade = useCallback(
    (k: keyof Upgrades) => {
      const def = UPGRADE_DEFS.find((d) => d.key === k);
      if (!def) return;
      const lvl = meta.upgrades[k];
      if (lvl >= MAX_LVL) return;
      const cost = def.costs[lvl];
      if (meta.money < cost) {
        sfx.deny();
        return;
      }
      sfx.buy();
      setMeta((m) => ({ ...m, money: m.money - cost, upgrades: { ...m.upgrades, [k]: lvl + 1 } }));
    },
    [meta]
  );

  const chooseSkin = useCallback(
    (id: string) => {
      const s = SKINS.find((x) => x.id === id);
      if (!s || meta.savedTotal < s.needSaved) {
        sfx.deny();
        return;
      }
      sfx.click();
      setMeta((m) => ({ ...m, skin: id }));
    },
    [meta.savedTotal]
  );

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
    <GameScreen
      key={runId}
      meta={meta}
      muted={meta.muted}
      best={meta.best}
      isRecord={isRecord}
      onGameOver={handleGameOver}
      onRestart={startGame}
      onQuit={() => setScreen("menu")}
      onGarage={() => setScreen("garage")}
      onToggleMute={toggleMute}
    />
  );
}
