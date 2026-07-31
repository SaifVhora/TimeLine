import { h, useState, useMemo } from "../react.js";
import { DISPLAY, MONO } from "../theme.js";
import { useT, useInput, Btn } from "../ui/atoms.js";
import { Stars } from "../ui/stars.js";
import { Plus, X, Trash } from "../icons.js";

const COARSE = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

export function Hub(p) {
  const T = useT();
  const input = useInput();
  const [hover, setHover] = useState(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const n = p.servers.length;
  const nodes = useMemo(() => p.servers.map((s, i) => {
    const angle = (i / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2;
    const radius = 33 + (i % 2 ? 5 : 0);
    return { s, x: 50 + Math.cos(angle) * radius, y: 50 + Math.sin(angle) * radius * 0.92,
      count: p.events.filter((e) => e.serverId === s.id).length };
  }), [p.servers, p.events, n]);

  return h("div", { className: "h-full flex flex-col relative" },
    h("div", { className: "absolute inset-0 pointer-events-none" }, h(Stars, { width: 1400, height: 900, T, density: 11 })),
    h("div", { className: "relative px-4 pt-5 pb-1 text-center shrink-0" },
      h("div", { style: { fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.24em", color: T.muted } }, "SELECT A SERVER")),

    h("div", { className: "relative flex-1 min-h-0 mx-auto w-full", style: { maxWidth: 760 } },
      h("svg", { viewBox: "0 0 100 100", preserveAspectRatio: "xMidYMid meet", className: "absolute inset-0 w-full h-full", style: { overflow: "visible" } },
        h("defs", null, h("radialGradient", { id: "halo" },
          h("stop", { offset: "0%", stopColor: T.current, stopOpacity: "0.5" }),
          h("stop", { offset: "100%", stopColor: T.current, stopOpacity: "0" }))),
        h("circle", { cx: "50", cy: "50", r: "26", fill: "url(#halo)", opacity: "0.35" }),
        nodes.map(({ s, x, y }) => h("line", { key: s.id, x1: "50", y1: "50", x2: x, y2: y, className: "ray",
          stroke: T.current, strokeWidth: hover === s.id ? 0.5 : 0.22, opacity: hover === s.id ? 0.95 : 0.42,
          style: { transition: "stroke-width .2s ease, opacity .2s ease" } }))),

      h("div", { className: "absolute", style: { left: "50%", top: "50%", transform: "translate(-50%,-50%)" } },
        h("div", { className: "core absolute", style: { left: "50%", top: "50%", transform: "translate(-50%,-50%)",
          width: 130, height: 130, borderRadius: "50%", background: "radial-gradient(closest-side, " + T.bloom + ", transparent)" } }),
        h("div", { className: "absolute", style: { left: "50%", top: "50%", transform: "translate(-50%,-50%)",
          width: 20, height: 20, borderRadius: "50%", background: T.current, boxShadow: "0 0 24px " + T.current + ", 0 0 60px " + T.bloom } }),
        h("div", { className: "absolute breathe", style: { left: "50%", top: "50%", transform: "translate(-50%,-50%) rotate(45deg)",
          width: 44, height: 44, border: "1px solid " + T.current, opacity: 0.3, borderRadius: 6 } })),

      nodes.map(({ s, x, y, count }) => h("button", { key: s.id,
        onMouseEnter: () => setHover(s.id), onMouseLeave: () => setHover(null),
        onClick: () => p.onEnter(s, x + "% " + y + "%"), className: "absolute text-center",
        style: { left: x + "%", top: y + "%", transform: "translate(-50%,-50%) scale(" + (hover === s.id ? 1.08 : 1) + ")",
          transition: "transform .2s ease", width: 132, background: "none", border: "none", cursor: "pointer" } },
        h("div", { style: { width: 11, height: 11, margin: "0 auto 8px", transform: "rotate(45deg)", borderRadius: 2,
          background: T.current, boxShadow: "0 0 " + (hover === s.id ? 20 : 10) + "px " + T.current, transition: "box-shadow .2s ease" } }),
        h("div", { style: { fontFamily: DISPLAY, fontSize: 15, lineHeight: 1.2, color: T.text } }, s.name),
        h("div", { style: { fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.12em", color: T.muted } },
          count + " EVENT" + (count === 1 ? "" : "S")),
        p.canManage && (hover === s.id || COARSE)
          ? h("span", { onClick: (e) => { e.stopPropagation(); p.onRemove(s.id); },
              className: "inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded",
              style: { fontFamily: MONO, fontSize: 8, color: T.danger, border: "1px solid " + T.danger + "44" } },
              h(Trash, { size: 8 }), " REMOVE")
          : null)),

      n === 0 ? h("div", { className: "absolute text-center", style: { left: "50%", top: "68%", transform: "translateX(-50%)", width: 280 } },
        h("div", { style: { fontFamily: DISPLAY, fontSize: 18 } }, "A star with nothing orbiting it"),
        h("p", { className: "mt-1.5 text-sm", style: { color: T.muted } }, "Add a server and a ray reaches out to it.")) : null),

    h("div", { className: "relative text-center pb-4 pt-1 shrink-0" },
      p.canManage && !adding ? h(Btn, { tone: "gold", onClick: () => setAdding(true) }, h(Plus, { size: 13 }), " Add a server") : null,
      p.canManage && adding ? h("div", { className: "mx-auto flex gap-2 px-4", style: { maxWidth: 360 } },
        h("input", { autoFocus: true, style: input, value: name, onChange: (e) => setName(e.target.value), placeholder: "Server name" }),
        h(Btn, { tone: "solid", disabled: !name.trim(), onClick: () => { p.onCreate(name.trim()); setName(""); setAdding(false); } }, "Add"),
        h(Btn, { onClick: () => { setAdding(false); setName(""); } }, h(X, { size: 14 }))) : null,
      h("div", { className: "mt-2", style: { fontFamily: MONO, fontSize: 9, color: T.muted, letterSpacing: "0.14em" } },
        "CLICK A NODE TO TRAVEL INTO ITS TIMELINE")));
}
