// ---- menu, how-to, garage, pause & game-over screens ----
import { useEffect, useState, type ReactNode } from "react";
import type { GameStats, HudSnap } from "../game/engine";
import { MAX_LVL, SKINS, UPGRADE_DEFS, type MetaState, type Upgrades } from "../game/meta";
import MenuScene from "./MenuScene";
import {
  IconArrowLeft,
  IconBrake,
  IconCross,
  IconEngine,
  IconFuel,
  IconHeart,
  IconHome,
  IconMedkit,
  IconPlay,
  IconRefresh,
  IconRuble,
  IconSiren,
  IconSoundOff,
  IconSoundOn,
  IconStar,
  IconTank,
} from "./icons";

const UPG_ICONS: Record<string, (p: { className?: string }) => ReactNode> = {
  engine: IconEngine,
  brake: IconBrake,
  medkit: IconMedkit,
  tank: IconTank,
  siren: IconSiren,
};

const TICKER = [
  { name: "Мария, 62", addr: "ул. Гагарина, 12", diag: "Температура 41°" },
  { name: "Глеб, 8", addr: "пр. Мира, 84", diag: "Сильная аллергия" },
  { name: "Виктор, 45", addr: "ул. Лесная, 3", diag: "Подозрение на инфаркт" },
  { name: "Зоя, 27", addr: "б-р Солнечный, 17", diag: "Перелом ноги" },
  { name: "Борис, 71", addr: "пер. Тихий, 5", diag: "Ожог паром" },
  { name: "Анна, 34", addr: "ул. Речная, 28", diag: "Отравление" },
];

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ================= MAIN MENU =================
export function MainMenu({
  meta,
  onPlay,
  onGarage,
  onHowTo,
  onToggleMute,
}: {
  meta: MetaState;
  onPlay: () => void;
  onGarage: () => void;
  onHowTo: () => void;
  onToggleMute: () => void;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 2200);
    return () => window.clearInterval(id);
  }, []);
  const calls = [0, 1, 2].map((i) => TICKER[(tick + i) % TICKER.length]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MenuScene skinId={meta.skin} />
      <div className="hazard hazard-anim absolute left-0 right-0 top-0 z-10 h-2.5" />
      <div className="hazard hazard-anim absolute bottom-0 left-0 right-0 z-10 h-2.5" />
      <div className="absolute inset-0 bg-gradient-to-r from-[rgba(4,8,20,0.88)] via-[rgba(4,8,20,0.55)] to-[rgba(4,8,20,0.25)]" />

      <div className="absolute inset-0 z-20 flex items-center justify-between px-8 lg:px-16">
        {/* left: title + actions */}
        <div className="max-w-2xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center bg-[#ff3b4e] shadow-[0_0_24px_rgba(255,59,78,0.7)]">
              <IconCross className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="font-disp text-sm tracking-widest text-[#ff5d70]">СЛУЖБА «03»</div>
              <div className="text-[11px] font-bold tracking-[0.25em] text-[#8fa0c8]">НОЧНАЯ СМЕНА · ВЫЕЗД</div>
            </div>
          </div>

          <h1 className="font-disp leading-[0.95]">
            <span className="block text-6xl text-white [text-shadow:0_5px_0_#0a1226,0_0_40px_rgba(120,160,255,0.35)] lg:text-7xl">
              СПАСИ
            </span>
            <span className="block text-6xl text-[#ff3b4e] [text-shadow:0_6px_0_#5c0a18,0_0_50px_rgba(255,59,78,0.55)] lg:text-8xl">
              БОЛЬНОГО!
            </span>
          </h1>

          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-[#c3d0ee]">
            Гоняй на скорой по ночному городу, забирай пациентов с вызовов и довози их до больницы живыми.
            Пробки, бензин на нуле и три жизни на смену — успей всех.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <button className="btn-game btn-big pulse-glow" onClick={onPlay}>
              <span className="flex items-center gap-3">
                <IconPlay className="h-6 w-6" /> НА СМЕНУ
              </span>
            </button>
            <button className="btn-game btn-yellow" onClick={onGarage}>
              <span>ГАРАЖ</span>
            </button>
            <button className="btn-game btn-ghost" onClick={onHowTo}>
              <span>КАК ИГРАТЬ</span>
            </button>
            <button className="btn-game btn-ghost !px-4" onClick={onToggleMute} title="Звук">
              <span>{meta.muted ? <IconSoundOff className="h-5 w-5" /> : <IconSoundOn className="h-5 w-5" />}</span>
            </button>
          </div>

          <div className="mt-6 flex items-center gap-4 text-[12px] font-semibold text-[#8fa0c8]">
            <span className="flex items-center gap-1.5">
              <span className="keycap">W</span>
              <span className="keycap">A</span>
              <span className="keycap">S</span>
              <span className="keycap">D</span> — вождение
            </span>
            <span className="flex items-center gap-1.5">
              <span className="keycap">SPACE</span> — гудок
            </span>
            <span className="flex items-center gap-1.5">
              <span className="keycap">ESC</span> — пауза
            </span>
          </div>
        </div>

        {/* right: stats + calls ticker */}
        <div className="hidden w-[330px] flex-col gap-4 lg:flex">
          <div className="panel-cut p-5">
            <div className="mb-3 font-disp text-sm tracking-widest text-[#8fa0c8]">ЛИЧНОЕ ДЕЛО</div>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-[#c3d0ee]">
                  <IconStar className="h-4 w-4 text-[#ffcf3f]" /> Рекорд
                </span>
                <span className="font-disp text-xl text-white">{meta.best}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-[#c3d0ee]">
                  <IconHeart className="h-4 w-4 text-[#ff3b4e]" /> Всего спасено
                </span>
                <span className="font-disp text-xl text-white">{meta.savedTotal}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-[#c3d0ee]">
                  <IconRuble className="h-4 w-4 text-[#ffcf3f]" /> Баланс
                </span>
                <span className="font-disp text-xl text-[#ffe27a]">{meta.money}₽</span>
              </div>
            </div>
          </div>

          <div className="panel-cut overflow-hidden">
            <div className="flex items-center gap-2 bg-[#c81e33] px-4 py-2">
              <span className="beacon-red inline-block h-2.5 w-2.5 rounded-full bg-white" />
              <span className="font-disp text-xs tracking-widest text-white">СВОДКА ВЫЗОВОВ</span>
            </div>
            <div className="flex flex-col gap-1 p-3">
              {calls.map((c, i) => (
                <div
                  key={`${tick}-${i}`}
                  className={`pop-in flex items-center justify-between rounded px-2.5 py-2 ${
                    i === 0 ? "bg-[rgba(255,59,78,0.14)]" : "bg-[rgba(46,107,255,0.07)]"
                  }`}
                  style={{ animationDelay: `${i * 0.07}s` }}
                >
                  <div>
                    <div className="text-[12px] font-bold text-white">{c.name}</div>
                    <div className="text-[10px] text-[#8fa0c8]">{c.addr}</div>
                  </div>
                  <div className={`text-right text-[10px] font-bold ${i === 0 ? "text-[#ff8b98]" : "text-[#7fb2ff]"}`}>
                    {c.diag}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================= HOW TO =================
export function HowTo({ onBack }: { onBack: () => void }) {
  return (
    <div className="relative h-full w-full overflow-y-auto bg-[#0a1020]">
      <div className="hazard absolute left-0 right-0 top-0 z-10 h-2.5" />
      <div className="mx-auto my-8 w-full max-w-4xl px-6 pb-16">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-disp text-4xl text-white [text-shadow:0_4px_0_#0a1226]">
            КАК <span className="text-[#ff3b4e]">ИГРАТЬ</span>
          </h2>
          <button className="btn-game btn-ghost" onClick={onBack}>
            <span className="flex items-center gap-2">
              <IconArrowLeft className="h-4 w-4" /> НАЗАД
            </span>
          </button>
        </div>

        <div className="panel-cut mb-5 border-l-4 border-l-[#ff3b4e] p-5">
          <div className="font-disp text-sm tracking-widest text-[#ff5d70]">ЦЕЛЬ СМЕНЫ</div>
          <p className="mt-2 text-[15px] leading-relaxed text-[#c3d0ee]">
            По городу появляются больные — забирай их скорой и довози до площадки <b className="text-[#25e8c8]">«ПРИЁМ»</b> у
            больницы. У каждого тает здоровье: не успел — пациент потерян, а это одна из <b className="text-[#ff5d70]">3 жизней</b>.
            Спасай как можно больше и зарабатывай на прокачку машины. Смена бесконечная, пока не кончатся жизни.
          </p>
        </div>

        <div className="panel-cut mb-5 p-5">
          <div className="mb-3 font-disp text-sm tracking-widest text-[#8fa0c8]">УПРАВЛЕНИЕ</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { k: ["W", "↑"], t: "Газ" },
              { k: ["S", "↓"], t: "Тормоз и задний ход" },
              { k: ["A", "D"], t: "Руль (или ← →)" },
              { k: ["SPACE"], t: "Гудок — машины уступают" },
              { k: ["ESC", "P"], t: "Пауза" },
              { k: ["STOP"], t: "Остановись рядом с пациентом, чтобы забрать" },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="flex gap-1">
                  {r.k.map((key) => (
                    <span key={key} className="keycap">
                      {key}
                    </span>
                  ))}
                </span>
                <span className="text-[13px] font-semibold text-[#c3d0ee]">{r.t}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-3 font-disp text-sm tracking-widest text-[#8fa0c8]">МЕХАНИКИ</div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              icon: <IconCross className="h-5 w-5 text-[#ff5d70]" />,
              t: "Вызовы",
              d: "Красная стрелка у машины и метка на карте ведут к ближайшему больному. Ждать вечно никто не будет — спеши.",
            },
            {
              icon: <IconHeart className="h-5 w-5 text-[#3ddc6b]" />,
              t: "Здоровье пациента",
              d: "Полоска тает всё время, в машине медленнее. Аварии отнимают −11. Аптечки на дорогах лечат +24.",
            },
            {
              icon: <IconFuel className="h-5 w-5 text-[#ffcf3f]" />,
              t: "Бензин",
              d: "Заправляйся на АЗС (жёлтые зоны), встав рядом и остановившись. Канистры на дороге дают +30 литров.",
            },
            {
              icon: <IconSiren className="h-5 w-5 text-[#7fb2ff]" />,
              t: "Гудок и сирена",
              d: "SPACE включает гудок — машины в радиусе замирают. Сирена сама воет, когда везёшь пациента.",
            },
            {
              icon: <IconStar className="h-5 w-5 text-[#ffe27a]" />,
              t: "Комбо и бонусы",
              d: "Спасения подряд без аварий дают множитель до ×2. Доставил быстрее 30 секунд — премия +90₽.",
            },
            {
              icon: <IconRefresh className="h-5 w-5 text-[#25e8c8]" />,
              t: "Смены и ночь",
              d: "Каждые 4 спасённых — новая смена: вызовы чаще, диагнозы тяжелее, трафик плотнее. Ночью темнеет — фары в помощь.",
            },
          ].map((c, i) => (
            <div key={i} className="panel-cut p-4 transition hover:border-[#3d558f]">
              <div className="flex items-center gap-2.5">
                {c.icon}
                <span className="font-disp text-[15px] text-white">{c.t}</span>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#a9b8dc]">{c.d}</p>
            </div>
          ))}
        </div>

        <div className="panel-cut mt-5 border-l-4 border-l-[#ffcf3f] p-5">
          <div className="font-disp text-sm tracking-widest text-[#ffcf3f]">СОВЕТ БРИГААДИРА</div>
          <p className="mt-2 text-[14px] leading-relaxed text-[#c3d0ee]">
            Не лети через дворы — по траве машина тащится еле-еле. Держись дорог, гуди на перекрёстках и следи за баком:
            пустая скорая ползёт со скоростью пешехода.
          </p>
        </div>
      </div>
    </div>
  );
}

// ================= GARAGE =================
export function Garage({
  meta,
  onBuy,
  onSkin,
  onBack,
}: {
  meta: MetaState;
  onBuy: (k: keyof Upgrades) => void;
  onSkin: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="relative h-full w-full overflow-y-auto bg-[#0a1020]">
      <div className="hazard absolute left-0 right-0 top-0 z-10 h-2.5" />
      <div className="mx-auto my-8 w-full max-w-5xl px-6 pb-16">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-disp text-4xl text-white [text-shadow:0_4px_0_#0a1226]">
            ГАРАЖ <span className="text-[#ffcf3f]">«03»</span>
          </h2>
          <div className="flex items-center gap-3">
            <div className="hud-chip flex items-center gap-2 px-4 py-2">
              <IconRuble className="h-5 w-5 text-[#ffcf3f]" />
              <span className="font-disp text-xl text-[#ffe27a]">{meta.money}₽</span>
            </div>
            <button className="btn-game btn-ghost" onClick={onBack}>
              <span className="flex items-center gap-2">
                <IconArrowLeft className="h-4 w-4" /> НАЗАД
              </span>
            </button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* upgrades */}
          <div className="flex flex-col gap-3">
            <div className="font-disp text-sm tracking-widest text-[#8fa0c8]">ПРОКАЧКА МАШИНЫ</div>
            {UPGRADE_DEFS.map((def) => {
              const lvl = meta.upgrades[def.key];
              const maxed = lvl >= MAX_LVL;
              const cost = maxed ? 0 : def.costs[lvl];
              const afford = !maxed && meta.money >= cost;
              const Icon = UPG_ICONS[def.icon];
              return (
                <div key={def.key} className="panel-cut flex items-center gap-4 p-4">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center"
                    style={{ background: "rgba(46,107,255,0.14)", clipPath: "polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)" }}
                  >
                    <Icon className="h-7 w-7 text-[#7fb2ff]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-disp text-[16px] text-white">{def.name}</span>
                      <span className="flex gap-1">
                        {Array.from({ length: MAX_LVL + 1 }, (_, i) => (
                          <span
                            key={i}
                            className="h-2.5 w-5"
                            style={{
                              background: i <= lvl ? "#ffcf3f" : "#232f52",
                              clipPath: "polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%)",
                            }}
                          />
                        ))}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-[12px] text-[#a9b8dc]">{def.desc}</div>
                  </div>
                  <button
                    className={`btn-game ${maxed ? "btn-ghost" : afford ? "btn-yellow" : "btn-ghost"} !px-5 !py-2.5 text-sm`}
                    disabled={maxed || !afford}
                    onClick={() => onBuy(def.key)}
                  >
                    <span className="flex items-center gap-2">
                      {maxed ? (
                        "МАКС"
                      ) : (
                        <>
                          <IconRuble className="h-3.5 w-3.5" />
                          {cost}₽
                        </>
                      )}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* skins */}
          <div className="flex flex-col gap-3">
            <div className="font-disp text-sm tracking-widest text-[#8fa0c8]">РАСКРАСКА</div>
            {SKINS.map((s) => {
              const locked = meta.savedTotal < s.needSaved;
              const active = meta.skin === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => onSkin(s.id)}
                  disabled={locked}
                  className={`panel-cut relative flex items-center gap-4 p-3.5 text-left transition ${
                    active ? "!border-[#25e8c8]" : "hover:border-[#3d558f]"
                  } ${locked ? "opacity-100" : "cursor-pointer"}`}
                >
                  <div
                    className="relative h-12 w-24 shrink-0 overflow-hidden"
                    style={{ background: s.body, clipPath: "polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)" }}
                  >
                    <div className="absolute left-0 top-1/2 h-3 w-full -translate-y-1/2" style={{ background: s.stripe }} />
                    <div className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white" />
                    <div className="absolute left-[18px] top-1/2 h-3.5 w-1 -translate-y-1/2" style={{ background: "#2e6bff" }} />
                    <div className="absolute left-4 top-1/2 h-1 w-3.5 -translate-y-1/2" style={{ background: "#2e6bff" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-disp text-[14px] text-white">{s.name}</div>
                    <div className="text-[11px] text-[#a9b8dc]">
                      {locked ? (
                        <span className="text-[#ff8b98]">Спаси ещё {s.needSaved - meta.savedTotal} пациентов</span>
                      ) : active ? (
                        <span className="text-[#25e8c8]">Выбрана</span>
                      ) : (
                        "Доступна"
                      )}
                    </div>
                  </div>
                  {active && <IconCross className="h-5 w-5 shrink-0 text-[#25e8c8]" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ================= PAUSE =================
export function PauseOverlay({
  hud,
  muted,
  onResume,
  onRestart,
  onMenu,
  onMute,
}: {
  hud: HudSnap | null;
  muted: boolean;
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
  onMute: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[rgba(4,7,16,0.78)]">
      <div className="panel-cut pop-in w-[420px] max-w-[92vw] overflow-hidden">
        <div className="hazard hazard-anim h-3" />
        <div className="p-7">
          <h2 className="font-disp text-center text-4xl text-white [text-shadow:0_4px_0_#0a1226]">ПАУЗА</h2>
          <p className="mt-1 text-center text-[12px] font-semibold tracking-widest text-[#8fa0c8]">БРИГАДА ПЬЁТ КОФЕ</p>

          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[
              { l: "СЧЁТ", v: String(hud?.score ?? 0) },
              { l: "СПАСЕНО", v: String(hud?.rescued ?? 0) },
              { l: "БАЛАНС", v: `${hud?.money ?? 0}₽` },
            ].map((s) => (
              <div key={s.l} className="hud-chip px-2 py-2.5">
                <div className="text-[9px] font-bold tracking-widest text-[#8fa0c8]">{s.l}</div>
                <div className="font-disp text-lg text-white">{s.v}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button className="btn-game" onClick={onResume}>
              <span className="flex items-center justify-center gap-2.5">
                <IconPlay className="h-5 w-5" /> ПРОДОЛЖИТЬ
              </span>
            </button>
            <button className="btn-game btn-yellow" onClick={onRestart}>
              <span className="flex items-center justify-center gap-2.5">
                <IconRefresh className="h-5 w-5" /> СМЕНА ЗАНОВО
              </span>
            </button>
            <div className="flex gap-3">
              <button className="btn-game btn-ghost flex-1" onClick={onMute}>
                <span className="flex items-center justify-center gap-2">
                  {muted ? <IconSoundOff className="h-4 w-4" /> : <IconSoundOn className="h-4 w-4" />}
                  {muted ? "ВКЛ" : "ВЫКЛ"}
                </span>
              </button>
              <button className="btn-game btn-ghost flex-1" onClick={onMenu}>
                <span className="flex items-center justify-center gap-2">
                  <IconHome className="h-4 w-4" /> В МЕНЮ
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================= GAME OVER =================
export function GameOverOverlay({
  stats,
  best,
  isRecord,
  onRetry,
  onGarage,
  onMenu,
}: {
  stats: GameStats;
  best: number;
  isRecord: boolean;
  onRetry: () => void;
  onGarage: () => void;
  onMenu: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[rgba(6,4,12,0.85)]">
      <div className="panel-cut pop-in w-[540px] max-w-[94vw] overflow-hidden">
        <div className="hazard h-3" />
        <div className="p-8">
          <div className="flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center bg-[#c81e33]">
              <IconCross className="h-7 w-7 text-white" />
            </div>
            <h2 className="font-disp text-4xl text-[#ff3b4e] [text-shadow:0_4px_0_#3d060e]">СМЕНА ОКОНЧЕНА</h2>
          </div>
          <p className="mt-2 text-center text-[13px] font-semibold text-[#a9b8dc]">
            Три пациента потеряны... Отдохни, заправься — и снова в путь.
          </p>

          {isRecord && (
            <div className="pop-in mx-auto mt-4 flex w-fit items-center gap-2 bg-[#ffcf3f] px-4 py-1.5" style={{ clipPath: "polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)" }}>
              <IconStar className="h-4 w-4 text-[#231a00]" />
              <span className="font-disp text-sm text-[#231a00]">НОВЫЙ РЕКОРД!</span>
            </div>
          )}

          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              { l: "СЧЁТ", v: String(stats.score), c: "#fff" },
              { l: "РЕКОРД", v: String(best), c: "#ffe27a" },
              { l: "СПАСЕНО", v: String(stats.rescued), c: "#3ddc6b" },
              { l: "ЗАРАБОТАНО", v: `${stats.moneyDelta >= 0 ? "+" : ""}${stats.moneyDelta}₽`, c: "#ffe27a" },
              { l: "ВРЕМЯ", v: fmtTime(stats.timeSec), c: "#7fb2ff" },
              { l: "СМЕНА", v: String(stats.level), c: "#ff8b98" },
            ].map((s) => (
              <div key={s.l} className="hud-chip px-2 py-2.5 text-center">
                <div className="text-[9px] font-bold tracking-widest text-[#8fa0c8]">{s.l}</div>
                <div className="font-disp text-lg" style={{ color: s.c }}>
                  {s.v}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button className="btn-game btn-big !text-xl" onClick={onRetry}>
              <span className="flex items-center justify-center gap-2.5">
                <IconRefresh className="h-5 w-5" /> ЕЩЁ СМЕНА
              </span>
            </button>
            <div className="flex gap-3">
              <button className="btn-game btn-yellow flex-1" onClick={onGarage}>
                <span className="flex items-center justify-center gap-2">
                  <IconRuble className="h-4 w-4" /> В ГАРАЖ
                </span>
              </button>
              <button className="btn-game btn-ghost flex-1" onClick={onMenu}>
                <span className="flex items-center justify-center gap-2">
                  <IconHome className="h-4 w-4" /> В МЕНЮ
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
