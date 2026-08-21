// ---- mobile virtual joystick + horn button ----
import { useRef } from "react";

export interface TouchInput {
  steer: number; // -1..1
  throttle: number; // 0..1 (push up)
  brake: number; // 0..1 (push down)
}

const R = 52; // joystick travel radius (px)

function Joystick({ onInput }: { onInput: (v: TouchInput) => void }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pidRef = useRef<number | null>(null);

  const apply = (clientX: number, clientY: number) => {
    const el = baseRef.current;
    const knob = knobRef.current;
    if (!el || !knob) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > R) {
      dx = (dx / len) * R;
      dy = (dy / len) * R;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const nx = dx / R;
    const ny = dy / R;
    onInput({
      steer: nx,
      throttle: ny < 0 ? Math.min(1, -ny * 1.4) : 0,
      brake: ny > 0 ? Math.min(1, ny * 1.4) : 0,
    });
  };

  const reset = () => {
    pidRef.current = null;
    if (knobRef.current) knobRef.current.style.transform = "translate(0px, 0px)";
    onInput({ steer: 0, throttle: 0, brake: 0 });
  };

  return (
    <div
      ref={baseRef}
      className="pointer-events-auto relative h-36 w-36 select-none rounded-full border-2 border-[#2a3f73] bg-[rgba(14,23,48,0.55)] shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        pidRef.current = e.pointerId;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        apply(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (pidRef.current === e.pointerId) apply(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        if (pidRef.current === e.pointerId) reset();
      }}
      onPointerCancel={(e) => {
        if (pidRef.current === e.pointerId) reset();
      }}
    >
      {/* direction hints */}
      <span className="absolute left-1/2 top-2 -translate-x-1/2 text-[10px] font-bold text-[#5a6a94]">ГАЗ</span>
      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[#5a6a94]">ТОРМОЗ</span>
      <div
        ref={knobRef}
        className="absolute left-1/2 top-1/2 -ml-8 -mt-8 h-16 w-16 rounded-full border border-[#3d558f] bg-gradient-to-b from-[#2c4175] to-[#182647] shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
      >
        <div className="mx-auto mt-5 h-1.5 w-8 rounded bg-[#3d558f]" />
        <div className="mx-auto mt-1.5 h-1.5 w-8 rounded bg-[#3d558f]" />
      </div>
    </div>
  );
}

export default function TouchControls({
  onInput,
  onHorn,
}: {
  onInput: (v: TouchInput) => void;
  onHorn: (h: boolean) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between px-5 pb-5">
      <Joystick onInput={onInput} />
      <button
        className="pointer-events-auto flex h-24 w-24 select-none flex-col items-center justify-center rounded-full border-2 border-[#8a6a00] bg-[rgba(242,183,10,0.85)] font-disp text-[13px] leading-tight text-[#231a00] shadow-[0_8px_24px_rgba(0,0,0,0.5)] active:scale-95"
        style={{ touchAction: "none" }}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          onHorn(true);
        }}
        onPointerUp={() => onHorn(false)}
        onPointerCancel={() => onHorn(false)}
        onPointerLeave={() => onHorn(false)}
        onContextMenu={(e) => e.preventDefault()}
      >
        <svg viewBox="0 0 24 24" className="mb-0.5 h-7 w-7" fill="currentColor">
          <path d="M4 9v6h4l6 5V4L8 9H4zm13.5 3a3.5 3.5 0 0 0-2-3.2v6.4a3.5 3.5 0 0 0 2-3.2z" />
        </svg>
        ГУДОК
      </button>
    </div>
  );
}
