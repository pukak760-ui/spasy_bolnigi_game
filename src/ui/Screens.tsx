// ---- menu, how-to, garage, pause & game-over screens ----
import { useEffect, useState, type ReactNode } from "react";
import type { GameStats, HudSnap } from "../game/engine";
import { fmtScore } from "../game/i18n";
import { fetchLeaderboard, type LBRow } from "../game/leaderboard";
import {
  ACHIEVEMENTS,
  ACH_BY_ID,
  achValue,
  MAX_LVL,
  SKINS,
  skinUnlocked,
  UPGRADE_DEFS,
  type AchievementDef,
  type MetaState,
  type Upgrades,
} from "../game/meta";
import MenuScene from "./MenuScene";
import {
  IconArrowLeft,
  IconBrake,
  IconCheck,
  IconCross,
  IconEngine,
  IconFuel,
  IconHeart,
  IconHome,
  IconLock,
  IconMedal,
  IconMedkit,
  IconPlay,
  IconRefresh,
  IconRuble,
  IconSiren,
  IconSoundOff,
  IconSoundOn,
  IconStar,
  IconTank,
  IconTrophy,
  IconUser,
} from "./icons";

const UPG_ICONS: Record<string, (p: { className?: string }) => ReactNode> = {
  engine: IconEngine,
  brake: IconBrake,
  medkit: IconMedkit,
  tank: IconTank,
  siren: IconSiren,
};

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtDur(sec: number) {
  if (sec < 60) return `${sec}с`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return s ? `${m}м ${s}с` : `${m}м`;
  return `${Math.floor(m / 60)}ч ${m % 60}м`;
}

function fmtTarget(a: AchievementDef) {
  if (a.metric === "totalEarned") return `${fmtScore(a.target)}₽`;
  if (a.metric === "bestShiftTime" || a.metric === "totalPlayTime") return fmtDur(a.target);
  return String(a.target);
}

// ================= LEADERBOARD (Yandex Games «top_scores») =================
function LbAvatar({ src }: { src: string | null }) {
  const [broken, setBroken] = useState(false);
  if (src && !broken) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setBroken(true)}
        className="h-7 w-7 shrink-0 rounded-full border border-[#3d558f] object-cover"
      />
    );
  }
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#3d558f] bg-[#1b2a4d] text-[#8fa0c8]">
      <IconUser className="h-3.5 w-3.5" />
    </span>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const medal = rank === 1 ? "#ffcf3f" : rank === 2 ? "#c9d6e8" : rank === 3 ? "#d08a4f" : null;
  if (medal) {
    return (
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center"
        style={{ background: medal, clipPath: "polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px)" }}
      >
        <IconTrophy className="h-3.5 w-3.5 text-[#231a00]" />
      </span>
    );
  }
  return <span className="flex h-6 w-6 shrink-0 items-center justify-center font-disp text-[12px] text-[#8fa0c8]">{rank}</span>;
}

