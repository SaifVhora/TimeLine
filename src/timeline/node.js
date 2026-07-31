import { h, useState } from "../react.js";
import { DISPLAY, MONO } from "../theme.js";
import { useT } from "../ui/atoms.js";
import { placeOf, Paperclip } from "../icons.js";
import { fmtTime, countdown } from "../lib/time.js";
import { statusOf, evShort, evColor, evRange } from "../lib/events.js";
import { statusColors } from "./lanes.js";

export function TimelineNode(p) {
  const T = useT();
  const [on, setOn] = useState(false);
  const ev = p.ev;
  const st = statusOf(ev, p.now);
  const c = statusColors(st, T, evColor(ev));
  const pl = ev.where && ev.where.channel ? placeOf(ev.where.kind) : null;
  const PlIcon = pl ? pl.icon : null;
  const win = (ev.winners || []).find((w) => w.name);
  const files = ev.attachments || [];
  const up = p.up;

  return h("div", {
    className: "absolute",
    style: { left: p.x, top: p.lineY, transform: "translateX(-50%)",
      animation: "rise .35s ease both", animationDelay: Math.min((p.idx || 0) * 38, 460) + "ms" },
    onMouseEnter: () => setOn(true), onMouseLeave: () => setOn(false),
  },
    /* arm */
    h("div", { style: { position: "absolute", left: "50%", top: up ? -p.arm : 0, width: 1, height: p.arm,
      background: up ? "linear-gradient(180deg, transparent, " + c.stroke + ")" : "linear-gradient(180deg, " + c.stroke + ", transparent)",
      opacity: on ? 1 : st === "past" ? 0.4 : 0.7 } }),

    /* live halo */
    st === "live" ? h("span", { style: { position: "absolute", left: "50%", top: 0, marginLeft: -9, marginTop: -9,
      width: 18, height: 18, borderRadius: 18, border: "1px solid " + T.live, pointerEvents: "none",
      animation: "pulseRing 1.8s ease-out infinite" } }) : null,

    /* the star */
    h("button", { onClick: p.onOpen, "aria-label": ev.title, className: st === "live" ? "breathe" : "",
      style: { position: "absolute", left: "50%", top: -5, width: 10, height: 10, marginLeft: -5,
        transform: "rotate(45deg) scale(" + (on ? 1.35 : 1) + ")", transition: "transform .18s ease",
        background: c.star, border: "1px solid " + c.star, borderRadius: 2, cursor: "pointer",
        boxShadow: c.glow ? "0 0 12px " + c.star : "0 0 6px " + T.current + "55" } }),

    /* card */
    h("button", { onClick: p.onOpen, className: "absolute text-left",
      style: { left: 12, top: up ? -(p.arm + p.card) : p.arm + 4, width: 150,
        opacity: on ? 1 : c.dim, transition: "opacity .2s ease", background: "none", border: "none", cursor: "pointer", padding: 0 } },
      h("div", { className: "truncate", style: { fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.12em", color: c.head } },
        evShort(ev) + (ev.allDay ? " \u00B7 ALL DAY" : " \u00B7 " + fmtTime(ev.start)) + (st === "live" ? " \u00B7 LIVE" : "")),
      h("div", { className: "mt-1", style: { fontFamily: DISPLAY, fontSize: 14, lineHeight: 1.25, color: T.text,
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } }, ev.title),
      h("div", { className: "mt-0.5", style: { fontFamily: MONO, fontSize: 8.5, color: T.muted } }, evRange(ev)),
      pl ? h("div", { className: "mt-0.5 truncate inline-flex items-center gap-1",
        style: { fontFamily: MONO, fontSize: 8.5, color: T.muted, maxWidth: 148 } },
        h(PlIcon, { size: 9 }), " " + ev.where.channel) : null,
      win ? h("div", { className: "mt-0.5 truncate", style: { fontFamily: MONO, fontSize: 9, color: T.gold } }, "01 " + win.name) : null,
      files.length ? h("div", { className: "mt-0.5 inline-flex items-center gap-1", style: { fontFamily: MONO, fontSize: 8, color: T.muted } },
        h(Paperclip, { size: 8 }), " " + files.length) : null,
      st === "upcoming" || st === "soon"
        ? h("div", { className: "mt-0.5", style: { fontFamily: MONO, fontSize: 8.5, color: st === "soon" ? T.soon : T.muted } },
            countdown(ev.start, p.now).toUpperCase())
        : null));
}
