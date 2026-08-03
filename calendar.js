import { h, useState, useMemo, useEffect, useRef } from "../react.js";
import { DISPLAY, MONO } from "../theme.js";
import { useT, Btn } from "../ui/atoms.js";
import { ChevronLeft, ChevronRight, Plus, Trophy, Users, Paperclip } from "../icons.js";
import { DAY, MIN, startOfDay, sameDay, fmtTime, fmtDay } from "../lib/time.js";
import { evStart, evEnd, evColor, evShort, evRange, evHosts, statusOf } from "../lib/events.js";

export function CalendarPage(p) {
  const T = useT();
  const [cursor, setCursor] = useState(() => { const d = new Date(p.now); d.setDate(1); d.setHours(0,0,0,0); return d; });
  const [picked, setPicked] = useState(null);
  const listRef = useRef(null);
  const rowRefs = useRef({});

  const monthStart = cursor.getTime();
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1).getTime();

  /* which events touch each day of this month */
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

  /* everything in this month, in order — the side list */
  const monthList = useMemo(() =>
    p.events
      .filter((ev) => evEnd(ev) > monthStart && evStart(ev) < monthEnd)
      .sort((a, b) => evStart(a) - evStart(b)),
    [p.events, monthStart, monthEnd]);

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const pad = (first.getDay() + 6) % 7;
    const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const out = [];
    for (let i = 0; i < pad; i++) out.push(null);
    for (let i = 1; i <= days; i++) out.push(new Date(cursor.getFullYear(), cursor.getMonth(), i));
    while (out.length % 7) out.push(null);
    return out;
  }, [cursor]);

  /* picking a day scrolls the side list to it rather than replacing the view */
  useEffect(() => {
    if (!picked) return;
    const first = (byDay[picked] || [])[0];
    const el = first && rowRefs.current[first.id];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [picked]);

  const step = (n) => { setPicked(null); setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1)); };
  const jumpToday = () => { const d = new Date(p.now); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); setPicked(startOfDay(p.now)); };

  const dayOf = (ev) => Math.max(startOfDay(evStart(ev)), monthStart);
  const inPickedDay = (ev) => picked && (byDay[picked] || []).some((x) => x.id === ev.id);

  const row = (ev, i) => {
    const st = statusOf(ev, p.now);
    const col = st === "past" ? T.silver : evColor(ev);
    const on = inPickedDay(ev);
    const hosts = evHosts(ev);
    const win = (ev.winners || []).filter((w) => w.name);
    const prev = monthList[i - 1];
    const newDay = !prev || startOfDay(evStart(prev)) !== startOfDay(evStart(ev));
    return h("div", { key: ev.id, ref: (el) => { rowRefs.current[ev.id] = el; } },
      newDay ? h("div", { className: "px-1 pt-3 pb-1", style: { fontFamily: MONO, fontSize: 9, letterSpacing: "0.14em", color: T.muted } },
        fmtDay(evStart(ev)).toUpperCase()) : null,
      h("button", { onClick: () => p.onOpen(ev),
        className: "w-full text-left p-2.5 rounded-xl flex items-start gap-2.5",
        style: { background: on ? T.panel : "transparent",
          border: "1px solid " + (on ? (evColor(ev) + "66") : "transparent"),
          cursor: "pointer", opacity: st === "past" ? 0.75 : 1, transition: "background .15s ease" } },
        h("span", { className: st === "live" ? "breathe" : "",
          style: { width: 8, height: 8, marginTop: 5, borderRadius: 2, transform: "rotate(45deg)",
            background: col, flexShrink: 0, display: "inline-block",
            boxShadow: st === "past" ? "none" : "0 0 8px " + col } }),
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

  return h("div", { className: "h-full overflow-y-auto px-4 sm:px-7 pb-8 pt-1" },
    h("div", { className: "mx-auto w-full flex flex-col lg:flex-row gap-5", style: { maxWidth: 1100 } },

      /* ── the grid ── */
      h("div", { className: "flex-1 min-w-0" },
        h("div", { className: "flex items-center gap-3 mb-3" },
          h("button", { onClick: () => step(-1), style: { color: T.muted, background: "none", border: "none", cursor: "pointer" } },
            h(ChevronLeft, { size: 18 })),
          h("div", { className: "flex-1 text-center" },
            h("div", { style: { fontFamily: DISPLAY, fontSize: 24, lineHeight: 1.1 } },
              cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })),
            h("button", { onClick: jumpToday, style: { fontFamily: MONO, fontSize: 9, color: T.gold,
              letterSpacing: "0.16em", background: "none", border: "none", cursor: "pointer" } }, "TODAY")),
          h("button", { onClick: () => step(1), style: { color: T.muted, background: "none", border: "none", cursor: "pointer" } },
            h(ChevronRight, { size: 18 }))),

        h("div", { className: "grid grid-cols-7 gap-1 mb-1.5" },
          ["M","T","W","T","F","S","S"].map((w, i) =>
            h("div", { key: i, className: "text-center", style: { fontFamily: MONO, fontSize: 8.5, color: T.muted, letterSpacing: "0.14em" } }, w))),

        h("div", { className: "grid grid-cols-7 gap-1" }, cells.map((c, i) => {
          if (!c) return h("div", { key: "p" + i });
          const key = startOfDay(c);
          const list = byDay[key] || [];
          const isToday = sameDay(c, p.now);
          const isPicked = picked === key;
          return h("button", { key: key, onClick: () => setPicked(isPicked ? null : key),
            className: "relative rounded-lg p-1.5 text-left",
            style: { minHeight: 58, cursor: "pointer",
              background: isPicked ? T.solidBtn : list.length ? T.panel : "transparent",
              border: "1px solid " + (isPicked ? "transparent" : isToday ? T.gold + "77" : T.hair),
              transition: "background .15s ease" } },
            h("div", { style: { fontFamily: MONO, fontSize: 10,
              color: isPicked ? T.solidInk : isToday ? T.gold : T.body } }, c.getDate()),
            h("div", { className: "mt-1 flex flex-wrap gap-0.5" }, list.slice(0, 4).map((ev, k) =>
              h("span", { key: ev.id + k, style: { width: 5, height: 5, borderRadius: 5,
                background: statusOf(ev, p.now) === "past" ? T.silver : evColor(ev),
                opacity: statusOf(ev, p.now) === "past" ? 0.55 : 1, display: "inline-block" } }))),
            list.length > 4 ? h("div", { style: { fontFamily: MONO, fontSize: 7.5,
              color: isPicked ? T.solidInk : T.muted } }, "+" + (list.length - 4)) : null,
            list.length > 1 && !isPicked ? h("span", { style: { position: "absolute", top: 4, right: 4,
              width: 4, height: 4, borderRadius: 4, background: T.soon, display: "inline-block" } }) : null);
        })),

        h("div", { className: "mt-3 flex items-center gap-3 flex-wrap",
          style: { fontFamily: MONO, fontSize: 8.5, color: T.muted, letterSpacing: "0.12em" } },
          h("span", { className: "inline-flex items-center gap-1.5" },
            h("span", { style: { width: 4, height: 4, borderRadius: 4, background: T.soon, display: "inline-block" } }),
            "MORE THAN ONE THAT DAY"),
          h("span", null, "TAP A DAY TO FIND IT IN THE LIST")),

        picked && p.canCreate ? h("div", { className: "mt-3" },
          h(Btn, { size: "sm", tone: "gold", full: true, onClick: () => p.onAddOn(picked) },
            h(Plus, { size: 12 }), " Add an event on " + fmtDay(picked))) : null),

      /* ── the month list, always visible ── */
      h("div", { className: "lg:w-[330px] lg:shrink-0" },
        h("div", { className: "rounded-2xl p-3", style: { background: T.panel, border: "1px solid " + T.hair } },
          h("div", { className: "flex items-baseline gap-2 px-1 pb-1" },
            h("div", { style: { fontFamily: DISPLAY, fontSize: 17 } }, "Everything this month"),
            h("div", { style: { fontFamily: MONO, fontSize: 9, color: T.muted, letterSpacing: "0.12em" } }, monthList.length)),
          picked ? h("button", { onClick: () => setPicked(null), className: "px-1 pb-2",
            style: { fontFamily: MONO, fontSize: 8.5, color: T.gold, letterSpacing: "0.12em",
              background: "none", border: "none", cursor: "pointer" } },
            "HIGHLIGHTING " + fmtDay(picked).toUpperCase() + " \u00B7 CLEAR") : null,
          monthList.length === 0
            ? h("div", { className: "py-10 text-center text-sm", style: { color: T.muted } },
                "Nothing on the calendar this month.")
            : h("div", { ref: listRef, className: "overflow-y-auto scroller",
                style: { maxHeight: "min(62vh, 560px)" } }, monthList.map(row))))));
}
