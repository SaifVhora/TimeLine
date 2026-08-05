import { h, useMemo } from "../react.js";
import { DISPLAY, MONO } from "../theme.js";
import { useT, Btn, Label } from "../ui/atoms.js";
import { Trophy, Users, Plus, Check } from "../icons.js";
import { fmtDay, fmtTime, countdown } from "../lib/time.js";
import { evColor, evShort, evRange, statusOf } from "../lib/events.js";
import { buildTodo } from "../lib/todo.js";

function Row(p) {
  const T = useT();
  const ev = p.ev;
  const col = evColor(ev);
  const st = statusOf(ev, p.now);
  return h("button", { onClick: () => p.onOpen(ev),
    className: "w-full text-left p-3 rounded-xl flex items-center gap-3",
    style: { background: T.panel, border: "1px solid " + (p.accent ? col + "44" : T.hair), cursor: "pointer" } },
    h("span", { className: st === "live" ? "breathe" : "",
      style: { width: 9, height: 9, borderRadius: 2, transform: "rotate(45deg)", background: col,
        boxShadow: st === "past" ? "none" : "0 0 10px " + col, flexShrink: 0, display: "inline-block" } }),
    h("div", { className: "flex-1 min-w-0" },
      h("div", { className: "truncate", style: { fontFamily: DISPLAY, fontSize: 16, color: T.text } }, ev.title),
      h("div", { className: "truncate", style: { fontFamily: MONO, fontSize: 9, color: T.muted, letterSpacing: "0.1em" } },
        evShort(ev) + " \u00B7 " + evRange(ev) + (ev.allDay ? "" : " \u00B7 " + fmtTime(ev.start)))),
    p.tag ? h("span", { style: { fontFamily: MONO, fontSize: 9, letterSpacing: "0.1em", color: p.tagColor || T.muted, whiteSpace: "nowrap" } }, p.tag) : null);
}

function Section(p) {
  const T = useT();
  if (!p.items.length) return null;
  return h("div", null,
    h(Label, null, p.title + " \u00B7 " + p.items.length),
    h("div", { className: "space-y-2" }, p.items.slice(0, p.limit || 6).map((ev) =>
      h(Row, { key: ev.id, ev, now: p.now, onOpen: p.onOpen, tag: p.tagFor ? p.tagFor(ev) : null, tagColor: p.tagColor, accent: p.accent }))),
    p.items.length > (p.limit || 6)
      ? h("div", { className: "mt-1.5", style: { fontFamily: MONO, fontSize: 9, color: T.muted, letterSpacing: "0.1em" } },
          "+ " + (p.items.length - (p.limit || 6)) + " MORE")
      : null);
}

export function NowPage(p) {
  const T = useT();
  const todo = useMemo(() => buildTodo(p.events, p.now), [p.events, p.now]);
  const nothing = !todo.live.length && !todo.today.length && !todo.soon.length && !todo.count;

  return h("div", { className: "h-full overflow-y-auto px-4 sm:px-7 pb-8 pt-2" },
    h("div", { className: "mx-auto w-full space-y-7", style: { maxWidth: 640 } },

      nothing ? h("div", { className: "text-center py-16" },
        h(Check, { size: 22, style: { color: T.live, margin: "0 auto 12px" } }),
        h("div", { style: { fontFamily: DISPLAY, fontSize: 21 } }, "Nothing needs you"),
        h("p", { className: "mt-2 text-sm", style: { color: T.muted } },
          "No events running, nothing due, every result logged."),
        p.canCreate ? h("div", { className: "mt-5" },
          h(Btn, { tone: "gold", onClick: p.onAdd }, h(Plus, { size: 13 }), " Plan something")) : null) : null,

      h(Section, { title: "Happening now", items: todo.live, now: p.now, onOpen: p.onOpen, accent: true,
        tagFor: () => "LIVE", tagColor: T.live }),

      h(Section, { title: "Today", items: todo.today, now: p.now, onOpen: p.onOpen, accent: true,
        tagFor: (ev) => countdown(ev.start, p.now).toUpperCase(), tagColor: T.soon }),

      h(Section, { title: "This week", items: todo.soon, now: p.now, onOpen: p.onOpen,
        tagFor: (ev) => fmtDay(ev.start).toUpperCase() }),

      todo.missingResults.length ? h("div", null,
        h("div", { className: "flex items-center gap-2 mb-1.5" },
          h(Trophy, { size: 13, style: { color: T.gold } }),
          h("div", { className: "uppercase", style: { fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.18em", color: T.gold } },
            "Results not logged \u00B7 " + todo.missingResults.length)),
        h("div", { className: "text-xs mb-2", style: { color: T.muted } },
          "These finished without a winner or a results link."),
        h("div", { className: "space-y-2" }, todo.missingResults.slice(0, 8).map((ev) =>
          h(Row, { key: ev.id, ev, now: p.now, onOpen: p.onOpen, tag: p.canEdit ? "ADD RESULTS" : null, tagColor: T.gold })))) : null,

      todo.missingHost.length ? h("div", null,
        h("div", { className: "flex items-center gap-2 mb-1.5" },
          h(Users, { size: 13, style: { color: T.muted } }),
          h("div", { className: "uppercase", style: { fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.18em", color: T.muted } },
            "No host yet \u00B7 " + todo.missingHost.length)),
        h("div", { className: "space-y-2" }, todo.missingHost.slice(0, 6).map((ev) =>
          h(Row, { key: ev.id, ev, now: p.now, onOpen: p.onOpen, tag: fmtDay(ev.start).toUpperCase() })))) : null,

      !nothing && p.canCreate ? h("div", { className: "pt-2" },
        h(Btn, { full: true, tone: "gold", onClick: p.onAdd }, h(Plus, { size: 13 }), " New event")) : null));
}
