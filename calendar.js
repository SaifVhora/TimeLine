import { h, useState, useMemo, useEffect, useRef, useCallback } from "../react.js";
import { DISPLAY, MONO } from "../theme.js";
import { useT, Btn } from "../ui/atoms.js";
import { ChevronLeft, ChevronRight, Plus, Trophy, Download, Crosshair } from "../icons.js";
import { exportCalendarPNG } from "../timeline/calendar-png.js";
import { DAY, MIN, startOfDay, sameDay, fmtTime, fmtDay, fmtD } from "../lib/time.js";
import { evStart, evEnd, evColor, evShort, evHosts, isMultiDay, statusOf } from "../lib/events.js";

export function CalendarPage(p) {
  const T = useT();
  const [cursor, setCursor] = useState(() => { const d = new Date(p.now); d.setDate(1); d.setHours(0,0,0,0); return d; });
  const [picked, setPicked] = useState(null);
  const [busy, setBusy] = useState(false);
  const rowRefs = useRef({});
  const touch = useRef(null);

  const monthStart = cursor.getTime();
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1).getTime();

  const byDay = useMemo(() => {
    const map = {};
    p.events.forEach((ev) => {
      const s = startOfDay(evStart(ev)), e = evEnd(ev) - MIN;
      for (let t = s; t <= e; t += DAY) {
        if (t < monthStart - DAY || t >= monthEnd + DAY) continue;
        const k = startOfDay(t);
        (map[k] = map[k] || []).push(ev);
      }
    });
    return map;
  }, [p.events, monthStart, monthEnd]);

  const monthList = useMemo(() =>
    p.events.filter((ev) => evEnd(ev) > monthStart && evStart(ev) < monthEnd)
      .sort((a, b) => evStart(a) - evStart(b)),
    [p.events, monthStart, monthEnd]);

  const cells = useMemo(() => {
    const pad = (new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay() + 6) % 7;
    const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const out = [];
    for (let i = 0; i < pad; i++) out.push(null);
    for (let i = 1; i <= days; i++) out.push(new Date(cursor.getFullYear(), cursor.getMonth(), i));
    while (out.length % 7) out.push(null);
    return out;
  }, [cursor]);

  const step = useCallback((n) => {
    setPicked(null);
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  /* swipe sideways to change month; left edge left alone for the back gesture */
  const onTouchStart = (e) => {
    const t = e.touches[0];
    touch.current = t.clientX < 50 ? null : { x: t.clientX, y: t.clientY, at: Date.now() };
  };
  const onTouchEnd = (e) => {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x, dy = Math.abs(t.clientY - touch.current.y);
    if (Math.abs(dx) > 55 && dy < 60 && Date.now() - touch.current.at < 800) step(dx < 0 ? 1 : -1);
    touch.current = null;
  };

  useEffect(() => {
    if (!picked) return;
    const first = (byDay[picked] || [])[0];
    const el = first && rowRefs.current[first.id];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [picked]);

  const jumpToday = () => {
    const d = new Date(p.now);
    setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
    setPicked(startOfDay(p.now));
  };

  const doExport = async () => {
    setBusy(true);
    try {
      const ok = await exportCalendarPNG({ serverName: p.serverName, monthStart, events: p.events, T, now: p.now });
      p.ping && p.ping(ok ? "Calendar saved to your downloads" : "The browser blocked the download", !ok);
    } catch (err) {
      p.ping && p.ping("Export failed: " + (err && err.message ? err.message : "unknown"), true);
    }
    setBusy(false);
  };

  const monthName = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const inPickedDay = (ev) => picked && (byDay[picked] || []).some((x) => x.id === ev.id);

  const listRow = (ev, i) => {
    const st = statusOf(ev, p.now);
    const col = st === "past" ? T.silver : evColor(ev);
    const on = inPickedDay(ev);
    const hosts = evHosts(ev);
    const win = (ev.winners || []).filter((w) => w.name);
    const prev = monthList[i - 1];
    const newDay = !prev || startOfDay(evStart(prev)) !== startOfDay(evStart(ev));
    const range = isMultiDay(ev)
      ? fmtD(evStart(ev)) + " \u2192 " + fmtD(evEnd(ev))
      : fmtDay(evStart(ev));
    return h("div", { key: ev.id, ref: (el) => { rowRefs.current[ev.id] = el; } },
      newDay ? h("div", { className: "px-1 pt-3 pb-1",
        style: { fontFamily: MONO, fontSize: 9, letterSpacing: "0.14em", color: T.muted } }, range.toUpperCase()) : null,
      h("button", { onClick: () => p.onOpen(ev),
        className: "w-full text-left p-2.5 rounded-xl flex items-start gap-2.5",
        style: { background: on ? T.panel : "transparent",
          border: "1px solid " + (on ? col + "55" : "transparent"),
          cursor: "pointer", opacity: st === "past" ? 0.72 : 1, transition: "background .15s ease" } },
        h("span", { className: st === "live" ? "breathe" : "",
          style: { width: 7, height: 7, marginTop: 6, borderRadius: 7, background: col,
            flexShrink: 0, display: "inline-block", boxShadow: st === "past" ? "none" : "0 0 8px " + col } }),
        h("div", { className: "flex-1 min-w-0" },
          h("div", { className: "truncate", style: { fontFamily: DISPLAY, fontSize: 15, color: T.text } }, ev.title),
          h("div", { className: "truncate", style: { fontFamily: MONO, fontSize: 8.5, color: T.muted, letterSpacing: "0.08em" } },
            evShort(ev) + (ev.allDay ? " \u00B7 ALL DAY" : " \u00B7 " + fmtTime(ev.start)) +
            (hosts.length ? " \u00B7 " + hosts.join(", ") : "")),
          win.length ? h("div", { className: "truncate mt-0.5 inline-flex items-center gap-1",
            style: { fontFamily: MONO, fontSize: 8.5, color: T.gold } },
            h(Trophy, { size: 8 }), win[0].name + (win.length > 1 ? " +" + (win.length - 1) : "")) : null),
        st === "live" ? h("span", { style: { fontFamily: MONO, fontSize: 8, color: T.live, letterSpacing: "0.1em" } }, "LIVE") : null));
  };

  const navBtn = (dir, icon) => h("button", { onClick: () => step(dir), "aria-label": dir < 0 ? "Previous month" : "Next month",
    style: { width: 32, height: 32, borderRadius: 9, display: "grid", placeItems: "center", flexShrink: 0,
      background: "transparent", border: "1px solid " + T.hair, color: T.body, cursor: "pointer" } }, icon);

  const action = (label, icon, onClick, tone) => h("button", { onClick, disabled: busy && tone === "busy",
    className: "inline-flex items-center gap-1.5",
    style: { fontFamily: MONO, fontSize: 9, letterSpacing: "0.12em", padding: "7px 10px", borderRadius: 9,
      background: tone === "gold" ? "rgba(180,140,40,.12)" : "transparent",
      border: "1px solid " + (tone === "gold" ? T.gold + "55" : T.hair),
      color: tone === "gold" ? T.gold : T.body, cursor: "pointer", whiteSpace: "nowrap" } }, icon, label);

  return h("div", { className: "h-full overflow-y-auto px-4 sm:px-7 pb-8 pt-1" },
    h("div", { className: "mx-auto w-full", style: { maxWidth: 1120 } },

      /* one aligned header row */
      h("div", { className: "flex items-center gap-2.5 mb-4 flex-wrap" },
        navBtn(-1, h(ChevronLeft, { size: 16 })),
        navBtn(1, h(ChevronRight, { size: 16 })),
        h("div", { className: "min-w-0" },
          h("div", { className: "truncate", style: { fontFamily: DISPLAY, fontSize: 23, lineHeight: 1.1 } }, monthName),
          h("div", { style: { fontFamily: MONO, fontSize: 9, color: T.muted, letterSpacing: "0.16em" } },
            monthList.length + " EVENT" + (monthList.length === 1 ? "" : "S"))),
        h("div", { className: "ml-auto flex items-center gap-1.5 flex-wrap" },
          action("TODAY", h(Crosshair, { size: 11 }), jumpToday),
          action(busy ? "RENDERING" : "EXPORT", h(Download, { size: 11 }), doExport, "busy"),
          p.canCreate ? action("NEW", h(Plus, { size: 11 }), () => p.onAddOn(picked || startOfDay(p.now)), "gold") : null)),

      h("div", { className: "flex flex-col lg:flex-row gap-5" },

        /* ── grid ── */
        h("div", { className: "flex-1 min-w-0" },
          h("div", { className: "grid grid-cols-7 gap-1.5 mb-2" },
            ["M","T","W","T","F","S","S"].map((w, i) =>
              h("div", { key: i, className: "text-center",
                style: { fontFamily: MONO, fontSize: 8.5, color: T.muted, letterSpacing: "0.14em" } }, w))),

          h("div", { className: "grid grid-cols-7 gap-1.5", onTouchStart, onTouchEnd }, cells.map((c, i) => {
            if (!c) return h("div", { key: "p" + i });
            const key = startOfDay(c);
            const list = byDay[key] || [];
            const isToday = sameDay(c, p.now);
            const isPicked = picked === key;
            return h("button", { key: key, onClick: () => setPicked(isPicked ? null : key),
              className: "rounded-xl flex flex-col items-center justify-start",
              style: { minHeight: 64, paddingTop: 9, cursor: "pointer",
                background: isPicked ? T.gold + "1f" : "transparent",
                border: "1px solid " + (isPicked ? T.gold + "88" : isToday ? T.gold + "55" : T.hair),
                transition: "background .15s ease, border-color .15s ease" } },
              h("div", { style: { fontFamily: MONO, fontSize: 15, lineHeight: 1,
                color: isToday || isPicked ? T.gold : list.length ? T.text : T.muted } }, c.getDate()),
              h("div", { className: "flex items-center justify-center gap-1 mt-2.5", style: { minHeight: 6 } },
                list.slice(0, 4).map((ev, k) => {
                  const st = statusOf(ev, p.now);
                  return h("span", { key: ev.id + k,
                    style: { width: 6, height: 6, borderRadius: 6, display: "inline-block",
                      background: st === "past" ? T.silver : evColor(ev),
                      opacity: st === "past" ? 0.5 : 1 } });
                })),
              list.length > 4 ? h("div", { className: "mt-1",
                style: { fontFamily: MONO, fontSize: 7.5, color: T.muted } }, "+" + (list.length - 4)) : null);
          })),

          h("div", { className: "mt-3", style: { fontFamily: MONO, fontSize: 8.5, color: T.muted, letterSpacing: "0.12em" } },
            "SWIPE OR USE \u2190 \u2192 TO CHANGE MONTH \u00B7 TAP A DAY TO HIGHLIGHT IT")),

        /* ── month list ── */
        h("div", { className: "lg:w-[320px] lg:shrink-0" },
          h("div", { className: "rounded-2xl p-3", style: { background: T.panel, border: "1px solid " + T.hair } },
            h("div", { className: "flex items-baseline gap-2 px-1 pb-1" },
              h("div", { style: { fontFamily: DISPLAY, fontSize: 16 } }, "All of " + cursor.toLocaleDateString(undefined, { month: "long" })),
              picked ? h("button", { onClick: () => setPicked(null),
                className: "ml-auto",
                style: { fontFamily: MONO, fontSize: 8.5, color: T.gold, letterSpacing: "0.12em",
                  background: "none", border: "none", cursor: "pointer" } }, "CLEAR") : null),
            monthList.length === 0
              ? h("div", { className: "py-10 text-center text-sm", style: { color: T.muted } },
                  "Nothing this month.")
              : h("div", { className: "overflow-y-auto scroller", style: { maxHeight: "min(62vh, 560px)" } },
                  monthList.map(listRow)))))));
}
