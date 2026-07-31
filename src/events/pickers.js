import { h, useState, useEffect, useMemo } from "../react.js";
import { DISPLAY, MONO, BODY } from "../theme.js";
import { useT, useInput, Label } from "../ui/atoms.js";
import { ChevronLeft, ChevronRight, BadgeCheck, X } from "../icons.js";
import { sameDay, clockParts, withClock } from "../lib/time.js";

/* month calendar — pick a day, nothing else */
export function DayPick(p) {
  const T = useT();
  const d = new Date(p.value);
  const [view, setView] = useState(() => { const v = new Date(p.value); v.setDate(1); return v; });
  useEffect(() => { const v = new Date(p.value); v.setDate(1); setView(v); }, [p.value]);

  const grid = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const pad = (first.getDay() + 6) % 7;
    const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < pad; i++) cells.push(null);
    for (let i = 1; i <= days; i++) cells.push(new Date(view.getFullYear(), view.getMonth(), i));
    return cells;
  }, [view]);

  return h("div", { className: "rounded-xl p-3", style: { background: T.panel, border: "1px solid " + T.hair } },
    h("div", { className: "flex items-center justify-between mb-2" },
      h("button", { onClick: () => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1)),
        style: { color: T.muted, background: "none", border: "none", cursor: "pointer" } }, h(ChevronLeft, { size: 16 })),
      h("span", { style: { fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em" } },
        view.toLocaleDateString(undefined, { month: "long", year: "numeric" }).toUpperCase()),
      h("button", { onClick: () => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1)),
        style: { color: T.muted, background: "none", border: "none", cursor: "pointer" } }, h(ChevronRight, { size: 16 }))),
    h("div", { className: "grid grid-cols-7 gap-1 mb-1" },
      ["M", "T", "W", "T", "F", "S", "S"].map((w, i) =>
        h("div", { key: i, className: "text-center", style: { fontFamily: MONO, fontSize: 8.5, color: T.muted } }, w))),
    h("div", { className: "grid grid-cols-7 gap-1" }, grid.map((c, i) => {
      if (!c) return h("div", { key: i });
      const sel = sameDay(c, d), today = sameDay(c, new Date());
      return h("button", { key: i, onClick: () => p.onPick(c.getFullYear(), c.getMonth(), c.getDate()),
        className: "aspect-square rounded-md",
        style: { fontFamily: MONO, fontSize: 11, cursor: "pointer",
          background: sel ? T.solidBtn : "transparent",
          color: sel ? T.solidInk : today ? T.gold : T.body,
          border: "1px solid " + (sel ? "transparent" : today ? T.gold + "66" : "transparent") } }, c.getDate());
    })));
}

/* type the time in: hour, minute, AM/PM */
export function TimeField(p) {
  const T = useT();
  const parts = clockParts(p.value);
  const [hh, setHh] = useState(String(parts.hour));
  const [mm, setMm] = useState(String(parts.minute).padStart(2, "0"));
  useEffect(() => {
    const q = clockParts(p.value);
    setHh(String(q.hour)); setMm(String(q.minute).padStart(2, "0"));
  }, [p.value]);

  const push = (hourStr, minStr, ampm) => {
    let hr = parseInt(hourStr, 10); if (isNaN(hr)) hr = 12;
    hr = Math.min(12, Math.max(1, hr));
    let mn = parseInt(minStr, 10); if (isNaN(mn)) mn = 0;
    mn = Math.min(59, Math.max(0, mn));
    p.onChange(withClock(p.value, { hour: hr, minute: mn, ampm }));
  };

  const box = { width: 62, textAlign: "center", background: T.field, border: "1px solid " + T.hair,
    borderRadius: 10, padding: "10px 6px", color: T.text, fontFamily: MONO, fontSize: 22, outline: "none" };

  return h("div", null,
    p.label ? h(Label, null, p.label) : null,
    h("div", { className: "flex items-center gap-2 flex-wrap" },
      h("input", { type: "text", inputMode: "numeric", maxLength: 2, value: hh, style: box,
        onChange: (e) => setHh(e.target.value.replace(/[^0-9]/g, "").slice(0, 2)),
        onBlur: () => push(hh, mm, parts.ampm),
        onKeyDown: (e) => { if (e.key === "Enter") push(hh, mm, parts.ampm); } }),
      h("span", { style: { fontFamily: MONO, fontSize: 22, color: T.muted } }, ":"),
      h("input", { type: "text", inputMode: "numeric", maxLength: 2, value: mm, style: box,
        onChange: (e) => setMm(e.target.value.replace(/[^0-9]/g, "").slice(0, 2)),
        onBlur: () => push(hh, mm, parts.ampm),
        onKeyDown: (e) => { if (e.key === "Enter") push(hh, mm, parts.ampm); } }),
      h("div", { className: "flex gap-1 ml-1" }, ["AM", "PM"].map((ap) =>
        h("button", { key: ap, onClick: () => push(hh, mm, ap),
          style: { padding: "9px 14px", borderRadius: 10, cursor: "pointer", fontFamily: MONO, fontSize: 12,
            border: "1px solid " + (parts.ampm === ap ? T.gold + "88" : T.hair),
            background: parts.ampm === ap ? "rgba(180,140,40,.12)" : "transparent",
            color: parts.ampm === ap ? T.gold : T.muted } }, ap))),
      h("div", { className: "flex gap-1 ml-auto" }, [["00", 0], [":15", 15], [":30", 30], [":45", 45]].map(([lab, mn]) =>
        h("button", { key: lab, onClick: () => push(hh, String(mn), parts.ampm),
          style: { padding: "6px 8px", borderRadius: 8, cursor: "pointer", fontFamily: MONO, fontSize: 9,
            border: "1px solid " + T.hair, background: "transparent", color: T.muted } }, lab)))));
}

