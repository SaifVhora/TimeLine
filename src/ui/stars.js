import { h, useMemo } from "../react.js";

export function Stars({ width, height, T, density = 14 }) {
  const stars = useMemo(() => {
    let seed = 20260727;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    const n = Math.min(240, Math.round(width / density));
    return Array.from({ length: n }, () => ({
      x: rnd() * width, y: rnd() * height, r: rnd() * 1.5 + 0.4,
      o: rnd() * 0.5 + 0.15, d: rnd() * 6, tw: rnd() > 0.55,
    }));
  }, [width, height, density]);
  return h("div", { className: "absolute inset-0 pointer-events-none", style: { overflow: "hidden" } },
    h("div", { className: "absolute", style: { left: "6%", top: "6%", width: 520, height: 320, borderRadius: "50%",
      background: "radial-gradient(closest-side, " + T.nebulaA + ", transparent)", filter: "blur(12px)" } }),
    h("div", { className: "absolute", style: { left: "50%", top: "34%", width: 640, height: 400, borderRadius: "50%",
      background: "radial-gradient(closest-side, " + T.nebulaB + ", transparent)", filter: "blur(14px)" } }),
    stars.map((s, i) => h("span", { key: i, className: s.tw ? "twinkle" : "",
      style: { position: "absolute", left: s.x, top: s.y, width: s.r * 2, height: s.r * 2, borderRadius: "50%",
        background: "rgba(" + T.star + "," + s.o + ")", animationDelay: s.d + "s" } })));
}
