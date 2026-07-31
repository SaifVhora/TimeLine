import { h, useState, useEffect } from "../react.js";
import { DISPLAY, MONO } from "../theme.js";
import { useT, useInput, Btn, Label, Field, Toggle, Chip } from "../ui/atoms.js";
import { Modal } from "../ui/modal.js";
import { X, Plus, CalendarDays, FileText, Trophy, Users } from "../icons.js";
import { TYPES, PALETTE } from "../config.js";
import { MIN, DAY, HOUR, fmtDay, fmtTime, fmtDur, sameDay, startOfDay } from "../lib/time.js";
import { uid } from "../lib/util.js";
import { resolveType, evHosts, kindFromType } from "../lib/events.js";
import { DayPick, TimeField, HostsInput } from "./pickers.js";

export const blankEvent = () => ({
  id: uid(), title: "", type: "vc", label: "", color: null, allDay: false,
  start: new Date(Date.now() + HOUR).toISOString(), durationMin: 90,
  hosts: [], where: { kind: "voice", channel: "" },
  winners: [{ place: 1, name: "", prize: "", score: "" }], attachments: [], participants: [], notes: "",
});

const TABS = [
  { id: "when", label: "When", icon: CalendarDays },
  { id: "what", label: "What", icon: FileText },
  { id: "results", label: "Results", icon: Trophy },
  { id: "people", label: "People", icon: Users },
];

