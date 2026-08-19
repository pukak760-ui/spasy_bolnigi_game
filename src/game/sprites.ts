// ---- procedural canvas sprites ----
import type { SkinDef } from "./meta";

export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/** Ambulance drawn centered at 0,0 facing +X. w = 76, h = 40. */
export function drawAmbulance(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  skin: SkinDef,
  phase: number,
  sirenOn: boolean,
  braking: boolean,
  night: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  rr(ctx, -36, -18, 76, 40, 10);
  ctx.fill();

  // wheels
  ctx.fillStyle = "#10131a";
  for (const wx of [-22, 20]) {
    rr(ctx, wx - 8, -23, 16, 8, 3);
    ctx.fill();
    rr(ctx, wx - 8, 15, 16, 8, 3);
    ctx.fill();
  }

  // body
  ctx.fillStyle = skin.body;
  rr(ctx, -38, -19, 76, 38, 9);
  ctx.fill();

  // rare paint patterns (clipped to body)
  if (skin.pattern) {
    ctx.save();
    rr(ctx, -38, -19, 76, 38, 9);
    ctx.clip();
    if (skin.pattern === "tiger") {
      ctx.fillStyle = "#1a1208";
      ctx.save();
      ctx.rotate(-0.45);
      for (let i = -80; i < 80; i += 24) {
        ctx.fillRect(i, -50, 9, 100);
      }
      ctx.restore();
    } else if (skin.pattern === "zebra") {
      ctx.fillStyle = "#141414";
      for (let i = -36; i < 40; i += 15) {
        ctx.save();
        ctx.translate(i, 0);
        ctx.rotate(0.12);
        ctx.fillRect(0, -26, 7, 52);
        ctx.restore();
      }
    } else {
      // ladybug: dark head zone + black spots
      ctx.fillStyle = "#141414";
      ctx.fillRect(-38, -19, 12, 38);
      const dots: [number, number][] = [
        [-16, -10],
        [-16, 10],
        [2, -11],
        [2, 11],
        [18, -8],
        [18, 8],
        [-4, 0],
      ];
      for (const [dx, dy] of dots) {
        ctx.beginPath();
        ctx.arc(dx, dy, 4.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  ctx.strokeStyle = "rgba(10,14,26,0.55)";
  ctx.lineWidth = 2;
  rr(ctx, -38, -19, 76, 38, 9);
  ctx.stroke();

  // stripe
  ctx.fillStyle = skin.stripe;
  ctx.fillRect(-38, -6, 60, 12);
  // star of life (simplified cross in circle)
  ctx.fillStyle = skin.body;
  ctx.beginPath();
  ctx.arc(-14, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2e6bff";
  ctx.beginPath();
  ctx.arc(-14, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillRect(-17.5, -2, 7, 4);
  ctx.fillRect(-16, -5.5, 4, 11);

  // cabin / windshield
  ctx.fillStyle = "#9fd7ff";
  rr(ctx, 14, -16, 14, 32, 4);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillRect(16, -14, 3, 28);

  // hood
  ctx.fillStyle = shade(skin.body, -18);
  rr(ctx, 28, -16, 10, 32, 4);
  ctx.fill();

  // roof box
  ctx.fillStyle = shade(skin.body, -30);
  rr(ctx, -30, -12, 40, 24, 5);
  ctx.fill();
  ctx.fillStyle = skin.stripe;
  ctx.fillRect(-30, -3, 40, 6);

  // light bar
  ctx.fillStyle = "#1a2030";
  rr(ctx, -12, -9, 14, 18, 3);
  ctx.fill();
  const red = sirenOn ? (phase < 0.5 ? 1 : 0.15) : 0.25;
  const blue = sirenOn ? (phase < 0.5 ? 0.15 : 1) : 0.25;
  ctx.fillStyle = `rgba(255,45,64,${red})`;
  rr(ctx, -11, -8, 6, 16, 2);
  ctx.fill();
  ctx.fillStyle = `rgba(46,107,255,${blue})`;
  rr(ctx, -1, -8, 6, 16, 2);
  ctx.fill();

  // headlights
  ctx.fillStyle = night > 0.25 ? "#fff6c8" : "#e8eef8";
  rr(ctx, 36, -15, 4, 8, 2);
  ctx.fill();
  rr(ctx, 36, 7, 4, 8, 2);
  ctx.fill();

  // tail / brake lights
  ctx.fillStyle = braking ? "#ff2038" : "#b83240";
  rr(ctx, -40, -15, 4, 8, 2);
  ctx.fill();
  rr(ctx, -40, 7, 4, 8, 2);
  ctx.fill();

  ctx.restore();
}

/** Traffic car centered, facing +X. */
export function drawTrafficCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  color: string,
  braking: boolean,
  night: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  rr(ctx, -26, -13, 54, 28, 8);
  ctx.fill();
  ctx.fillStyle = "#10131a";
  for (const wx of [-15, 14]) {
    rr(ctx, wx - 6, -16, 12, 5, 2);
    ctx.fill();
    rr(ctx, wx - 6, 11, 12, 5, 2);
    ctx.fill();
  }
  ctx.fillStyle = color;
  rr(ctx, -27, -14, 56, 28, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = shade(color, -35);
  rr(ctx, -16, -11, 22, 22, 4);
  ctx.fill();
  ctx.fillStyle = "#a8dcff";
  rr(ctx, 6, -11, 8, 22, 3);
  ctx.fill();
  rr(ctx, -14, -11, 6, 22, 3);
  ctx.fill();
  ctx.fillStyle = night > 0.25 ? "#fff3bd" : "#e6ecf6";
  rr(ctx, 27, -11, 3, 6, 1.5);
  ctx.fill();
  rr(ctx, 27, 5, 3, 6, 1.5);
  ctx.fill();
  ctx.fillStyle = braking ? "#ff2038" : "#932633";
  rr(ctx, -29, -11, 3, 6, 1.5);
  ctx.fill();
  rr(ctx, -29, 5, 3, 6, 1.5);
  ctx.fill();
  ctx.restore();
}

const PATIENT_SHIRTS = ["#ffb347", "#7bd389", "#6db4ff", "#e88ad0", "#f7f06a"];

/** Sick person waiting: body + pulsing hp ring + diagnosis bubble. */
export function drawPatient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  t: number,
  hp01: number,
  seed: number,
  critical: boolean
) {
  const bob = Math.sin(t * 3 + seed * 9) * 1.6;
  const shirt = PATIENT_SHIRTS[Math.floor(seed * PATIENT_SHIRTS.length) % PATIENT_SHIRTS.length];
  ctx.save();
  ctx.translate(x, y);

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 14, 11, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // ground marker ring
  const pulse = 0.6 + Math.sin(t * (critical ? 9 : 4)) * 0.4;
  ctx.strokeStyle = critical ? `rgba(255,32,56,${0.4 + pulse * 0.5})` : `rgba(255,207,63,${0.35 + pulse * 0.3})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 24 + pulse * 4, 0, Math.PI * 2);
  ctx.stroke();

  // legs
  ctx.fillStyle = "#33406b";
  ctx.fillRect(-6, 4 + bob * 0.3, 5, 10);
  ctx.fillRect(1, 4 + bob * 0.3, 5, 10);
  // body
  ctx.fillStyle = shirt;
  rr(ctx, -8, -8 + bob, 16, 15, 5);
  ctx.fill();
  // arms raised for help
  ctx.strokeStyle = shirt;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-7, -4 + bob);
  ctx.lineTo(-13, -12 + bob * 1.4);
  ctx.moveTo(7, -4 + bob);
  ctx.lineTo(13, -12 - bob * 1.4);
  ctx.stroke();
  // head
  ctx.fillStyle = "#ffd9b0";
  ctx.beginPath();
  ctx.arc(0, -14 + bob, 7, 0, Math.PI * 2);
  ctx.fill();
  // sick face: green tint + dizzy eyes
  ctx.fillStyle = "rgba(120,200,120,0.35)";
  ctx.beginPath();
  ctx.arc(0, -14 + bob, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3c2a1a";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-4, -16 + bob);
  ctx.lineTo(-1.5, -14 + bob);
  ctx.moveTo(-1.5, -16 + bob);
  ctx.lineTo(-4, -14 + bob);
  ctx.moveTo(1.5, -16 + bob);
  ctx.lineTo(4, -14 + bob);
  ctx.moveTo(4, -16 + bob);
  ctx.lineTo(1.5, -14 + bob);
  ctx.stroke();
  // mouth
  ctx.beginPath();
  ctx.arc(0, -9.5 + bob, 2.2, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();

  // hp arc
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI * 2);
  ctx.stroke();
  const col = hp01 > 0.5 ? "#3ddc6b" : hp01 > 0.25 ? "#ffcf3f" : "#ff2038";
  ctx.strokeStyle = col;
  ctx.beginPath();
  ctx.arc(0, 0, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.02, hp01));
  ctx.stroke();

  // help bubble
  const by = -34 + Math.sin(t * 5 + seed * 7) * 2;
  ctx.fillStyle = "#fff";
  rr(ctx, -13, by - 12, 26, 17, 6);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-3, by + 5);
  ctx.lineTo(3, by + 5);
  ctx.lineTo(0, by + 10);
  ctx.closePath();
  ctx.fill();
  // cross
  ctx.fillStyle = critical ? "#ff2038" : "#ff3b4e";
  ctx.fillRect(-2.5, by - 9, 5, 11);
  ctx.fillRect(-6.5, by - 5, 13, 4);

  ctx.restore();
}

export function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(3, r * 0.5, r * 0.9, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5a3b22";
  ctx.fillRect(-3, -4, 6, r * 0.8);
  const g1 = seed > 0.5 ? "#1f8f4e" : "#239c56";
  ctx.fillStyle = g1;
  ctx.beginPath();
  ctx.arc(-r * 0.3, -r * 0.4, r * 0.55, 0, Math.PI * 2);
  ctx.arc(r * 0.32, -r * 0.35, r * 0.5, 0, Math.PI * 2);
  ctx.arc(0, -r * 0.75, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.beginPath();
  ctx.arc(-r * 0.15, -r * 0.7, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawCross(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x - s * 0.18, y - s * 0.55, s * 0.36, s * 1.1);
  ctx.fillRect(x - s * 0.55, y - s * 0.18, s * 1.1, s * 0.36);
}

/** Heart for lives display (canvas-free: used in DOM svg too — keep for canvas floaters). */
export function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 20, s / 20);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-12, -6, -6, -16, 0, -8);
  ctx.bezierCurveTo(6, -16, 12, -6, 0, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
  return `rgb(${r},${g},${b})`;
}
