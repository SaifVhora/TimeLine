import { h, useEffect, useRef } from "../react.js";

/* One canvas, all stars. The old version animated ~240 separate DOM elements
   with CSS — a constant tax on layout and the GPU. This draws the same sky
   (plus gentle parallax drift) in a single paint per frame, and stops
   entirely when reduced-motion is on or the tab is hidden. */
export function Stars({ width, height, T, density = 14 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;                     /* no canvas, no starfield — never a white screen */
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = width * dpr; canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let seed = 20260727;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    const n = Math.min(240, Math.round(width / density));
    const stars = Array.from({ length: n }, () => ({
      x: rnd() * width, y: rnd() * height, r: rnd() * 1.5 + 0.4,
      o: rnd() * 0.5 + 0.15, p: rnd() * 6.28, s: rnd() * 0.6 + 0.2,
      drift: rnd() * 0.05 + 0.01, tw: rnd() > 0.55,
    }));

    const nebula = (x, y, w, hgt, color) => {
      const g = ctx.createRadialGradient(x + w / 2, y + hgt / 2, 0, x + w / 2, y + hgt / 2, Math.max(w, hgt) / 2);
      g.addColorStop(0, color); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(x - 40, y - 40, w + 80, hgt + 80);
    };

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, t = 0, running = true;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      nebula(width * 0.06, height * 0.06, 520, 320, T.nebulaA);
      nebula(width * 0.5, height * 0.3, 640, 400, T.nebulaB);
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const o = s.tw && !still ? s.o * (0.5 + 0.5 * Math.sin(t * s.s + s.p)) : s.o;
        if (!still) { s.x -= s.drift; if (s.x < -2) s.x = width + 2; }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.283);
        ctx.fillStyle = "rgba(" + T.star + "," + o.toFixed(3) + ")";
        ctx.fill();
      }
      t += 0.03;
      if (!still && running) raf = requestAnimationFrame(draw);
    };

    const onVis = () => {
      if (document.hidden) { running = false; cancelAnimationFrame(raf); }
      else if (!still) { running = true; raf = requestAnimationFrame(draw); }
    };
    document.addEventListener("visibilitychange", onVis);
    draw();

    return () => { running = false; cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", onVis); };
  }, [width, height, T, density]);

  return h("canvas", { ref, style: { position: "absolute", inset: 0, width, height, pointerEvents: "none" } });
}
