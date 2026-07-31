import { h } from "../react.js";
import { DISPLAY, MONO } from "../theme.js";
import { useT, Btn, Label } from "../ui/atoms.js";
import { Modal } from "../ui/modal.js";
import { X, Copy, Pencil, Trash, Link2, BadgeCheck, placeOf } from "../icons.js";
import { fmtFull, fmtTime, fmtDay, fmtDur, countdown, MIN } from "../lib/time.js";
import { resolveType, evShort, evColor, evHosts, evEnd, isMultiDay, statusOf } from "../lib/events.js";
import { announcement } from "./announce.js";

const Block = (p) => h("div", { className: "pt-4" }, h(Label, null, p.label), h("div", { className: "text-sm" }, p.children));

export function Detail(p) {
  const T = useT();
  const ev = p.ev;
  if (!ev) return null;
  const t = resolveType(ev);
  const st = statusOf(ev, p.now);
  const pl = ev.where && ev.where.channel ? placeOf(ev.where.kind) : null;
  const PlIcon = pl ? pl.icon : null;
  const winners = (ev.winners || []).filter((w) => w.name);
  const people = ev.participants || [];
  const files = (ev.attachments || []).filter((f) => f.url);
  const hosts = evHosts(ev);
  const end = evEnd(ev);
  const multi = isMultiDay(ev);
  const col = evColor(ev);
  const stLabel = st === "live" ? " \u00B7 LIVE NOW" : st === "soon" ? " \u00B7 STARTING SOON" : "";

  return h(Modal, { open: !!ev, onClose: p.onClose, wide: true },
    h("div", { className: "p-6" },
      h("div", { className: "flex items-start justify-between gap-3" },
        h("div", null,
          h("div", { className: "inline-flex items-center gap-1.5",
            style: { fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.16em",
              color: st === "live" ? T.live : st === "soon" ? T.soon : T.muted } },
            h("span", { style: { width: 8, height: 8, borderRadius: 2, transform: "rotate(45deg)", background: col, display: "inline-block" } }),
            evShort(ev) + (ev.label ? " \u00B7 " + t.short : "") + stLabel),
          h("div", { className: "mt-1.5", style: { fontFamily: DISPLAY, fontSize: 24, lineHeight: 1.2 } }, ev.title),
          h("div", { className: "mt-1", style: { fontFamily: MONO, fontSize: 10.5, color: T.body } },
            ev.allDay
              ? (multi ? fmtFull(ev.start) + " \u2192 " + fmtFull(end - MIN) + " \u00B7 all-day" : fmtFull(ev.start) + " \u00B7 all-day")
              : fmtFull(ev.start) + " \u00B7 " + fmtTime(ev.start) + (multi ? " \u2192 " + fmtDay(end) + " " + fmtTime(end) : " \u2192 " + fmtTime(end)) + " \u00B7 " + fmtDur(ev.durationMin),
            " \u00B7 " + countdown(ev.start, p.now)),
          pl ? h("div", { className: "mt-1 inline-flex items-center gap-1.5", style: { fontFamily: MONO, fontSize: 10, color: T.muted } },
            h(PlIcon, { size: 11 }), " " + pl.label + " \u00B7 " + ev.where.channel) : null),
        h("button", { onClick: p.onClose, style: { color: T.muted, background: "none", border: "none", cursor: "pointer" } }, h(X, { size: 19 }))),

      hosts.length ? h(Block, { label: hosts.length > 1 ? "Hosts" : "Host" },
        h("div", { className: "flex flex-wrap gap-2" }, hosts.map((hst) =>
          h("span", { key: hst, className: "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs",
            style: { background: T.panel, border: "1px solid " + T.hair } },
            (p.names || []).includes(hst.replace(/^@/, "")) ? h(BadgeCheck, { size: 11, style: { color: T.gold } }) : null,
            hst)))) : null,

      winners.length ? h(Block, { label: "Results" },
        h("div", { className: "space-y-1.5" }, winners.map((w, i) =>
          h("div", { key: i, className: "flex items-baseline gap-2.5" },
            h("span", { style: { fontFamily: MONO, fontSize: 10, color: T.gold } }, String(w.place || i + 1).padStart(2, "0")),
            h("span", { style: { fontWeight: (w.place || i + 1) === 1 ? 600 : 400 } }, w.name),
            w.score ? h("span", { style: { fontFamily: MONO, fontSize: 10, color: T.muted } }, w.score) : null,
            w.prize ? h("span", { className: "text-xs", style: { color: T.muted } }, w.prize) : null)))) : null,

      files.length ? h(Block, { label: "Attached \u00B7 " + files.length },
        h("div", { className: "flex flex-wrap gap-2" }, files.map((f, i) =>
          h("a", { key: i, href: f.url, target: "_blank", rel: "noopener noreferrer",
            className: "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs",
            style: { background: T.panel, border: "1px solid " + T.hair, color: T.text, textDecoration: "none" } },
            h(Link2, { size: 11, style: { color: T.gold } }), " " + (f.label || "Result link"))))) : null,

      people.length ? h(Block, { label: "Participants \u00B7 " + people.length },
        h("span", { style: { color: T.body, lineHeight: 1.7 } }, people.join(", "))) : null,

      ev.notes ? h(Block, { label: "Notes" }, h("span", { style: { color: T.body, whiteSpace: "pre-wrap" } }, ev.notes)) : null,

      h("div", { className: "flex gap-2 pt-5 flex-wrap" },
        h(Btn, { size: "sm", onClick: () => p.onCopy(announcement(ev)) }, h(Copy, { size: 12 }), " Copy for Discord"),
        p.perms.edit ? h(Btn, { size: "sm", onClick: () => p.onEdit(ev) }, h(Pencil, { size: 12 }), " Edit") : null,
        p.perms.delete ? h(Btn, { size: "sm", tone: "danger", onClick: () => p.onDelete(ev) }, h(Trash, { size: 12 })) : null),

      ev.updatedBy ? h("div", { className: "pt-3", style: { fontFamily: MONO, fontSize: 9, color: T.muted } },
        "LAST EDIT \u00B7 " + String(ev.updatedBy).toUpperCase()) : null));
}
