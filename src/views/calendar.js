import { h, useState, useMemo } from "../react.js";
import { DISPLAY, MONO } from "../theme.js";
import { useT, Btn } from "../ui/atoms.js";
import { ChevronLeft, ChevronRight, Plus } from "../icons.js";
import { DAY, MIN, startOfDay, sameDay, fmtTime, fmtDay } from "../lib/time.js";
import { evStart, evEnd, evColor, evShort, statusOf } from "../lib/events.js";

export function CalendarPage(p) {
  const T = useT();
  const [cursor, setCursor] = useState(() => { const d = new Date(p.now); d.setDate(1); d.setHours(0,0,0,0); return d; });
  const [picked, setPicked] = useState(null);

  const monthStart = cursor.getTime();
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1).getTime();

  /* which events touch each day */
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

  const step = (n) => { setPicked(null); setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1)); };
  const monthCount = p.events.filter((ev) => evEnd(ev) > monthStart && evStart(ev) < monthEnd).length;
  const pickedList = picked ? (byDay[picked] || []) : [];

  return h("div", { className: "h-full overflow-y-auto px-4 sm:px-7 pb-8 pt-1" },
    h("div", { className: "mx-auto w-full", style: { maxWidth: 760 } },

      h("div", { className: "flex items-center gap-3 mb-3" },
        h("button", { onClick: () => step(-1), style: { color: T.muted, background: "none", border: "none", cursor: "pointer" } },
          h(ChevronLeft, { size: 18 })),
        h("div", { className: "flex-1 text-center" },
          h("div", { style: { fontFamily: DISPLAY, fontSize: 24, lineHeight: 1.1 } },
            cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })),
          h("div", { style: { fontFamily: MONO, fontSize: 9, color: T.muted, letterSpacing: "0.16em" } },
            monthCount + " EVENT" + (monthCount === 1 ? "" : "S"))),
        h("button", { onClick: () => step(1), style: { color: T.muted, background: "none", border: "none", cursor: "pointer" } },
          h(ChevronRight, { size: 18 }))),

      h("div", { className: "grid grid-cols-7 gap-1 mb-1.5" },
        ["MON","TUE","WED","THU","FRI","SAT","SUN"].map((w) =>
          h("div", { key: w, className: "text-center", style: { fontFamily: MONO, fontSize: 8.5, color: T.muted, letterSpacing: "0.14em" } }, w.slice(0,1)))),

      h("div", { className: "grid grid-cols-7 gap-1" }, cells.map((c, i) => {
        if (!c) return h("div", { key: "p" + i });
        const key = startOfDay(c);
        const list = (byDay[key] || []);
        const isToday = sameDay(c, p.now);
        const isPicked = picked === key;
        const clash = list.length > 1;
        return h("button", { key: key, onClick: () => setPicked(isPicked ? null : key),
          className: "relative rounded-lg p-1.5 text-left",
          style: { minHeight: 62, cursor: "pointer",
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
          clash && !isPicked ? h("span", { style: { position: "absolute", top: 4, right: 4, width: 4, height: 4,
            borderRadius: 4, background: T.soon, display: "inline-block" } }) : null);
      })),

      h("div", { className: "mt-3 flex items-center gap-3 flex-wrap", style: { fontFamily: MONO, fontSize: 8.5, color: T.muted, letterSpacing: "0.12em" } },
        h("span", { className: "inline-flex items-center gap-1.5" },
          h("span", { style: { width: 4, height: 4, borderRadius: 4, background: T.soon, display: "inline-block" } }), "MORE THAN ONE THAT DAY"),
        h("span", null, "TAP A DAY TO SEE IT")),

      picked ? h("div", { className: "mt-5 rise" },
        h("div", { className: "flex items-baseline gap-2 mb-2" },
          h("div", { style: { fontFamily: DISPLAY, fontSize: 18 } }, fmtDay(picked)),
          pickedList.length > 1 ? h("span", { style: { fontFamily: MONO, fontSize: 9, color: T.soon, letterSpacing: "0.12em" } },
            pickedList.length + " EVENTS \u2014 CHECK FOR CLASHES") : null),
        pickedList.length === 0
          ? h("div", { className: "p-4 rounded-xl text-sm text-center", style: { background: T.panel, border: "1px solid " + T.hair, color: T.muted } },
              "Nothing on this day.",
              p.canCreate ? h("div", { className: "mt-3" },
                h(Btn, { size: "sm", tone: "gold", onClick: () => p.onAddOn(picked) }, h(Plus, { size: 12 }), " Put something here")) : null)
          : h("div", { className: "space-y-2" },
              pickedList.map((ev) => h("button", { key: ev.id, onClick: () => p.onOpen(ev),
                className: "w-full text-left p-3 rounded-xl flex items-center gap-3",
                style: { background: T.panel, border: "1px solid " + T.hair, cursor: "pointer" } },
                h("span", { style: { width: 9, height: 9, borderRadius: 2, transform: "rotate(45deg)",
                  background: evColor(ev), flexShrink: 0, display: "inline-block" } }),
                h("div", { className: "flex-1 min-w-0" },
                  h("div", { className: "truncate", style: { fontFamily: DISPLAY, fontSize: 16 } }, ev.title),
                  h("div", { style: { fontFamily: MONO, fontSize: 9, color: T.muted, letterSpacing: "0.1em" } },
                    evShort(ev) + (ev.allDay ? " \u00B7 ALL DAY" : " \u00B7 " + fmtTime(ev.start)))))),
              p.canCreate ? h(Btn, { full: true, size: "sm", onClick: () => p.onAddOn(picked) },
                h(Plus, { size: 12 }), " Add another on this day") : null)) : null));
}
