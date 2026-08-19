// ---- animated canvas backdrop for the main menu ----
import { useEffect, useRef } from "react";
import { drawAmbulance, rr } from "../game/sprites";
import { getSkin } from "../game/meta";

interface Bld {
  x: number;
  w: number;
  h: number;
  c: string;
  seed: number;
}

export default function MenuScene({ skinId }: { skinId: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const skin = getSkin(skinId);
    let raf = 0;
    let w = 0;
    let h = 0;

    const layerFar: Bld[] = [];
    const layerNear: Bld[] = [];
    const farW = 2400;
    const nearW = 1800;
    let x = 0;
    while (x < farW) {
      const bw = 60 + Math.random() * 90;
      layerFar.push({ x, w: bw, h: 90 + Math.random() * 160, c: "#0f1a3a", seed: Math.random() });
      x += bw + 8;
    }
    x = 0;
    while (x < nearW) {
      const bw = 80 + Math.random() * 120;
      layerNear.push({ x, w: bw, h: 60 + Math.random() * 120, c: "#16244c", seed: Math.random() });
      x += bw + 10;
    }
    const stars = Array.from({ length: 90 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.5,
      s: Math.random() * 1.6 + 0.4,
      p: Math.random() * 6,
    }));
    const crosses = Array.from({ length: 10 }, () => ({
      x: Math.random(),
      y: Math.random(),
      sp: 12 + Math.random() * 26,
      s: 5 + Math.random() * 8,
      a: 0.08 + Math.random() * 0.14,
    }));

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const t0 = performance.now();
    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#060b1d");
      sky.addColorStop(0.6, "#0d1836");
      sky.addColorStop(1, "#152551");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      // stars
      for (const s of stars) {
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.6 + s.p));
        ctx.fillStyle = `rgba(220,235,255,${tw * 0.8})`;
        ctx.fillRect(s.x * w, s.y * h, s.s, s.s);
      }
      // moon
      const mx = w * 0.8;
      const my = h * 0.16;
      const glow = ctx.createRadialGradient(mx, my, 6, mx, my, 90);
      glow.addColorStop(0, "rgba(255,244,200,0.5)");
      glow.addColorStop(1, "rgba(255,244,200,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(mx, my, 90, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff4c8";
      ctx.beginPath();
      ctx.arc(mx, my, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(210,190,140,0.5)";
      ctx.beginPath();
      ctx.arc(mx - 8, my - 6, 5, 0, Math.PI * 2);
      ctx.arc(mx + 7, my + 8, 4, 0, Math.PI * 2);
      ctx.fill();

      // drifting crosses
      for (const c of crosses) {
        const cy = ((c.y * h - t * c.sp) % (h + 40) + h + 40) % (h + 40) - 20;
        ctx.fillStyle = `rgba(255,59,78,${c.a})`;
        ctx.fillRect(c.x * w - c.s * 0.18, cy - c.s * 0.55, c.s * 0.36, c.s * 1.1);
        ctx.fillRect(c.x * w - c.s * 0.55, cy - c.s * 0.18, c.s * 1.1, c.s * 0.36);
      }

      const roadY = h * 0.78;
      // far skyline
      const offFar = (t * 14) % farW;
      for (const b of layerFar) {
        const bx = ((b.x - offFar) % farW + farW) % farW - 100;
        ctx.fillStyle = b.c;
        ctx.fillRect(bx, roadY - b.h * 0.7, b.w, b.h * 0.7);
        let n = Math.floor(b.seed * 777);
        for (let i = 0; i < 8; i++) {
          n = (n * 16807 + 11) % 2147483647;
          if (n % 3 === 0) {
            ctx.fillStyle = "rgba(255,217,138,0.5)";
            ctx.fillRect(bx + 8 + (n % Math.max(10, b.w - 20)), roadY - b.h * 0.7 + 10 + ((n >> 3) % Math.max(10, b.h * 0.5)), 4, 5);
          }
        }
      }
      // near skyline
      const offNear = (t * 34) % nearW;
      for (const b of layerNear) {
        const bx = ((b.x - offNear) % nearW + nearW) % nearW - 120;
        ctx.fillStyle = b.c;
        ctx.fillRect(bx, roadY - b.h, b.w, b.h);
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fillRect(bx, roadY - b.h, b.w, 5);
        let n = Math.floor(b.seed * 555);
        for (let i = 0; i < 10; i++) {
          n = (n * 16807 + 11) % 2147483647;
          ctx.fillStyle = n % 2 === 0 ? "rgba(255,217,138,0.75)" : "rgba(20,30,60,0.8)";
          ctx.fillRect(bx + 10 + (n % Math.max(10, b.w - 26)), roadY - b.h + 12 + ((n >> 4) % Math.max(10, b.h - 30)), 6, 8);
        }
      }

      // road
      ctx.fillStyle = "#1b2029";
      ctx.fillRect(0, roadY, w, h - roadY);
      ctx.fillStyle = "#8f99ad";
      ctx.fillRect(0, roadY, w, 10);
      ctx.fillStyle = "#7c8598";
      ctx.fillRect(0, roadY + 10, w, 3);
      // lane dashes
      const dashY = roadY + (h - roadY) * 0.55;
      ctx.fillStyle = "#e8b83a";
      const off = (t * 340) % 90;
      for (let dx = -off; dx < w; dx += 90) {
        ctx.fillRect(dx, dashY, 46, 5);
      }

      // ambulance siren glow on road
      const ax = w * 0.32;
      const ay = roadY + (h - roadY) * 0.52;
      const ph = (t * 1.7) % 1;
      const col = ph < 0.5 ? "255,45,64" : "46,107,255";
      const rg = ctx.createRadialGradient(ax, ay, 10, ax, ay, 190);
      rg.addColorStop(0, `rgba(${col},0.35)`);
      rg.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(ax, ay, 190, 0, Math.PI * 2);
      ctx.fill();

      // headlight beam
      ctx.fillStyle = "rgba(255,240,180,0.14)";
      ctx.beginPath();
      ctx.moveTo(ax + 55, ay - 12);
      ctx.lineTo(ax + 300, ay - 46);
      ctx.lineTo(ax + 300, ay + 30);
      ctx.lineTo(ax + 55, ay + 14);
      ctx.closePath();
      ctx.fill();

      // speed lines
      ctx.strokeStyle = "rgba(200,220,255,0.25)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const ly = ay - 26 + i * 13;
        const lx = ax - 70 - ((t * 500 + i * 130) % 220);
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx - 40, ly);
        ctx.stroke();
      }

      // ambulance
      const bounce = Math.sin(t * 11) * 2.2;
      ctx.save();
      ctx.translate(ax, ay + bounce);
      ctx.scale(1.55, 1.55);
      ctx.translate(-ax, -ay - bounce);
      drawAmbulance(ctx, ax, ay + bounce, 0, skin, ph, true, false, 0.8);
      ctx.restore();

      // exhaust puffs
      for (let i = 0; i < 3; i++) {
        const pt = (t * 1.4 + i * 0.33) % 1;
        ctx.fillStyle = `rgba(150,160,180,${0.3 * (1 - pt)})`;
        ctx.beginPath();
        ctx.arc(ax - 70 - pt * 70, ay + 16 - pt * 12, 4 + pt * 10, 0, Math.PI * 2);
        ctx.fill();
      }

      // foreground curb
      ctx.fillStyle = "#0c1120";
      rr(ctx, -2, h - 14, w + 4, 16, 0);
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [skinId]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}