function LeaderboardCard({ best }: { best: number }) {
  const [rows, setRows] = useState<LBRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [stamp, setStamp] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void fetchLeaderboard().then((r) => {
      if (!alive) return;
      setRows(r);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [stamp]);

  return (
    <div className="panel-cut overflow-hidden">
      <div className="flex items-center justify-between bg-[#c81e33] px-4 py-2">
        <span className="flex items-center gap-2 font-disp text-xs tracking-widest text-white">
          <IconTrophy className="h-4 w-4 text-[#ffcf3f]" /> ТОП ИГРОКОВ
        </span>
        <button
          onClick={() => setStamp((s) => s + 1)}
          title="Обновить"
          className={`flex h-7 w-7 items-center justify-center bg-[rgba(0,0,0,0.22)] text-white transition hover:bg-[rgba(0,0,0,0.45)] ${loading ? "spin-slow" : ""}`}
          style={{ clipPath: "polygon(5px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%,0 5px)" }}
        >
          <IconRefresh className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex min-h-[248px] flex-col gap-1 p-3">
        {loading &&
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-2.5 px-2.5 py-2" style={{ opacity: 1 - i * 0.13 }}>
              <div className="shimmer h-5 w-5" />
              <div className="shimmer h-7 w-7 rounded-full" />
              <div className="shimmer h-3.5 flex-1" />
              <div className="shimmer h-3.5 w-10" />
            </div>
          ))}

        {!loading && rows === null && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center">
            <IconTrophy className="h-9 w-9 text-[#3d558f]" />
            <div className="text-[13px] font-semibold text-[#c3d0ee]">Рейтинг доступен в Яндекс Играх</div>
            <div className="max-w-[230px] text-[11px] leading-relaxed text-[#8fa0c8]">
              Сыграй смену — твой счёт попадёт в общий топ платформы
            </div>
          </div>
        )}

        {!loading && rows !== null && rows.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center">
            <IconTrophy className="h-9 w-9 text-[#3d558f]" />
            <div className="text-[13px] font-semibold text-[#c3d0ee]">Пока нет результатов</div>
            <div className="max-w-[230px] text-[11px] leading-relaxed text-[#8fa0c8]">Стань первым в топе — спаси больного!</div>
          </div>
        )}

        {!loading &&
          rows !== null &&
          rows.map((r) => (
            <div
              key={r.rank}
              className={`flex items-center gap-2.5 rounded px-2.5 py-1.5 ${
                r.rank <= 3 ? "bg-[rgba(255,207,63,0.09)]" : "bg-[rgba(46,107,255,0.05)]"
              }`}
            >
              <RankBadge rank={r.rank} />
              <LbAvatar src={r.avatar} />
              <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-white">{r.name}</span>
              <span className="font-disp shrink-0 text-[13px] text-[#ffe27a]">{fmtScore(r.score)}</span>
            </div>
          ))}
      </div>

      <div className="flex items-center justify-between border-t border-[#27407a] px-4 py-2.5">
        <span className="text-[10px] font-bold tracking-widest text-[#8fa0c8]">ВАШ РЕКОРД</span>
        <span className="font-disp text-base text-[#ffe27a]">{fmtScore(best)}</span>
      </div>
    </div>
  );
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
            С каждой сменой больные дальше и слабее — прокачивай машину, открывай редкие раскраски и ставь рекорды.
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
                  <IconMedal className="h-4 w-4 text-[#25e8c8]" /> Достижения
                </span>
                <span className="font-disp text-xl text-white">
                  {meta.achievements.length}<span className="text-[13px] text-[#8fa0c8]">/{ACHIEVEMENTS.length}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-[#c3d0ee]">
                  <IconRuble className="h-4 w-4 text-[#ffcf3f]" /> Баланс
                </span>
                <span className="font-disp text-xl text-[#ffe27a]">{meta.money}₽</span>
              </div>
            </div>
          </div>

          <LeaderboardCard best={meta.best} />
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
            Смена бесконечная, пока не кончатся жизни, — и с каждой новой сменой вызовы всё дальше, а больные всё слабее.
            Прокачка машины — не роскошь, а необходимость.
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
              d: "Красная стрелка у машины и метка на карте ведут к ближайшему больному. Чем дальше — тем меньше времени.",
            },
            {
              icon: <IconHeart className="h-5 w-5 text-[#3ddc6b]" />,
              t: "Здоровье пациента",
              d: "Полоска тает всё время, в машине медленнее. Аварии отнимают −11, столкновение со стеной −7. Аптечки на дорогах лечат +24.",
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
              d: "Каждые 4 спасённых — новая смена: вызовы чаще и дальше, пациенты слабее, трафик плотнее. Ночью темнеет — фары в помощь.",
            },
            {
              icon: <IconMedal className="h-5 w-5 text-[#ffcf3f]" />,
              t: "Достижения и скины",
              d: "Спасай больных, держись дольше, зарабатывай — открывай достижения и редкие раскраски: Тигр, Зебра, Божья коровка, Золотая.",
            },
            {
              icon: <IconPlay className="h-5 w-5 text-[#5dff9e]" />,
              t: "Второй шанс",
              d: "После провала смены успей нажать «Продолжить за рекламу» (4 секунды!) — бак наполнится, и смена продолжится с тем же счётом.",
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
          <div className="font-disp text-sm tracking-widest text-[#ffcf3f]">СОВЕТ БРИГАДИРА</div>
          <p className="mt-2 text-[14px] leading-relaxed text-[#c3d0ee]">
            Не лети через дворы — по траве машина тащится еле-еле, а здания и деревья твёрдые. Держись дорог, гуди на
            перекрёстках и следи за баком: пустая скорая ползёт со скоростью пешехода.
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
      <div className="mx-auto my-8 w-full max-w-6xl px-6 pb-16">
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

        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
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

            {/* achievements */}
            <div className="mt-3 font-disp text-sm tracking-widest text-[#8fa0c8]">
              ДОСТИЖЕНИЯ · {meta.achievements.length}/{ACHIEVEMENTS.length}
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {ACHIEVEMENTS.map((a) => {
                const got = meta.achievements.includes(a.id);
                const val = Math.min(achValue(meta, a.metric), a.target);
                const prog = val / a.target;
                return (
                  <div
                    key={a.id}
                    className={`panel-cut p-3.5 ${got ? "!border-[#2f9e63]" : ""}`}
                    style={got ? { boxShadow: "0 0 18px rgba(61,220,107,0.15)" } : undefined}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center ${got ? "bg-[#3ddc6b]" : "bg-[#232f52]"}`}
                        style={{ clipPath: "polygon(5px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%,0 5px)" }}
                      >
                        {got ? (
                          <IconCheck className="h-4.5 w-4.5 text-[#0a2818]" />
                        ) : (
                          <IconMedal className="h-4.5 w-4.5 text-[#5a6a94]" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className={`font-disp text-[13px] ${got ? "text-[#5dff9e]" : "text-white"}`}>{a.name}</div>
                        <div className="truncate text-[11px] text-[#a9b8dc]">
                          {a.desc}
                          {a.skin && (
                            <span className="text-[#ffe27a]"> · скин «{SKINS.find((s) => s.id === a.skin)?.name}»</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {!got && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="bar-track h-2 flex-1">
                          <div className="bar-fill" style={{ width: `${Math.max(3, prog * 100)}%`, background: "#7fb2ff" }} />
                        </div>
                        <span className="text-[10px] font-bold text-[#8fa0c8]">
                          {val}/{fmtTarget(a)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* skins */}
          <div className="flex flex-col gap-3">
            <div className="font-disp text-sm tracking-widest text-[#8fa0c8]">РАСКРАСКА</div>
            {SKINS.map((s) => {
              const unlocked = skinUnlocked(meta, s);
              const active = meta.skin === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => onSkin(s.id)}
                  disabled={!unlocked}
                  className={`panel-cut relative flex items-center gap-4 p-3.5 text-left transition ${
                    active ? "!border-[#25e8c8]" : "hover:border-[#3d558f]"
                  } ${unlocked ? "cursor-pointer" : "opacity-100"}`}
                >
                  <div
                    className="relative h-12 w-24 shrink-0 overflow-hidden"
                    style={{ background: s.body, clipPath: "polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)" }}
                  >
                    {s.pattern === "tiger" &&
                      [8, 26, 44, 62, 80].map((lx, i) => (
                        <div
                          key={lx}
                          className="absolute top-0 h-full w-2.5"
                          style={{ left: lx, background: "#17120a", transform: `rotate(${i % 2 ? 14 : -14}deg)` }}
                        />
                      ))}
                    {s.pattern === "zebra" &&
                      [6, 22, 38, 54, 70, 86].map((lx, i) => (
                        <div
                          key={lx}
                          className="absolute top-0 h-full w-2"
                          style={{ left: lx, background: "#141414", transform: `rotate(${i % 2 ? -18 : 18}deg)` }}
                        />
                      ))}
                    {s.pattern === "dots" &&
                      [
                        [14, 10], [42, 30], [70, 12], [30, 36], [60, 38], [86, 30],
                      ].map(([dx, dy], i) => (
                        <div
                          key={i}
                          className="absolute h-3 w-3 rounded-full bg-[#14100f]"
                          style={{ left: dx, top: dy }}
                        />
                      ))}
                    {s.pattern === "shine" && (
                      <div
                        className="absolute top-[-10px] h-[70px] w-4 bg-[rgba(255,255,255,0.45)]"
                        style={{ left: 40, transform: "rotate(24deg)" }}
                      />
                    )}
                    {!s.pattern && (
                      <div className="absolute left-0 top-1/2 h-3 w-full -translate-y-1/2" style={{ background: s.stripe }} />
                    )}
                    <div className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white" />
                    <div className="absolute left-[18px] top-1/2 h-3.5 w-1 -translate-y-1/2" style={{ background: "#2e6bff" }} />
                    <div className="absolute left-4 top-1/2 h-1 w-3.5 -translate-y-1/2" style={{ background: "#2e6bff" }} />
                    {!unlocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[rgba(6,10,22,0.72)]">
                        <IconLock className="h-5 w-5 text-[#8fa0c8]" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-disp text-[14px] text-white">{s.name}</span>
                      {s.rare && (
                        <span
                          className="bg-[#ffcf3f] px-1.5 py-0.5 text-[9px] font-black tracking-wider text-[#231a00]"
                          style={{ clipPath: "polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)" }}
                        >
                          РЕДКАЯ
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#a9b8dc]">
                      {!unlocked && s.ach ? (
                        <span className="text-[#ff8b98]">Достижение: {ACH_BY_ID[s.ach]?.name}</span>
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
  rewardActive,
  rewardBusy,
  rewardKey,
  newAchs,
  onContinueAd,
  onRetry,
  onGarage,
  onMenu,
}: {
  stats: GameStats;
  best: number;
  isRecord: boolean;
  rewardActive: boolean;
  rewardBusy: boolean;
  rewardKey: number;
  newAchs: AchievementDef[];
  onContinueAd: () => void;
  onRetry: () => void;
  onGarage: () => void;
  onMenu: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[rgba(6,4,12,0.85)]">
      <div className="panel-cut pop-in max-h-[96vh] w-[560px] max-w-[94vw] overflow-y-auto">
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

          {newAchs.length > 0 && (
            <div className="mt-4 flex flex-col gap-1.5">
              {newAchs.map((a, i) => (
                <div
                  key={a.id}
                  className="pop-in flex items-center gap-2.5 border border-[#2f9e63] bg-[rgba(61,220,107,0.1)] px-3.5 py-2"
                  style={{ animationDelay: `${i * 0.12}s`, clipPath: "polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)" }}
                >
                  <IconMedal className="h-5 w-5 shrink-0 text-[#ffcf3f]" />
                  <div className="min-w-0">
                    <div className="font-disp text-[13px] text-[#5dff9e]">ДОСТИЖЕНИЕ: {a.name}</div>
                    <div className="truncate text-[11px] text-[#a9b8dc]">
                      {a.desc}
                      {a.skin && <span className="text-[#ffe27a]"> · открыт скин «{SKINS.find((s) => s.id === a.skin)?.name}»</span>}
                    </div>
                  </div>
                </div>
              ))}
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
            {/* rewarded continue — visible for 4 seconds only */}
            {rewardActive && (
              <div key={rewardKey} className="relative">
                <button
                  className="btn-game btn-yellow w-full !py-4 !text-lg"
                  disabled={rewardBusy}
                  onClick={onContinueAd}
                >
                  <span className="flex items-center justify-center gap-2.5">
                    <IconFuel className="h-5 w-5" />
                    {rewardBusy ? "ПОКАЗЫВАЕМ РЕКЛАМУ..." : "ПРОДОЛЖИТЬ ЗА РЕКЛАМУ — БАК ПОЛНЫЙ"}
                  </span>
                </button>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden bg-[#0a1122]">
                  <div key={`bar-${rewardKey}`} className="reward-drain h-full bg-[#f2b70a]" />
                </div>
                <div className="mt-1 text-center text-[10px] font-bold tracking-widest text-[#8fa0c8]">
                  ПРЕДЛОЖЕНИЕ ИСЧЕЗНЕТ ЧЕРЕЗ 4 СЕКУНДЫ
                </div>
              </div>
            )}

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
