import { h, useState, useEffect } from "../react.js";
import { DISPLAY, MONO } from "../theme.js";
import { useT, useInput, Btn, Label, Toggle, Chip } from "../ui/atoms.js";
import { Modal } from "../ui/modal.js";
import { X, Copy, Pencil, Trash, Link2, BadgeCheck, Download, Trophy, RotateCw, placeOf, Share2 } from "../icons.js";
import { PALETTE } from "../config.js";
import { exportWinnerPNG } from "../timeline/winner-png.js";
import { fmtFull, fmtTime, fmtDay, fmtDur, countdown, MIN } from "../lib/time.js";
import { resolveType, evShort, evColor, evHosts, evEnd, isMultiDay, statusOf, evWinners, evResultText } from "../lib/events.js";
import { announcement } from "./announce.js";
import { hookList, postToDiscord } from "../lib/webhooks.js";

const Block = (p) => h("div", { className: "pt-4" }, h(Label, null, p.label), h("div", { className: "text-sm" }, p.children));

export function Detail(p) {
  const T = useT();
  const [gfx, setGfx] = useState(false);
  const [posting, setPosting] = useState(false);
  const ev = p.ev;
  if (!ev) return null;
  const t = resolveType(ev);
  const st = statusOf(ev, p.now);
  const pl = ev.where && ev.where.channel ? placeOf(ev.where.kind) : null;
  const PlIcon = pl ? pl.icon : null;
  const winners = evWinners(ev);
  const resultText = evResultText(ev);
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

      ev.series && ev.series.id ? h("div", { className: "mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg",
        style: { background: T.panel, border: "1px solid " + T.hair, fontFamily: MONO, fontSize: 9, letterSpacing: "0.12em", color: T.muted } },
        h(RotateCw, { size: 10 }),
        "REPEATING \u00B7 " + ((ev.series.index || 0) + 1) + " OF " + (ev.series.of || "?")) : null,

      hosts.length ? h(Block, { label: hosts.length > 1 ? "Hosts" : "Host" },
        h("div", { className: "flex flex-wrap gap-2" }, hosts.map((hst) =>
          h("span", { key: hst, className: "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs",
            style: { background: T.panel, border: "1px solid " + T.hair } },
            (p.names || []).includes(hst.replace(/^@/, "")) ? h(BadgeCheck, { size: 11, style: { color: T.gold } }) : null,
            hst)))) : null,

      resultText ? h(Block, { label: "Result" },
        h("span", { style: { color: T.body, whiteSpace: "pre-wrap" } }, resultText)) : null,

      winners.length ? h(Block, { label: "Results" },
        h("div", { className: "space-y-2" }, winners.map((w, i) => {
          const pts = String(w.points || w.score || "").trim();
          return h("div", { key: i, className: "flex items-baseline gap-2.5 flex-wrap" },
            h("span", { style: { fontFamily: MONO, fontSize: 10, color: T.gold } }, String(w.place || i + 1).padStart(2, "0")),
            h("span", { style: { fontWeight: (w.place || i + 1) === 1 ? 600 : 400 } }, w.name),
            w.uid ? h("span", { style: { fontFamily: MONO, fontSize: 9.5, color: T.muted } }, "ID " + w.uid) : null,
            pts ? h("span", { className: "px-1.5 py-0.5 rounded-md",
              style: { fontFamily: MONO, fontSize: 9.5, color: col, background: col + "1f", border: "1px solid " + col + "55" } },
              pts + " PTS") : null,
            w.prize ? h("span", { className: "text-xs", style: { color: T.body } }, w.prize) : null);
        }))) : null,

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
        (p.hooks || []).length
          ? h(Btn, { size: "sm", tone: "solid", disabled: posting,
              onClick: async () => {
                const hook = p.hooks.find((w) => w.id === (ev.remind && ev.remind.hook)) || p.hooks[0];
                setPosting(true);
                const r = await postToDiscord(hook.url, announcement(ev));
                setPosting(false);
                p.onPing(r.ok ? "Posted to " + hook.name : r.error, !r.ok);
              } },
              h(Share2, { size: 12 }), posting ? " Posting\u2026" : " Post to Discord")
          : null,
        (winners.length || resultText) ? h(Btn, { size: "sm", tone: "gold", onClick: () => setGfx(true) },
          h(Trophy, { size: 12 }), " Winner graphic") : null,
        p.perms.edit ? h(Btn, { size: "sm", onClick: () => p.onEdit(ev) }, h(Pencil, { size: 12 }), " Edit") : null,
        p.perms.delete ? h(Btn, { size: "sm", tone: "danger", onClick: () => p.onDelete(ev) }, h(Trash, { size: 12 })) : null),

      ev.updatedBy ? h("div", { className: "pt-3", style: { fontFamily: MONO, fontSize: 9, color: T.muted } },
        "LAST EDIT \u00B7 " + String(ev.updatedBy).toUpperCase()) : null,

      h(WinnerGfx, { open: gfx, onClose: () => setGfx(false), ev, serverName: p.serverName, ping: p.onPing })));
}