export function Editor(p) {
  const T = useT();
  const input = useInput();
  const [d, setD] = useState(null);
  const [tab, setTab] = useState("when");
  const [peopleText, setPeopleText] = useState("");

  useEffect(() => {
    if (p.ev) {
      const end = new Date(new Date(p.ev.start).getTime() + (p.ev.durationMin || 90) * MIN).toISOString();
      setD({ where: { kind: "voice", channel: "" }, ...p.ev, type: resolveType(p.ev).id,
        label: p.ev.label || "", color: p.ev.color || null, allDay: !!p.ev.allDay, hosts: evHosts(p.ev), end });
    } else setD(null);
    setTab("when");
    setPeopleText(((p.ev && p.ev.participants) || []).join(", "));
  }, [p.ev]);

  if (!d) return null;

  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));
  const setW = (i, k, v) => setD((x) => { const w = [...(x.winners || [])]; w[i] = { ...w[i], [k]: v }; return { ...x, winners: w }; });
  const setF = (i, k, v) => setD((x) => { const a = [...(x.attachments || [])]; a[i] = { ...a[i], [k]: v }; return { ...x, attachments: a }; });
  const durMin = (x) => Math.max(5, Math.round((new Date(x.end) - new Date(x.start)) / MIN));

  const setStartTime = (iso) => setD((x) => {
    const delta = new Date(iso) - new Date(x.start);
    return { ...x, start: iso, end: new Date(new Date(x.end).getTime() + delta).toISOString() };
  });
  const setEndTime = (iso) => setD((x) => ({ ...x,
    end: new Date(iso) > new Date(x.start) ? iso : new Date(new Date(x.start).getTime() + HOUR).toISOString() }));

  const setStartDay = (y, mo, dd) => setD((x) => {
    const span = Math.max(0, Math.round((startOfDay(x.end) - startOfDay(x.start)) / DAY));
    const s = new Date(x.start); s.setFullYear(y, mo, dd);
    const e = new Date(x.end); e.setFullYear(y, mo, dd + span);
    if (x.allDay) { s.setHours(0, 0, 0, 0); e.setHours(23, 59, 0, 0); }
    return { ...x, start: s.toISOString(), end: e.toISOString() };
  });
  const setEndDay = (y, mo, dd) => setD((x) => {
    const e = new Date(x.end); e.setFullYear(y, mo, dd);
    if (x.allDay) e.setHours(23, 59, 0, 0);
    if (e <= new Date(x.start)) return x;
    return { ...x, end: e.toISOString() };
  });

  const toggleAllDay = (on) => setD((x) => {
    if (on) {
      const s = new Date(x.start); s.setHours(0, 0, 0, 0);
      const e = new Date(x.end); e.setHours(23, 59, 0, 0);
      return { ...x, allDay: true, start: s.toISOString(),
        end: (e <= s ? new Date(s.getFullYear(), s.getMonth(), s.getDate(), 23, 59) : e).toISOString() };
    }
    const s = new Date(x.start); s.setHours(20, 0, 0, 0);
    return { ...x, allDay: false, start: s.toISOString(), end: new Date(s.getTime() + 90 * MIN).toISOString() };
  });

  const summary = d.allDay
    ? (sameDay(d.start, new Date(d.end).getTime() - MIN) ? fmtDay(d.start) + " \u00B7 all day" : fmtDay(d.start) + " \u2192 " + fmtDay(d.end))
    : fmtDay(d.start) + " " + fmtTime(d.start) + " \u2192 " + fmtDay(d.end) + " " + fmtTime(d.end) + " \u00B7 " + fmtDur(durMin(d));

  const save = () => {
    const { end, ...rest } = d;
    const hosts = (d.hosts || []).filter(Boolean);
    p.onSave({
      ...rest,
      durationMin: durMin(d),
      title: (d.title || "").trim() || "Untitled event",
      label: (d.label || "").trim(),
      color: d.color || null,
      allDay: !!d.allDay,
      hosts, host: hosts.join(", "),
      where: d.where && d.where.channel && d.where.channel.trim()
        ? { kind: kindFromType[d.type] || "other", channel: d.where.channel.trim() } : null,
      participants: peopleText.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
      winners: (d.winners || []).filter((w) => (w.name || "").trim()),
      attachments: (d.attachments || []).filter((f) => (f.url || "").trim()),
    });
  };

  return h(Modal, { open: !!d, onClose: p.onClose, wide: true },
    h("div", { className: "p-5 sm:p-6" },
      h("div", { className: "flex items-center justify-between mb-1" },
        h("div", { style: { fontFamily: DISPLAY, fontSize: 21 } }, p.ev && p.ev.title ? "Edit event" : "New event"),
        h("button", { onClick: p.onClose, style: { color: T.muted, background: "none", border: "none", cursor: "pointer" } }, h(X, { size: 19 }))),
      h("div", { className: "mb-4", style: { fontFamily: MONO, fontSize: 10, color: T.muted } },
        (d.title || "Untitled") + " \u00B7 " + summary),

      h("div", { className: "flex gap-1 mb-5 p-1 rounded-xl", style: { background: T.panel, border: "1px solid " + T.hair } },
        TABS.map((t) => h("button", { key: t.id, onClick: () => setTab(t.id),
          className: "flex-1 py-2 rounded-lg inline-flex items-center justify-center gap-1.5",
          style: { background: tab === t.id ? T.solidBtn : "transparent", color: tab === t.id ? T.solidInk : T.muted,
            fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.1em", border: "none", cursor: "pointer" } },
          h(t.icon, { size: 12 }), h("span", { className: "hidden sm:inline" }, t.label.toUpperCase())))),

      tab === "when" ? h("div", { className: "space-y-4" },
        h("div", { className: "rounded-xl px-3 py-2.5", style: { background: T.panel, border: "1px solid " + T.hair } },
          h("div", { style: { fontFamily: DISPLAY, fontSize: 15 } }, summary)),
        h(Toggle, { on: !d.allDay, onChange: (on) => toggleAllDay(!on),
          label: d.allDay ? "All-day \u2014 no clock times" : "Set start & end times" }),

        h("div", { className: "grid sm:grid-cols-2 gap-4" },
          h("div", { className: "space-y-2" },
            h(Label, null, d.allDay ? "First day" : "Starts"),
            h(DayPick, { value: d.start, onPick: setStartDay }),
            !d.allDay ? h(TimeField, { label: "Start time", value: d.start, onChange: setStartTime }) : null),
          h("div", { className: "space-y-2" },
            h(Label, null, d.allDay ? "Last day" : "Ends"),
            h(DayPick, { value: d.end, onPick: setEndDay }),
            !d.allDay ? h(TimeField, { label: "End time", value: d.end, onChange: setEndTime }) : null)),

        !d.allDay ? h("div", null, h(Label, null, "Quick length from start"),
          h("div", { className: "flex gap-1.5 flex-wrap" },
            [["1H", 60], ["90M", 90], ["3H", 180], ["1 DAY", 1440], ["3 DAYS", 4320], ["1 WEEK", 10080]].map(([l, mns]) =>
              h("button", { key: l, onClick: () => setD((x) => ({ ...x, end: new Date(new Date(x.start).getTime() + mns * MIN).toISOString() })),
                className: "px-2 py-1 rounded-md",
                style: { fontFamily: MONO, fontSize: 9, letterSpacing: "0.06em", cursor: "pointer",
                  border: "1px solid " + (durMin(d) === mns ? T.gold + "66" : T.hair),
                  background: durMin(d) === mns ? "rgba(180,140,40,.1)" : "transparent",
                  color: durMin(d) === mns ? T.gold : T.muted } }, l))) ) : null,

        h("div", { className: "text-xs", style: { color: T.muted } },
          d.allDay ? "All-day events run 12:00 AM on the first day to 11:59 PM on the last."
                   : "Everyone sees these times in their own time zone.")) : null,

      tab === "what" ? h("div", { className: "space-y-4" },
        h(Field, { label: "Event name" },
          h("input", { style: input, value: d.title, onChange: (e) => set("title", e.target.value), placeholder: "Event title" })),

        h("div", null, h(Label, null, "Type"),
          h("div", { className: "flex gap-1.5 flex-wrap mb-2" }, TYPES.map((t) =>
            h(Chip, { key: t.id, on: d.type === t.id, color: t.color, onClick: () => set("type", t.id) },
              h("span", { style: { width: 7, height: 7, borderRadius: 2, transform: "rotate(45deg)", background: t.color, display: "inline-block" } }),
              t.label.toUpperCase()))),
          h("input", { style: input, value: d.label, onChange: (e) => set("label", e.target.value.slice(0, 28)),
            placeholder: "Custom label \u2014 e.g. Last to Leave VC (optional, shows on the line)" })),

        h("div", null, h(Label, null, "Line colour"),
          h("div", { className: "flex gap-1.5 flex-wrap items-center" },
            h(Chip, { on: !d.color, onClick: () => set("color", null) }, "AUTO"),
            PALETTE.map((c) => h("button", { key: c, onClick: () => set("color", c),
              style: { width: 24, height: 24, borderRadius: "50%", background: c, cursor: "pointer",
                border: d.color === c ? "2px solid " + T.text : "2px solid transparent" } })))),

        h("div", null, h(Label, null, "Hosts"),
          h(HostsInput, { value: d.hosts, onChange: (v) => set("hosts", v), names: p.names })),

        h("div", null, h(Label, null, "Where it happens"),
          h("input", { style: input, value: (d.where && d.where.channel) || "",
            onChange: (e) => set("where", { kind: kindFromType[d.type] || "other", channel: e.target.value }),
            placeholder: d.type === "vc" ? "Voice channel, e.g. events-vc"
              : d.type === "channel" ? "Text channel, e.g. #event-chat" : "Where, e.g. whole server / stage" })),

        h(Field, { label: "Notes" },
          h("textarea", { rows: 3, style: { ...input, resize: "vertical" }, value: d.notes,
            onChange: (e) => set("notes", e.target.value), placeholder: "Format, rules, anything the team should know" }))) : null,

      tab === "results" ? h("div", { className: "space-y-5" },
        h("div", null, h(Label, null, "Placements"),
          h("div", { className: "space-y-2" }, (d.winners || []).map((w, i) =>
            h("div", { key: i, className: "flex gap-2 items-center" },
              h("span", { className: "w-8 shrink-0 text-center py-2 rounded-lg",
                style: { background: "rgba(180,140,40,.1)", border: "1px solid rgba(180,140,40,.3)", fontFamily: MONO, fontSize: 10, color: T.gold } },
                String(w.place || i + 1).padStart(2, "0")),
              h("input", { style: input, value: w.name || "", onChange: (e) => setW(i, "name", e.target.value), placeholder: "Placement holder" }),
              h("input", { style: { ...input, maxWidth: 92 }, value: w.score || "", onChange: (e) => setW(i, "score", e.target.value), placeholder: "Score" }),
              h("input", { style: { ...input, maxWidth: 100 }, value: w.prize || "", onChange: (e) => setW(i, "prize", e.target.value), placeholder: "Prize" }),
              h("button", { onClick: () => setD((x) => ({ ...x, winners: x.winners.filter((_, y) => y !== i) })),
                style: { color: T.muted, background: "none", border: "none", cursor: "pointer" } }, h(X, { size: 15 }))))),
          h("button", { className: "mt-2 inline-flex items-center gap-1.5 text-xs",
            style: { color: T.gold, background: "none", border: "none", cursor: "pointer" },
            onClick: () => setD((x) => ({ ...x, winners: [...(x.winners || []), { place: (x.winners || []).length + 1, name: "", prize: "", score: "" }] })) },
            h(Plus, { size: 12 }), " Add a place")),
        h("div", null, h(Label, null, "Attached results"),
          h("div", { className: "text-xs mb-2", style: { color: T.muted } }, "Link a results graphic, a message, or a full scoreboard."),
          h("div", { className: "space-y-2" }, (d.attachments || []).map((f, i) =>
            h("div", { key: i, className: "flex gap-2 items-center" },
              h("input", { style: { ...input, maxWidth: 130 }, value: f.label || "", onChange: (e) => setF(i, "label", e.target.value), placeholder: "Label" }),
              h("input", { style: input, value: f.url || "", onChange: (e) => setF(i, "url", e.target.value), placeholder: "https://" }),
              h("button", { onClick: () => setD((x) => ({ ...x, attachments: x.attachments.filter((_, y) => y !== i) })),
                style: { color: T.muted, background: "none", border: "none", cursor: "pointer" } }, h(X, { size: 15 }))))),
          h("button", { className: "mt-2 inline-flex items-center gap-1.5 text-xs",
            style: { color: T.gold, background: "none", border: "none", cursor: "pointer" },
            onClick: () => setD((x) => ({ ...x, attachments: [...(x.attachments || []), { label: "", url: "" }] })) },
            h(Plus, { size: 12 }), " Attach a link"))) : null,

      tab === "people" ? h(Field, { label: "Participants", hint: "Separate with commas or new lines" },
        h("textarea", { rows: 6, style: { ...input, resize: "vertical" }, value: peopleText,
          onChange: (e) => setPeopleText(e.target.value), placeholder: "Add participants" })) : null,

      h("div", { className: "mt-6 flex gap-2" },
        h(Btn, { tone: "solid", full: true, onClick: save }, "Save event"),
        h(Btn, { onClick: p.onClose }, "Cancel"))));
}
