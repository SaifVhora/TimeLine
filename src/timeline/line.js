import { h, useState, useEffect, useMemo, useCallback, useRef, Fragment } from "../react.js";
import { DISPLAY, MONO } from "../theme.js";
import { useT, Btn } from "../ui/atoms.js";
import { Stars } from "../ui/stars.js";
import { BackStack, goBack } from "../ui/gestures.js";
import { Crosshair, ArrowLeft, ChevronLeft, ChevronRight, Plus, Download } from "../icons.js";
import { PAD_X } from "../config.js";
import { DAY, MIN, startOfDay, fmtDay } from "../lib/time.js";
import { evStart, evEnd, evColor, statusOf } from "../lib/events.js";
import { layoutCards, layoutBands, statusColors } from "./lanes.js";
import { TimelineNode } from "./node.js";
import { exportMonthPNG } from "./export.js";
import { ExportDialog } from "../ui/export-dialog.js";

export function Line(p) {
  const T = useT();
  const scroller = useRef(null);
  const starLayer = useRef(null);
  const wrap = useRef(null);
  const [size, setSize] = useState({ w: 900, h: 480 });
  const [hover, setHover] = useState(null);
  const [monthLabel, setMonthLabel] = useState("");
  const [focus, setFocus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exOpts, setExOpts] = useState({ showList: true, showPast: true, caption: "" });
  const drag = useRef({ on: false, x: 0, left: 0, moved: 0 });
  const centered = useRef(false);

  const unfocus = () => { centered.current = false; setFocus(null); };

  /* while zoomed into a month, step to the next or previous one */
  const stepMonth = useCallback((n) => {
    setFocus((f) => {
      if (!f) return f;
      const d = new Date(f.start);
      const s2 = new Date(d.getFullYear(), d.getMonth() + n, 1);
      const e2 = new Date(d.getFullYear(), d.getMonth() + n + 1, 1);
      return { start: s2.getTime(), end: e2.getTime(),
        label: s2.toLocaleDateString(undefined, { month: "long" }), year: s2.getFullYear() };
    });
  }, []);

  const wheelAt = useRef(0);
  const swipe = useRef(null);
  const onMonthWheel = (e) => {
    if (!focus) return;
    const t = Date.now();
    if (t - wheelAt.current < 420) return;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(d) < 12) return;
    wheelAt.current = t;
    stepMonth(d > 0 ? 1 : -1);
  };
  const onMonthTouchStart = (e) => {
    if (!focus) { swipe.current = null; return; }
    const t = e.touches[0];
    swipe.current = t.clientX < 50 ? null : { x: t.clientX, y: t.clientY, at: Date.now() };
  };
  const onMonthTouchEnd = (e) => {
    if (!swipe.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - swipe.current.x, dy = Math.abs(t.clientY - swipe.current.y);
    if (Math.abs(dx) > 55 && dy < 60 && Date.now() - swipe.current.at < 800) stepMonth(dx < 0 ? 1 : -1);
    swipe.current = null;
  };
  useEffect(() => { if (!focus) return; return BackStack.push(() => { unfocus(); return true; }); }, [focus]);

  useEffect(() => {
    if (!wrap.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: Math.max(320, r.width), h: Math.max(360, r.height) });
    });
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  const H = size.h;
  const lineY = Math.round(H * 0.52);
  const compact = H < 470;
  const ARM = compact ? 44 : 60;
  const CARDH = compact ? 92 : 112;
  const CARDW = 156;
  const padX = focus ? 70 : PAD_X;

  const range = useMemo(() => {
    if (focus) return { start: focus.start, end: focus.end };
    const ts = p.events.map(evStart), te = p.events.map(evEnd);
    const min = Math.min(p.now, ...(ts.length ? ts : [p.now]));
    const max = Math.max(p.now, ...(te.length ? te : [p.now]));
    return { start: startOfDay(min - 4 * DAY), end: max + 8 * DAY };
  }, [p.events, p.now, focus]);

  const Z = focus ? Math.max(10, (size.w - padX * 2) / ((range.end - range.start) / DAY)) : p.zoom;
  const xOf = useCallback((t) => ((new Date(t).getTime() - range.start) / DAY) * Z + padX, [range, Z, padX]);
  const tOf = useCallback((x) => range.start + ((x - padX) / Z) * DAY, [range, Z, padX]);
  const width = focus ? size.w : Math.max(xOf(range.end) + padX, size.w + 100);

  const nodes = useMemo(() => {
    const sorted = [...p.events].sort((a, b) => evStart(a) - evStart(b));
    return layoutCards(sorted, (ev) => xOf(evStart(ev)), (ev) => xOf(evEnd(ev)), CARDW);
  }, [p.events, xOf]);
  const bands = useMemo(() => layoutBands(nodes, 16), [nodes]);

  const months = useMemo(() => {
    const out = []; const d = new Date(range.start); d.setDate(1); d.setHours(0, 0, 0, 0);
    while (d.getTime() < range.end) {
      const t = d.getTime(); const nx = new Date(d); nx.setMonth(nx.getMonth() + 1);
      out.push({ t, end: nx.getTime(), label: d.toLocaleDateString(undefined, { month: "long" }), year: d.getFullYear() });
      d.setMonth(d.getMonth() + 1);
    }
    return out;
  }, [range]);

  const ticks = useMemo(() => {
    const step = Z >= 40 ? 1 : Z >= 14 ? 2 : 7;
    const out = [];
    for (let t = range.start; t < range.end; t += step * DAY) out.push(t);
    return out;
  }, [range, Z]);

  useEffect(() => {
    if (!scroller.current) return;
    if (focus) { scroller.current.scrollLeft = 0; return; }
    if (centered.current) return;
    scroller.current.scrollLeft = xOf(p.now) - scroller.current.clientWidth / 2;
    centered.current = true;
  }, [xOf, p.now, focus]);

  const onScroll = useCallback(() => {
    const el = scroller.current; if (!el) return;
    if (starLayer.current) starLayer.current.style.transform = "translateX(" + el.scrollLeft * 0.55 + "px)";
    const d = new Date(tOf(el.scrollLeft + el.clientWidth / 2));
    setMonthLabel(d.toLocaleDateString(undefined, { month: "long" }) + " " + d.getFullYear());
  }, [tOf]);
  useEffect(() => { onScroll(); }, [onScroll, Z, focus]);

  const onMove = (e) => {
    const el = scroller.current; if (!el) return;
    if (e.pointerType !== "mouse") return;
    if (drag.current.on) {
      const dx = e.clientX - drag.current.x;
      drag.current.moved = Math.max(drag.current.moved, Math.abs(dx));
      el.scrollLeft = drag.current.left - dx;
    }
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left + el.scrollLeft;
    setHover(Math.abs(e.clientY - rect.top - lineY) < ARM + 30 ? { x, t: tOf(x) } : null);
  };

  const exportTitle = () => {
    if (focus) return focus.label + " " + focus.year;
    const el = scroller.current;
    const centre = new Date(tOf(el ? el.scrollLeft + el.clientWidth / 2 : 0));
    return centre.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  };

  const doExport = async () => {
    setExportOpen(false);
    let mStart, mEnd;
    if (focus) { mStart = focus.start; mEnd = focus.end; }
    else {
      const el = scroller.current;
      const center = new Date(tOf(el ? el.scrollLeft + el.clientWidth / 2 : 0));
      mStart = new Date(center.getFullYear(), center.getMonth(), 1).getTime();
      mEnd = new Date(center.getFullYear(), center.getMonth() + 1, 1).getTime();
    }
    setBusy(true);
    try {
      const ok = await exportMonthPNG({ serverName: p.serverName, monthStart: mStart, monthEnd: mEnd,
        events: p.events, T, now: p.now,
        showList: exOpts.showList, showPast: exOpts.showPast, caption: exOpts.caption });
      p.ping && p.ping(ok ? "Image saved to your downloads" : "The browser blocked the download", !ok);
    } catch (e) {
      p.ping && p.ping("Export failed: " + (e && e.message ? e.message : "unknown"), true);
    }
    setBusy(false);
  };

  const gateTop = Math.max(14, lineY - ARM - CARDH - 26);

  return h("div", { className: "flex-1 min-h-0 flex flex-col relative" },
    h("div", { className: "shrink-0 px-4 sm:px-7 pt-3 pb-1 flex items-end gap-3 flex-wrap" },
      h("div", { style: { fontFamily: DISPLAY, fontSize: compact ? 22 : 28, letterSpacing: "0.03em", lineHeight: 1 } },
        focus ? focus.label + " " + focus.year : monthLabel),
      focus ? h("div", { className: "mb-1 flex items-center gap-1" },
        h("button", { onClick: () => stepMonth(-1), "aria-label": "Previous month",
          style: { width: 26, height: 26, borderRadius: 7, display: "grid", placeItems: "center",
            background: "transparent", border: "1px solid " + T.hair, color: T.body, cursor: "pointer" } },
          h(ChevronLeft, { size: 13 })),
        h("button", { onClick: () => stepMonth(1), "aria-label": "Next month",
          style: { width: 26, height: 26, borderRadius: 7, display: "grid", placeItems: "center",
            background: "transparent", border: "1px solid " + T.hair, color: T.body, cursor: "pointer" } },
          h(ChevronRight, { size: 13 }))) : null,
      focus
        ? h("button", { onClick: goBack, className: "mb-1 inline-flex items-center gap-1.5",
            style: { fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.16em", color: T.gold, background: "none", border: "none", cursor: "pointer" } },
            h(ArrowLeft, { size: 11 }), " FULL LINE")
        : h("button", { onClick: () => { const el = scroller.current; if (el) el.scrollTo({ left: xOf(Date.now()) - el.clientWidth / 2, behavior: "smooth" }); },
            className: "mb-1 inline-flex items-center gap-1.5",
            style: { fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.16em", color: T.gold, background: "none", border: "none", cursor: "pointer" } },
            h(Crosshair, { size: 11 }), " JUMP TO NOW"),
      h("button", { onClick: () => setExportOpen(true), disabled: busy, className: "mb-1 inline-flex items-center gap-1.5 ml-auto",
        style: { fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.16em", color: busy ? T.gold : T.muted, background: "none", border: "none", cursor: "pointer" } },
        h(Download, { size: 11 }), busy ? " RENDERING\u2026" : " EXPORT PNG")),

    h("div", { ref: wrap, className: "flex-1 min-h-0" },
      h("div", {
        key: focus ? "focus" + focus.start : "full",
        ref: scroller, className: "scroller h-full overflow-y-hidden",
        style: { cursor: focus ? "default" : "grab", touchAction: "pan-x", overflowX: focus ? "hidden" : "auto",
          animation: focus ? "zoomStage .38s cubic-bezier(.2,.8,.25,1) both" : "zoomOutStage .32s ease both" },
        onWheel: (e) => {
          if (focus) { onMonthWheel(e); return; }
          const el = scroller.current;
          if (el && Math.abs(e.deltaY) > Math.abs(e.deltaX)) el.scrollLeft += e.deltaY;
        },
        onTouchStart: onMonthTouchStart,
        onTouchEnd: onMonthTouchEnd,
        onScroll,
        onPointerDown: (e) => { if (!focus && e.pointerType === "mouse") drag.current = { on: true, x: e.clientX, left: scroller.current.scrollLeft, moved: 0 }; },
        onPointerUp: () => { drag.current.on = false; },
        onPointerLeave: () => { drag.current.on = false; setHover(null); },
        onPointerMove: onMove,
      },
        h("div", { className: "relative h-full", style: { width } },
          h("div", { ref: starLayer, className: "absolute inset-0", style: { willChange: "transform" } },
            h(Stars, { width, height: H, T })),

          months.map((m) => h("div", { key: m.t, className: "absolute", style: { left: xOf(Math.max(m.t, range.start)), top: gateTop } },
            h("div", { style: { width: 1, height: lineY - gateTop, background: "linear-gradient(180deg, transparent, " + T.hair + ")" } }),
            !focus ? h("button", { onClick: () => { if (drag.current.moved < 6) setFocus({ start: m.t, end: m.end, label: m.label, year: m.year }); },
              className: "absolute whitespace-nowrap",
              style: { left: 10, top: 0, fontFamily: DISPLAY, fontSize: 15, color: T.muted, letterSpacing: "0.06em",
                background: "none", border: "none", cursor: "pointer", padding: 0 } },
              m.label, " ", h("span", { style: { fontFamily: MONO, fontSize: 9 } }, m.year),
              h("span", { style: { fontFamily: MONO, fontSize: 8, color: T.gold, marginLeft: 6, letterSpacing: "0.1em" } }, "ZOOM")) : null)),

          ticks.map((t) => h(Fragment, { key: t },
            h("div", { className: "absolute", style: { left: xOf(t), top: lineY - (new Date(t).getDay() === 1 ? 16 : 9),
              width: 1, height: new Date(t).getDay() === 1 ? 32 : 18,
              background: "linear-gradient(180deg, transparent, " + T.silver + ", transparent)",
              opacity: new Date(t).getDay() === 1 ? 0.55 : 0.28 } }),
            focus ? h("div", { className: "absolute", style: { left: xOf(t) + Z / 2, top: lineY + 20, transform: "translateX(-50%)",
              fontFamily: MONO, fontSize: 8.5, color: T.muted } }, new Date(t).getDate()) : null)),

          bands.map(({ ev, x, x2, off }) => {
            const st = statusOf(ev, p.now);
            const c = st === "past" ? T.silver : evColor(ev);
            return h(Fragment, { key: "b" + ev.id },
              h("div", { className: "absolute", style: { left: x, top: off < 0 ? lineY + off : lineY, width: 1,
                height: Math.abs(off), background: c, opacity: 0.4, pointerEvents: "none" } }),
              h("div", { className: st === "live" ? "breathe" : "", style: { position: "absolute", left: x, top: lineY + off - 2.5,
                width: Math.max(4, x2 - x), height: 5, borderRadius: 5, pointerEvents: "none",
                background: "linear-gradient(90deg, " + c + ", " + c + "33)",
                boxShadow: st === "past" ? "none" : "0 0 12px " + c + "66", opacity: st === "past" ? 0.38 : 0.92 } }),
              h("div", { style: { position: "absolute", left: x2 - 1, top: lineY + off - 5.5, width: 1.5, height: 11,
                background: c, opacity: 0.85, pointerEvents: "none" } }));
          }),

          h("div", { className: "draw absolute", style: { left: 0, right: 0, top: lineY - 1, height: 2, borderRadius: 2, background: T.current + "33" } }),
          h("div", { className: "draw flame absolute", style: { left: 0, right: 0, top: lineY - 1.5,
            height: T.isDark ? 3 : 4, borderRadius: 3,
            boxShadow: T.isDark
              ? "0 0 10px " + T.current + ", 0 0 30px " + T.bloom + ", 0 0 60px " + T.bloom
              : "0 0 6px " + T.bloom } }),

          [0, 2.3, 4.6].map((delay, i) => h("div", { key: i, className: "absolute ember",
            style: { left: padX + i * 280, top: lineY - 1, width: 3, height: 3, borderRadius: 3,
              background: T.current, boxShadow: "0 0 8px " + T.current, animationDelay: delay + "s", pointerEvents: "none" } })),

          p.now >= range.start && p.now <= range.end ? h(Fragment, null,
            h("div", { className: "absolute", style: { left: xOf(p.now), top: lineY - ARM - 8, width: 1, height: (ARM + 8) * 2,
              background: "linear-gradient(180deg, transparent, " + T.gold + ", transparent)", opacity: 0.8 } }),
            h("div", { className: "absolute breathe", style: { left: xOf(p.now) - 4, top: lineY - 4, width: 8, height: 8,
              borderRadius: 8, background: T.gold, boxShadow: "0 0 14px " + T.gold } }),
            h("div", { className: "absolute whitespace-nowrap", style: { left: xOf(p.now) + 10, top: lineY - ARM - 16,
              fontFamily: MONO, fontSize: 9, letterSpacing: "0.2em", color: T.gold } }, "NOW")) : null,

          hover && !focus ? h(Fragment, null,
            h("div", { className: "absolute", style: { left: hover.x, top: lineY - ARM + 20, width: 1, height: (ARM - 20) * 2,
              pointerEvents: "none", background: "linear-gradient(180deg, transparent, " + T.current + "88, transparent)" } }),
            h("div", { className: "absolute whitespace-nowrap px-2 py-1", style: { left: hover.x + 8, top: lineY + 30,
              fontFamily: MONO, fontSize: 10, color: T.text, background: T.sheet, border: "1px solid " + T.hair,
              borderRadius: 6, pointerEvents: "none" } }, fmtDay(hover.t))) : null,

          nodes.map(({ ev, x, side, lane }, idx) => h(TimelineNode, {
            key: ev.id, ev, x, up: side === "top", now: p.now, lineY,
            arm: ARM + lane * (CARDH + 14), card: CARDH, idx,
            onOpen: () => { if (drag.current.moved < 6) p.onOpen(ev); },
          })),

          p.empty && !focus ? h("div", { className: "absolute text-center", style: { left: xOf(p.now) - 150, top: lineY + ARM + 8, width: 300 } },
            h("div", { style: { fontFamily: DISPLAY, fontSize: 17 } }, "This line is quiet"),
            h("p", { className: "mt-1.5 mb-4 text-sm", style: { color: T.muted } }, "Add an event and it lights up here."),
            p.canCreate ? h(Btn, { tone: "gold", onClick: p.onAdd }, h(Plus, { size: 13 }), " Add the first event") : null) : null,

          focus && nodes.length === 0 ? h("div", { className: "absolute text-center",
            style: { left: "50%", transform: "translateX(-50%)", top: lineY + ARM + 8, width: 300 } },
            h("div", { style: { fontFamily: DISPLAY, fontSize: 17 } }, "Nothing happened in " + focus.label)) : null))),

    h("div", { className: "shrink-0 px-4 sm:px-7 py-1.5", style: { fontFamily: MONO, fontSize: 9, color: T.muted, letterSpacing: "0.14em" } },
      focus ? "SCROLL, SWIPE OR USE THE ARROWS TO CHANGE MONTH \u00B7 TAP A NODE FOR DETAILS"
            : "DRAG TO TRAVEL \u00B7 TAP A MONTH NAME TO ZOOM IN \u00B7 TAP A NODE FOR DETAILS"),

    h(ExportDialog, { open: exportOpen, onClose: () => setExportOpen(false),
      title: exportTitle(), opts: exOpts, setOpts: setExOpts, onGo: doExport }));
}