/* chips for tagging several hosts, with suggestions from registered staff */
export function HostsInput(p) {
  const T = useT();
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const list = p.value || [];
  const add = (n) => { const v = String(n || "").trim(); if (!v) return; if (!list.includes(v)) p.onChange([...list, v]); setQ(""); };
  const matches = (p.names || []).filter((n) => n && !list.includes("@" + n) && n.toLowerCase().includes(q.toLowerCase())).slice(0, 5);

  return h("div", { className: "relative" },
    h("div", { className: "flex flex-wrap gap-1.5 p-2 rounded-[10px]",
      style: { background: T.field, border: "1px solid " + T.hair, minHeight: 44 } },
      list.map((hst) => h("span", { key: hst, className: "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs",
        style: { background: T.panel, border: "1px solid " + T.hair, color: T.text } },
        (p.names || []).includes(hst.replace(/^@/, "")) ? h(BadgeCheck, { size: 10, style: { color: T.gold } }) : null,
        hst,
        h("button", { onClick: () => p.onChange(list.filter((x) => x !== hst)),
          style: { background: "none", border: "none", color: T.muted, cursor: "pointer", padding: 0, marginLeft: 2 } },
          h(X, { size: 10 })))),
      h("input", { value: q, onFocus: () => setFocus(true), onBlur: () => setTimeout(() => setFocus(false), 150),
        onChange: (e) => setQ(e.target.value),
        onKeyDown: (e) => {
          if ((e.key === "Enter" || e.key === ",") && q.trim()) { e.preventDefault(); add(q.replace(/,/g, "")); }
          if (e.key === "Backspace" && !q && list.length) p.onChange(list.slice(0, -1));
        },
        placeholder: list.length ? "" : "Add hosts \u2014 type a name, Enter to add",
        style: { flex: 1, minWidth: 130, background: "none", border: "none", outline: "none", color: T.text, fontFamily: BODY, fontSize: 14 } })),
    focus && q && matches.length ? h("div", { className: "absolute left-0 right-0 z-10 mt-1 rounded-lg overflow-hidden",
      style: { background: T.sheet, border: "1px solid " + T.hair, boxShadow: "0 10px 30px rgba(0,0,0,.3)" } },
      matches.map((n) => h("button", { key: n, onMouseDown: (e) => { e.preventDefault(); add("@" + n); },
        className: "w-full text-left px-3 py-2 text-sm flex items-center gap-2",
        style: { background: "none", border: "none", cursor: "pointer", color: T.text, fontFamily: BODY } },
        h(BadgeCheck, { size: 12, style: { color: T.gold } }), " @" + n,
        h("span", { className: "ml-auto", style: { fontFamily: MONO, fontSize: 8.5, color: T.muted, letterSpacing: "0.1em" } }, "REGISTERED")))) : null);
}
