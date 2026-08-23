// ---- pre-shift loading screen with live, stage-gated progress ----
// All visible strings come from the translation set picked by the
// language auto-detected at app startup (requirement 2.14).
import { useEffect, useState } from "react";
import { initYandexSDK } from "../game/ads";
import { dict } from "../game/i18n";

/** Mini ambulance that drives along the progress track. */
function MiniAmbulance() {
  return (
    <svg width="36" height="22" viewBox="0 0 36 22" aria-hidden>
      <rect x="1" y="3" width="24" height="13" rx="2.5" fill="#f4f7ff" />
      <path d="M25 6.5h6l4 4.5v5H25z" fill="#f4f7ff" />
      <rect x="26.5" y="8" width="4.5" height="4.5" rx="1" fill="#9fd7ff" />
      <rect x="10" y="5.5" width="3.4" height="8" fill="#ff3b4e" />
      <rect x="7.7" y="7.8" width="8" height="3.4" fill="#ff3b4e" />
      <circle cx="8.5" cy="17.5" r="3" fill="#10131a" />
      <circle cx="8.5" cy="17.5" r="1.3" fill="#3d4a66" />
      <circle cx="27" cy="17.5" r="3" fill="#10131a" />
      <circle cx="27" cy="17.5" r="1.3" fill="#3d4a66" />
    </svg>
  );
}

export function LoadingScreen({ hidden }: { hidden: boolean }) {
  const L = dict().loading;
  const [prog, setProg] = useState(0);
  const [sdkDone, setSdkDone] = useState(false);
  const [fontsDone, setFontsDone] = useState(false);
  const [tip, setTip] = useState(0);

  // real gates: platform SDK + webfonts
  useEffect(() => {
    let alive = true;
    void initYandexSDK().then(() => alive && setSdkDone(true));
    const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
    if (fonts?.ready) {
      Promise.resolve(fonts.ready)
        .then(() => alive && setFontsDone(true))
        .catch(() => alive && setFontsDone(true));
    } else {
      setFontsDone(true);
    }
    const id = window.setInterval(() => setTip((t) => (t + 1) % L.tips.length), 2600);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  // progress eases toward the current gate, snaps to 100 once the game rendered
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const cap = hidden ? 100 : fontsDone ? 82 : sdkDone ? 50 : 28;
      setProg((p) => {
        const target = Math.max(p, Math.min(cap, 100));
        const speed = target - p > 14 ? 38 : 10;
        return Math.min(target, p + speed * dt);
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hidden, sdkDone, fontsDone]);

  const step = prog >= 99.5 ? 4 : prog >= 82 ? 3 : prog >= 52 ? 2 : prog >= 28 ? 1 : 0;
  const pct = Math.round(prog);

  return (
    <div
      className={`absolute inset-0 z-40 flex flex-col items-center justify-center overflow-hidden bg-[#070c18] transition-opacity duration-500 ${
        hidden ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      aria-busy={!hidden}
    >
      {/* ambient backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(1100px 620px at 50% -12%, #16234e 0%, #0a1126 55%, #070c18 100%)" }}
      />
      {/* faint drifting crosses */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]">
        {[
          [12, 18], [78, 12], [22, 70], [85, 62], [50, 30], [65, 82], [8, 44],
        ].map(([x, y], i) => (
          <div
            key={i}
            className="float-y absolute text-[#ff3b4e]"
            style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.5}s` }}
          >
            <svg width={26 + (i % 3) * 10} height={26 + (i % 3) * 10} viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7V2z" />
            </svg>
          </div>
        ))}
      </div>

      <div className="hazard hazard-anim absolute left-0 right-0 top-0 z-10 h-2.5" />
      {/* road with moving dashes */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-[#191f2b]">
        <div className="road-lines absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 opacity-60" />
      </div>
      <div className="hazard hazard-anim absolute bottom-0 left-0 right-0 z-10 h-2.5" />

      {/* content */}
      <div className="relative z-20 flex w-full max-w-md flex-col items-center px-6">
        <div className="flex items-center gap-4">
          <span className="beacon-red h-3.5 w-3.5 rounded-full bg-[#ff2d40] shadow-[0_0_14px_#ff2d40]" />
          <div className="flex h-14 w-14 items-center justify-center bg-[#ff3b4e] shadow-[0_0_36px_rgba(255,59,78,0.6)]">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff" aria-hidden>
              <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7V2z" />
            </svg>
          </div>
          <span className="beacon-blue h-3.5 w-3.5 rounded-full bg-[#2e6bff] shadow-[0_0_14px_#2e6bff]" />
        </div>

        <div className="font-disp mt-4 text-sm tracking-[0.3em] text-[#ff5d70]">{L.brand}</div>
        <div className="font-disp mt-1 text-4xl text-white [text-shadow:0_4px_0_#0a1226]">{L.title}</div>

        {/* progress track with the driving ambulance */}
        <div className="relative mt-9 w-full">
          <div className="absolute -top-6 transition-[left] duration-150 ease-out" style={{ left: `calc(${Math.min(97, prog)}% - 30px)` }}>
            <MiniAmbulance />
          </div>
          <div className="bar-track relative h-4 w-full">
            <div
              className="bar-fill"
              style={{ width: `${prog}%`, background: "linear-gradient(90deg,#ffcf3f,#ff8b3c)" }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-disp text-[13px] tracking-widest text-[#ffcf3f]">{L.stages[step]}</span>
            <span className="font-disp text-[13px] text-white">{pct}%</span>
          </div>
        </div>

        {/* stage checklist */}
        <div className="mt-5 grid w-full grid-cols-2 gap-x-4 gap-y-1.5">
          {L.stages.slice(0, 4).map((label, i) => {
            const done = step > i || prog >= 99.5;
            return (
              <div key={label} className="flex items-center gap-2">
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                    done ? "border-[#3ddc6b] bg-[#3ddc6b]" : "border-[#3d558f] bg-transparent"
                  }`}
                >
                  {done && (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0a2818" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m4.5 12.8 4.8 4.7L19.5 6.7" />
                    </svg>
                  )}
                </span>
                <span className={`text-[10px] font-bold tracking-wider ${done ? "text-[#9fe8bb]" : "text-[#8fa0c8]"}`}>{label}</span>
              </div>
            );
          })}
        </div>

        {/* rotating tip */}
        <div key={tip} className="toast-in mt-6 text-center">
          <span className="font-disp text-[10px] tracking-[0.25em] text-[#8fa0c8]">{L.tipLabel}</span>
          <span className="text-[12px] font-semibold text-[#c3d0ee]">{L.tips[tip]}</span>
        </div>
      </div>
    </div>
  );
}
