import { h, useMemo } from "../react.js";
import { DISPLAY, MONO } from "../theme.js";
import { useT, Btn } from "../ui/atoms.js";
import { Stars } from "../ui/stars.js";
import { ArrowRight, Sparkles } from "../icons.js";
import { evStart, evEnd, statusOf, evColor } from "../lib/events.js";
import { fmtDay, fmtTime, countdown } from "../lib/time.js";

export function Home(p) {
  const T = useT();
  const live = useMemo(() => p.events.filter((e) => statusOf(e, p.now) === "live"), [p.events, p.now]);
  const next = useMemo(() => p.events.filter((e) => evStart(e) > p.now).sort((a, b) => evStart(a) - evStart(b))[0], [p.events, p.now]);
  const past = p.events.filter((e) => evEnd(e) < p.now).length;

  const stat = (n, label) => h("div", { className: "text-center" },
    h("div", { style: { fontFamily: DISPLAY, fontSize: 30, lineHeight: 1 } }, n),
    h("div", { className: "mt-1", style: { fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.18em", color: T.muted } }, label));

  return h("div", { className: "h-full relative overflow-y-auto" },
    h("div", { className: "absolute inset-0 pointer-events-none" }, h(Stars, { width: 1400, height: 950, T, density: 9 })),

    h("div", { className: "relative min-h-full flex flex-col items-center justify-center px-6 py-10 text-center" },
      h("div", { className: "relative mb-7", style: { width: 92, height: 92, animation: "floatUp .7s ease both" } },
        h("div", { className: "core absolute", style: { inset: -26, borderRadius: "50%",
          background: "radial-gradient(closest-side, " + T.bloom + ", transparent)" } }),
        h("div", { className: "absolute", style: { left: "50%", top: "50%", transform: "translate(-50%,-50%)",
          width: 16, height: 16, borderRadius: "50%", background: T.current, boxShadow: "0 0 26px " + T.current } }),
        h("div", { className: "absolute breathe", style: { left: "50%", top: "50%", transform: "translate(-50%,-50%) rotate(45deg)",
          width: 52, height: 52, border: "1px solid " + T.current, opacity: 0.35, borderRadius: 8 } })),

      h("div", { style: { fontFamily: DISPLAY, fontSize: 46, lineHeight: 1.05, letterSpacing: "0.02em",
        animation: "floatUp .7s ease both", animationDelay: ".05s" } }, "Every event,"),
      h("div", { style: { fontFamily: DISPLAY, fontSize: 46, lineHeight: 1.05, letterSpacing: "0.02em",
        ...(T.nova ? { background: "linear-gradient(92deg," + T.silver + "," + T.live + " 55%," + T.gold + ")",
          WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } : { color: T.muted }),
        animation: "floatUp .7s ease both", animationDelay: ".12s" } }, "one line of light."),

      h("p", { className: "mt-5 max-w-md text-sm", style: { color: T.body, lineHeight: 1.7,
        animation: "floatUp .7s ease both", animationDelay: ".2s" } },
        "The whole calendar as a constellation \u2014 what's running now, what's coming, and every result you've ever posted, kept in one place your whole team can open."),

      live.length ? h("div", { className: "mt-7 px-4 py-3 rounded-xl inline-flex items-center gap-3",
        style: { background: T.panel, border: "1px solid " + T.live + "55", animation: "floatUp .7s ease both", animationDelay: ".26s" } },
        h("span", { className: "breathe", style: { width: 8, height: 8, borderRadius: 8, background: T.live,
          boxShadow: "0 0 12px " + T.live, display: "inline-block" } }),
        h("div", { className: "text-left" },
          h("div", { style: { fontFamily: MONO, fontSize: 9, letterSpacing: "0.18em", color: T.live } }, "LIVE RIGHT NOW"),
          h("div", { style: { fontFamily: DISPLAY, fontSize: 17 } }, live[0].title))) : null,

      !live.length && next ? h("div", { className: "mt-7 px-4 py-3 rounded-xl inline-flex items-center gap-3",
        style: { background: T.panel, border: "1px solid " + T.hair, animation: "floatUp .7s ease both", animationDelay: ".26s" } },
        h("span", { style: { width: 9, height: 9, borderRadius: 2, transform: "rotate(45deg)", background: evColor(next),
          boxShadow: "0 0 12px " + evColor(next), display: "inline-block" } }),
        h("div", { className: "text-left" },
          h("div", { style: { fontFamily: MONO, fontSize: 9, letterSpacing: "0.18em", color: T.muted } },
            "NEXT UP \u00B7 " + countdown(next.start, p.now).toUpperCase()),
          h("div", { style: { fontFamily: DISPLAY, fontSize: 17 } }, next.title),
          h("div", { style: { fontFamily: MONO, fontSize: 9, color: T.muted } },
            fmtDay(next.start) + (next.allDay ? "" : " \u00B7 " + fmtTime(next.start))))) : null,

      h("div", { className: "mt-9 flex gap-9", style: { animation: "floatUp .7s ease both", animationDelay: ".32s" } },
        stat(p.servers.length, "SERVER" + (p.servers.length === 1 ? "" : "S")),
        stat(p.events.length, "EVENTS"),
        stat(past, "IN THE PAST")),

      h("div", { className: "mt-9", style: { animation: "floatUp .7s ease both", animationDelay: ".38s" } },
        h(Btn, { tone: "solid", size: "lg", onClick: p.onEnter },
          h(Sparkles, { size: 15 }), " Open the timeline", h(ArrowRight, { size: 15 }))),

      h("div", { className: "mt-4", style: { fontFamily: MONO, fontSize: 9, letterSpacing: "0.16em", color: T.muted,
        animation: "floatUp .7s ease both", animationDelay: ".44s" } },
        p.registered ? "SIGNED IN AS " + String(p.myName || "").toUpperCase() : "ANYONE CAN LOOK \u00B7 STAFF CAN EDIT")));
}
