// ---- procedural city: roads grid, buildings, hospital, gas stations, parks ----
import { drawCross, rr } from "./sprites";

export const SIZE = 3600;
export const B = 450; // block pitch
export const RW = 88; // road width
export const HALF = RW / 2;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  seed: number;
}

export interface GasStation {
  x: number;
  y: number;
  r: number; // refuel zone
  canopy: Rect;
  pump: Rect;
}

export interface WorldData {
  size: number;
  buildings: Rect[];
  parks: Rect[];
  hospital: { bld: Rect; bayX: number; bayY: number; bayR: number };
  gas: GasStation[];
  trees: { x: number; y: number; r: number; seed: number }[];
  lamps: { x: number; y: number }[];
  tile: HTMLCanvasElement;
  minimap: HTMLCanvasElement;
}

const BLD_COLORS = ["#8d5a9e", "#b0685f", "#4f7fb0", "#5d8f6e", "#9c8250", "#6b6f9e", "#a05a74", "#4e8a9c", "#87715a"];

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

export function isOnRoad(x: number, y: number): boolean {
  const mx = ((x % B) + B) % B;
  const my = ((y % B) + B) % B;
  return mx < RW || my < RW;
}

export function genWorld(): WorldData {
  const buildings: Rect[] = [];
  const parks: Rect[] = [];
  const trees: { x: number; y: number; r: number; seed: number }[] = [];
  const lamps: { x: number; y: number }[] = [];
  const gas: GasStation[] = [];

  const blocksN = Math.round(SIZE / B); // 8
  const hospitalBlock = { i: 4, j: 3 };
  const gasBlocks = [
    { i: 1, j: 1 },
    { i: 6, j: 2 },
    { i: 2, j: 6 },
  ];
  const parkBlocks = [
    { i: 5, j: 5 },
    { i: 2, j: 3 },
    { i: 6, j: 6 },
  ];

  const isSpecial = (i: number, j: number) =>
    (i === hospitalBlock.i && j === hospitalBlock.j) ||
    gasBlocks.some((g) => g.i === i && g.j === j) ||
    parkBlocks.some((p) => p.i === i && p.j === j);

  for (let j = 0; j < blocksN; j++) {
    for (let i = 0; i < blocksN; i++) {
      const x0 = i * B + HALF;
      const y0 = j * B + HALF;
      const bw = B - RW;
      if (parkBlocks.some((p) => p.i === i && p.j === j)) {
        parks.push({ x: x0, y: y0, w: bw, h: bw, color: "#2c7a4b", seed: Math.random() });
        const n = 6;
        for (let k = 0; k < n; k++) {
          trees.push({
            x: x0 + 50 + Math.random() * (bw - 100),
            y: y0 + 50 + Math.random() * (bw - 100),
            r: 16 + Math.random() * 12,
            seed: Math.random(),
          });
        }
        continue;
      }
      if (isSpecial(i, j)) continue;
      // normal block: 1-2 buildings inside sidewalk margin
      const m = 46;
      const split = Math.random() < 0.45;
      if (!split) {
        buildings.push({
          x: x0 + m,
          y: y0 + m,
          w: bw - m * 2,
          h: bw - m * 2,
          color: BLD_COLORS[Math.floor(Math.random() * BLD_COLORS.length)],
          seed: Math.random(),
        });
      } else {
        const horiz = Math.random() < 0.5;
        if (horiz) {
          const h1 = (bw - m * 2 - 26) * (0.4 + Math.random() * 0.2);
          buildings.push({ x: x0 + m, y: y0 + m, w: bw - m * 2, h: h1, color: pick(BLD_COLORS), seed: Math.random() });
          buildings.push({
            x: x0 + m,
            y: y0 + m + h1 + 26,
            w: bw - m * 2,
            h: bw - m * 2 - h1 - 26,
            color: pick(BLD_COLORS),
            seed: Math.random(),
          });
        } else {
          const w1 = (bw - m * 2 - 26) * (0.4 + Math.random() * 0.2);
          buildings.push({ x: x0 + m, y: y0 + m, w: w1, h: bw - m * 2, color: pick(BLD_COLORS), seed: Math.random() });
          buildings.push({
            x: x0 + m + w1 + 26,
            y: y0 + m,
            w: bw - m * 2 - w1 - 26,
            h: bw - m * 2,
            color: pick(BLD_COLORS),
            seed: Math.random(),
          });
        }
      }
      // corner trees on sidewalks
      if (Math.random() < 0.7) {
        const cx = Math.random() < 0.5 ? x0 + 22 : x0 + bw - 22;
        const cy = Math.random() < 0.5 ? y0 + 22 : y0 + bw - 22;
        trees.push({ x: cx, y: cy, r: 12 + Math.random() * 5, seed: Math.random() });
      }
    }
  }

  // hospital
  const hx = hospitalBlock.i * B + HALF;
  const hy = hospitalBlock.j * B + HALF;
  const hbw = B - RW;
  const hospital = {
    bld: { x: hx + 40, y: hy + 90, w: hbw - 80, h: hbw - 130, color: "#e8edf7", seed: 0.5 },
    bayX: hx + hbw / 2,
    bayY: hy + 52,
    bayR: 86,
  };
  buildings.push(hospital.bld);

  // gas stations
  for (const gb of gasBlocks) {
    const gx = gb.i * B + HALF;
    const gy = gb.j * B + HALF;
    const canopy: Rect = { x: gx + 70, y: gy + 120, w: 200, h: 130, color: "#d8dee9", seed: Math.random() };
    const pump: Rect = { x: gx + 150, y: gy + 165, w: 40, h: 44, color: "#ffcf3f", seed: 0.3 };
    buildings.push(canopy);
    buildings.push(pump);
    gas.push({ x: pump.x + pump.w / 2, y: pump.y + pump.h / 2 + 34, r: 78, canopy, pump });
  }

  // lamps at grid corners offset onto sidewalks
  for (let j = 0; j <= blocksN; j++) {
    for (let i = 0; i <= blocksN; i++) {
      lamps.push({ x: i * B + HALF + 16, y: j * B + HALF + 16 });
    }
  }

  return {
    size: SIZE,
    buildings,
    parks,
    hospital,
    gas,
    trees,
    lamps,
    tile: makeTile(),
    minimap: makeMinimap(hospital, gas, parks),
  };
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** One periodic block tile: road on left + top edges, sidewalk, grass. */
function makeTile(): HTMLCanvasElement {
  const c = makeCanvas(B, B);
  const g = c.getContext("2d")!;

  // grass base
  g.fillStyle = "#2f7d4f";
  g.fillRect(0, 0, B, B);
  // grass texture
  for (let i = 0; i < 220; i++) {
    g.fillStyle = Math.random() < 0.5 ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.05)";
    const x = Math.random() * B;
    const y = Math.random() * B;
    g.fillRect(x, y, 2 + Math.random() * 3, 2 + Math.random() * 3);
  }

  // sidewalks along road edges (left and top of tile)
  g.fillStyle = "#8f99ad";
  g.fillRect(RW, 0, 26, B);
  g.fillRect(0, RW, B, 26);
  g.fillStyle = "#7c8598";
  g.fillRect(RW, 0, 4, B);
  g.fillRect(0, RW, B, 4);
  // sidewalk seams
  g.strokeStyle = "rgba(0,0,0,0.15)";
  g.lineWidth = 1;
  for (let y = 0; y < B; y += 40) {
    g.beginPath();
    g.moveTo(RW, y);
    g.lineTo(RW + 26, y);
    g.stroke();
  }
  for (let x = 0; x < B; x += 40) {
    g.beginPath();
    g.moveTo(x, RW);
    g.lineTo(x, RW + 26);
    g.stroke();
  }

  // asphalt roads (left edge vertical, top edge horizontal)
  g.fillStyle = "#2c323f";
  g.fillRect(0, 0, RW, B);
  g.fillRect(0, 0, B, RW);
  // asphalt speckles
  for (let i = 0; i < 260; i++) {
    g.fillStyle = "rgba(255,255,255,0.035)";
    const vertical = Math.random() < 0.5;
    const x = vertical ? Math.random() * RW : Math.random() * B;
    const y = vertical ? Math.random() * B : Math.random() * RW;
    g.fillRect(x, y, 2, 2);
  }
  // road edge lines
  g.fillStyle = "#c9cedb";
  g.fillRect(RW - 6, RW, 3, B - RW);
  g.fillRect(RW, RW - 6, B - RW, 3);
  // center dashed line (yellow)
  g.fillStyle = "#e8b83a";
  for (let y = RW + 8; y < B; y += 46) g.fillRect(HALF - 2, y, 4, 24);
  for (let x = RW + 8; x < B; x += 46) g.fillRect(x, HALF - 2, 24, 4);
  // crosswalks at intersection exits
  g.fillStyle = "rgba(240,244,255,0.75)";
  for (let i = 0; i < 5; i++) {
    g.fillRect(8 + i * 16, RW + 4, 9, 18); // below intersection, vertical road
    g.fillRect(RW + 4, 8 + i * 16, 18, 9); // right of intersection, horizontal road
  }
  // patches & manholes
  g.fillStyle = "rgba(0,0,0,0.18)";
  rr(g, 14, 180, 46, 70, 8);
  g.fill();
  g.fillStyle = "#232936";
  g.beginPath();
  g.arc(HALF, 300, 8, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "rgba(255,255,255,0.12)";
  g.lineWidth = 1.5;
  g.stroke();

  return c;
}

function makeMinimap(
  hospital: WorldData["hospital"],
  gas: GasStation[],
  parks: Rect[]
): HTMLCanvasElement {
  const S = 176;
  const c = makeCanvas(S, S);
  const g = c.getContext("2d")!;
  const k = S / SIZE;
  g.fillStyle = "#0b1226";
  g.fillRect(0, 0, S, S);
  // parks
  g.fillStyle = "#1d5c39";
  for (const p of parks) g.fillRect(p.x * k, p.y * k, p.w * k, p.h * k);
  // roads
  g.strokeStyle = "#3d4c74";
  g.lineWidth = Math.max(2, RW * k);
  for (let i = 0; i <= 8; i++) {
    g.beginPath();
    g.moveTo(i * B * k, 0);
    g.lineTo(i * B * k, S);
    g.stroke();
    g.beginPath();
    g.moveTo(0, i * B * k);
    g.lineTo(S, i * B * k);
    g.stroke();
  }
  // hospital
  g.fillStyle = "#ff3b4e";
  g.fillRect((hospital.bld.x + hospital.bld.w / 2) * k - 5, (hospital.bld.y + hospital.bld.h / 2) * k - 5, 10, 10);
  g.fillStyle = "#fff";
  drawCross(g, (hospital.bld.x + hospital.bld.w / 2) * k, (hospital.bld.y + hospital.bld.h / 2) * k, 7, "#fff");
  // gas
  for (const st of gas) {
    g.fillStyle = "#ffcf3f";
    g.fillRect(st.x * k - 3, st.y * k - 3, 6, 6);
  }
  // frame
  g.strokeStyle = "#2a3f73";
  g.lineWidth = 2;
  g.strokeRect(1, 1, S - 2, S - 2);
  return c;
}

// ---- building rendering (called per frame, culled) ----
export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  b: Rect,
  night: number,
  t: number,
  isHospital: boolean
) {
  ctx.save();
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(b.x + 8, b.y + 10, b.w, b.h);
  // base
  ctx.fillStyle = b.color;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  // roof border
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 3;
  ctx.strokeRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3);
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(b.x + 7, b.y + 7, b.w - 14, b.h - 14);

  // windows grid
  const cell = 34;
  const cols = Math.floor((b.w - 30) / cell);
  const rows = Math.floor((b.h - 30) / cell);
  const ox = b.x + (b.w - cols * cell) / 2;
  const oy = b.y + (b.h - rows * cell) / 2;
  let n = Math.floor(b.seed * 997);
  for (let r = 0; r < rows; r++) {
    for (let cc = 0; cc < cols; cc++) {
      n = (n * 16807 + 11) % 2147483647;
      const litRand = (n % 100) / 100;
      const wx = ox + cc * cell + 6;
      const wy = oy + r * cell + 6;
      if (isHospital) {
        ctx.fillStyle = night > 0.3 && litRand < 0.7 ? "#fff3c4" : "#b8c6dd";
        ctx.fillRect(wx, wy, cell - 14, cell - 14);
        if ((r + cc) % 4 === 0) {
          ctx.fillStyle = "#ff3b4e";
          ctx.fillRect(wx + 3, wy + 3, cell - 20, cell - 20);
        }
      } else {
        const lit = night > 0.3 && litRand < 0.55;
        ctx.fillStyle = lit ? "#ffd98a" : "rgba(18,26,48,0.75)";
        ctx.fillRect(wx, wy, cell - 14, cell - 14);
        if (lit) {
          ctx.fillStyle = "rgba(255,217,138,0.25)";
          ctx.fillRect(wx - 2, wy - 2, cell - 10, cell - 10);
        }
      }
    }
  }

  // AC boxes
  n = Math.floor(b.seed * 555);
  for (let i = 0; i < 3; i++) {
    n = (n * 16807 + 11) % 2147483647;
    const ax = b.x + 14 + (n % Math.max(1, b.w - 40));
    const ay = b.y + 14 + ((n >> 4) % Math.max(1, b.h - 40));
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(ax, ay, 14, 10);
  }

  if (isHospital) {
    // big red cross on roof + pad
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cx, cy, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ff3b4e";
    ctx.lineWidth = 5;
    ctx.stroke();
    drawCross(ctx, cx, cy, 52, "#ff3b4e");
    // helipad ring
    ctx.strokeStyle = "rgba(255,207,63,0.8)";
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.arc(cx, cy, 58 + Math.sin(t * 2) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}