/* the winner graphic maker */
export function WinnerGfx(p) {
  const T = useT();
  const input = useInput();
  const [o, setO] = useState({ heading: "WINNERS", note: "", color: null, showHosts: true, showDate: true, showIds: true });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (p.open) setO((x) => ({ ...x, color: null })); }, [p.open]);
  if (!p.open || !p.ev) return null;

  const go = async () => {
    setBusy(true);
    try {
      const ok = await exportWinnerPNG({ ev: p.ev, T, serverName: p.serverName,
        heading: o.heading, note: o.note, color: o.color, showHosts: o.showHosts, showDate: o.showDate, showIds: o.showIds });
      p.ping && p.ping(ok ? "Graphic saved to your downloads" : "The browser blocked the download", !ok);
      if (ok) p.onClose();
    } catch (e) {
      p.ping && p.ping("Couldn't make the graphic: " + (e && e.message ? e.message : "unknown"), true);
    }
    setBusy(false);
  };

  const HEADINGS = ["WINNERS", "RESULTS", "CHAMPION", "TOP PLAYERS", "FINAL STANDINGS"];

  return h(Modal, { open: p.open, onClose: p.onClose },
    h("div", { className: "p-6" },
      h("div", { style: { fontFamily: DISPLAY, fontSize: 20 } }, "Winner graphic"),
      h("p", { className: "mt-1.5 mb-4 text-sm", style: { color: T.body } },
        "A card with the results, ready to post in Discord."),

      h("div", null, h(Label, null, "Heading"),
        h("div", { className: "flex gap-1.5 flex-wrap mb-2" },
          HEADINGS.map((x) => h(Chip, { key: x, on: o.heading === x, onClick: () => setO({ ...o, heading: x }) }, x))),
        h("input", { style: input, value: o.heading, maxLength: 22,
          onChange: (e) => setO({ ...o, heading: e.target.value }), placeholder: "Or write your own" })),

      h("div", { className: "mt-4" }, h(Label, null, "Accent colour"),
        h("div", { className: "flex gap-1.5 flex-wrap items-center" },
          h(Chip, { on: !o.color, onClick: () => setO({ ...o, color: null }) }, "EVENT COLOUR"),
          PALETTE.map((c) => h("button", { key: c, onClick: () => setO({ ...o, color: c }),
            style: { width: 24, height: 24, borderRadius: "50%", background: c, cursor: "pointer",
              border: o.color === c ? "2px solid " + T.text : "2px solid transparent" } })))),

      h("div", { className: "mt-4" }, h(Label, null, "Message"),
        h("textarea", { rows: 3, style: { ...input, resize: "vertical" }, value: o.note, maxLength: 190,
          onChange: (e) => setO({ ...o, note: e.target.value }),
          placeholder: "Anything you want written under the results \u2014 thanks, next event, rules" }),
        h("div", { className: "mt-1 text-xs", style: { color: T.muted } },
          (o.note || "").length + "/190 \u00B7 wraps to three lines on the card")),

      h("div", { className: "mt-4 space-y-3" },
        h(Toggle, { on: o.showIds, label: "Show user IDs under names", onChange: (v) => setO({ ...o, showIds: v }) }),
        h(Toggle, { on: o.showDate, label: "Show the date", onChange: (v) => setO({ ...o, showDate: v }) }),
        h(Toggle, { on: o.showHosts, label: "Show who hosted", onChange: (v) => setO({ ...o, showHosts: v }) })),

      h("div", { className: "mt-5 flex gap-2" },
        h(Btn, { tone: "solid", full: true, disabled: busy, onClick: go },
          h(Download, { size: 13 }), busy ? " Making it\u2026" : " Save the graphic"),
        h(Btn, { onClick: p.onClose }, "Cancel"))));
}
