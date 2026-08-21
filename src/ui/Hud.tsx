// ---- in-game DOM HUD ----
import type { HudSnap } from "../game/engine";
import {
  IconClock,
  IconCross,
  IconFuel,
  IconHeart,
  IconPause,
  IconRuble,
  IconSoundOff,
  IconSoundOn,
  IconStar,
} from "./icons";

interface Props {
  hud: HudSnap | null;
  muted: boolean;
  showKeys: boolean;
  onPause: () => void;
  onMute: () => void;
}

export default function Hud({ hud, muted, showKeys, onPause, onMute }: Props) {
  if (!hud) return null;
  const hp01 = hud.carrying ? hud.carrying.hp / 100 : 0;
  const hpColor = hp01 > 0.5 ? "#3ddc6b" : hp01 > 0.25 ? "#ffcf3f" : "#ff2038";
  const fuel01 = hud.fuel / hud.fuelMax;
  const fuelColor = fuel01 > 0.45 ? "#ffcf3f" : fuel01 > 0.2 ? "#ff8b3c" : "#ff3b4e";

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {/* ---- top row ---- */}
      <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-3">
        {/* left: score / combo */}
        <div className="flex flex-col gap-2">
          <div className="hud-chip px-4 py-2">
            <div className="text-[10px] font-bold tracking-widest text-[#8fa0c8]">СЧЁТ</div>
            <div className="font-disp text-2xl leading-none text-white">{hud.score}</div>
          </div>
          {hud.combo > 0 && (
            <div className="hud-chip pulse-glow px-4 py-1.5" style={{ borderColor: "#a02840" }}>
              <div className="font-disp text-sm text-[#ff5d70]">
                СЕРИЯ ×{hud.comboMult.toFixed(1)} <span className="text-[11px] text-[#8fa0c8]">({hud.combo} подряд)</span>
              </div>
            </div>
          )}
          <div className="hud-chip flex items-center gap-2 px-4 py-1.5">
            <IconHeart className="h-4 w-4 text-[#3ddc6b]" />
            <span className="font-disp text-sm text-white">{hud.rescued}</span>
            <span className="text-[10px] font-bold tracking-wider text-[#8fa0c8]">СПАСЕНО</span>
          </div>
        </div>

        {/* center: patient card */}
        <div className="flex max-w-md flex-col items-center gap-2">
          {hud.carrying ? (
            <div className="hud-chip pop-in w-[340px] px-4 py-2.5" style={{ borderColor: "#1f6e60" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <IconCross className="h-3.5 w-3.5 text-[#25e8c8]" />
                  <span className="text-[10px] font-bold tracking-widest text-[#25e8c8]">ПАЦИЕНТ В МАШИНЕ</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-[#8fa0c8]">
                  <IconClock className="h-3.5 w-3.5" />
                  {Math.floor(hud.carrying.carryT)}с
                </div>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="font-disp text-base text-white">{hud.carrying.name}</span>
                <span className="text-[11px] font-semibold text-[#ff8b98]">{hud.carrying.label}</span>
              </div>
              <div className="bar-track mt-1.5 h-3.5 w-full">
                <div
                  className={`bar-fill ${hp01 < 0.3 ? "animate-pulse" : ""}`}
                  style={{ width: `${Math.max(2, hp01 * 100)}%`, background: hpColor }}
                />
              </div>
              <div className="mt-1 text-center text-[10px] font-semibold tracking-wide text-[#8fa0c8]">
                Вези на площадку «ПРИЁМ» у больницы
              </div>
            </div>
          ) : (
            <div className="hud-chip px-4 py-2 text-center">
              {hud.targetKind === "patient" ? (
                <div className="font-disp text-sm text-[#ffb3bc]">
                  ВЫЗОВ · {hud.nearestDist !== null ? `${Math.round((hud.nearestDist * 0.2) / 5) * 5} м` : "—"}
                </div>
              ) : (
                <div className="font-disp text-sm text-[#8fa0c8]">ПАТРУЛИРУЙ ГОРОД — ЖДИ ВЫЗОВ</div>
              )}
            </div>
          )}
        </div>

        {/* right: resources */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <div className="hud-chip flex items-center gap-2 px-4 py-2">
              <IconRuble className="h-4 w-4 text-[#ffcf3f]" />
              <span className="font-disp text-lg leading-none text-[#ffe27a]">{hud.money}</span>
            </div>
            <div className="hud-chip px-3 py-2 text-center">
              <div className="text-[9px] font-bold tracking-widest text-[#8fa0c8]">СМЕНА</div>
              <div className="font-disp text-lg leading-none text-white">{hud.level}</div>
            </div>
            <button
              onClick={onMute}
              className="hud-chip pointer-events-auto cursor-pointer px-3 py-2 text-[#8fa0c8] transition hover:text-white"
              title="Звук"
            >
              {muted ? <IconSoundOff className="h-5 w-5" /> : <IconSoundOn className="h-5 w-5" />}
            </button>
            <button
              onClick={onPause}
              className="hud-chip pointer-events-auto cursor-pointer px-3 py-2 text-[#8fa0c8] transition hover:text-white"
              title="Пауза [ESC]"
            >
              <IconPause className="h-5 w-5" />
            </button>
          </div>

          {/* fuel + speed */}
          <div className="hud-chip w-[240px] px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <IconFuel className="h-4 w-4 text-[#ffcf3f]" />
                <span className="text-[10px] font-bold tracking-widest text-[#8fa0c8]">ТОПЛИВО</span>
              </div>
              <span className="font-disp text-xs text-white">{hud.speed} км/ч</span>
            </div>
            <div className="bar-track mt-1.5 h-3 w-full">
              <div
                className={`bar-fill ${fuel01 < 0.2 ? "animate-pulse" : ""}`}
                style={{ width: `${Math.max(2, fuel01 * 100)}%`, background: fuelColor }}
              />
            </div>
          </div>

          {/* lives */}
          <div className="hud-chip flex items-center gap-1.5 px-4 py-2">
            <span className="mr-1 text-[10px] font-bold tracking-widest text-[#8fa0c8]">ЖИЗНИ</span>
            {[0, 1, 2].map((i) => (
              <IconHeart
                key={i}
                className={`h-5 w-5 ${i < hud.lives ? "text-[#ff3b4e]" : "text-[#28324e]"} ${
                  i < hud.lives && hud.lives === 1 ? "heart-beat" : ""
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ---- bottom center: keyboard controls hint (hidden on touch devices) ---- */}
      {showKeys && (
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-3 opacity-80">
        <span className="flex items-center gap-1">
          <span className="keycap !h-7 !min-w-7 !text-[10px]">W</span>
          <span className="keycap !h-7 !min-w-7 !text-[10px]">A</span>
          <span className="keycap !h-7 !min-w-7 !text-[10px]">S</span>
          <span className="keycap !h-7 !min-w-7 !text-[10px]">D</span>
          <span className="ml-1 text-[11px] font-semibold text-[#8fa0c8]">езда</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="keycap !h-7 !px-3 !text-[10px]">SPACE</span>
          <span className="ml-1 text-[11px] font-semibold text-[#8fa0c8]">гудок</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="keycap !h-7 !px-2 !text-[10px]">ESC</span>
          <span className="ml-1 text-[11px] font-semibold text-[#8fa0c8]">пауза</span>
        </span>
      </div>
      )}

      {/* night indicator — always visible */}
      {hud.night > 0.4 && (
        <div className={`absolute flex items-center gap-1 text-[11px] font-bold text-[#7fb2ff] ${showKeys ? "bottom-3 left-1/2 translate-x-[150px]" : "bottom-40 left-1/2 -translate-x-1/2"}`}>
          <IconStar className="h-3.5 w-3.5" /> НОЧЬ — следи за фарами
        </div>
      )}
    </div>
  );
}
