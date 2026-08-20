import { h, useState, useEffect } from "../react.js";
import { DISPLAY, MONO } from "../theme.js";
import { useT, useInput, Btn, Label, Field, Toggle, Chip } from "../ui/atoms.js";
import { Modal } from "../ui/modal.js";
import { X, Plus, CalendarDays, FileText, Trophy, Users, RotateCw, Hourglass, AlertCircle, Sparkles } from "../icons.js";
import { TYPES, PALETTE } from "../config.js";
import { MIN, DAY, HOUR, fmtDay, fmtTime, fmtDur, sameDay, startOfDay } from "../lib/time.js";
import { uid } from "../lib/util.js";
import { resolveType, evHosts, kindFromType } from "../lib/events.js";
import { DayPick, TimeField, HostsInput } from "./pickers.js";
import { RULES, blankRepeat, repeatSummary, seriesStarts } from "../lib/recur.js";
import { SaveTemplate } from "./templates-modal.js";
import { ChartCalc } from "./chart-calc.js";
import { LEADS, remOf } from "../lib/reminders.js";
import { hookList } from "../lib/webhooks.js";
import { brConflicts, brLine } from "../lib/breaks.js";

export const blankEvent = () => ({
  id: uid(), title: "", type: "vc", label: "", color: null, allDay: false, side: "auto",
  start: new Date(Date.now() + HOUR).toISOString(), durationMin: 90,
  hosts: [], where: { kind: "voice", channel: "" },
  winners: [blankWinner(1)], resultText: "", attachments: [], participants: [], notes: "",
  repeat: blankRepeat(), series: null,
});

export const blankWinner = (place) => ({ place, name: "", uid: "", points: "", prize: "" });

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
  const [savingTpl, setSavingTpl] = useState(false);
  const [calc, setCalc] = useState(false);
  const [tab, setTab] = useState("when");
  const [peopleText, setPeopleText] = useState("");

  useEffect(() => {
    if (p.ev) {
      const end = new Date(new Date(p.ev.start).getTime() + (p.ev.durationMin || 90) * MIN).toISOString();
      setD({ where: { kind: "voice", channel: "" }, ...p.ev, type: resolveType(p.ev).id,
        label: p.ev.label || "", color: p.ev.color || null, allDay: !!p.ev.allDay,
        side: p.ev.side || "auto", hosts: evHosts(p.ev),
        resultText: p.ev.resultText || "",
        resultMode: (p.ev.resultText || "").trim() ? "text" : "places",
        repeat: p.ev.repeat && p.ev.repeat.rule ? p.ev.repeat : blankRepeat(),
        series: p.ev.series || null,
        scope: "one",
        end });
    } else setD(null);
    setTab("when");
    setPeopleText(((p.ev && p.ev.participants) || []).join(", "));
  }, [p.ev]);

  if (!d) return null;

  const startMs = new Date(d.start).getTime();
  const endMs = new Date(d.end).getTime();
  const clash = brConflicts(p.breaks || [], startMs, endMs, d.type);
  const blocked = clash.length > 0 && !d.overrideBreak;
  const inSeries = !!(d.series && d.series.id);
  const occurrences = seriesStarts(d.start, d.repeat).length;

  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));
  const setR = (k, v) => setD((x) => ({ ...x, repeat: { ...x.repeat, [k]: v }, overrideBreak: false }));
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
      side: d.side || "auto",
      hosts, host: hosts.join(", "),
      where: d.where && d.where.channel && d.where.channel.trim()
        ? { kind: kindFromType[d.type] || "other", channel: d.where.channel.trim() } : null,
      participants: peopleText.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
      resultText: d.resultMode === "text" ? (d.resultText || "").trim() : "",
      winners: d.resultMode === "text" ? [] : (d.winners || []).filter((w) => (w.name || "").trim()),
      attachments: (d.attachments || []).filter((f) => (f.url || "").trim()),
      repeat: d.repeat && d.repeat.rule !== "none" ? d.repeat : null,
      series: d.series || null,
      _scope: inSeries ? (d.scope || "one") : "one",
      _isNew: !(p.ev && p.ev.createdAt),
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
                   : "Everyone sees these times in their own time zone."),

        /* ── repeats ── */
        h("div", { className: "pt-2" },
          h(Label, null, h("span", { className: "inline-flex items-center gap-1.5" },
            h(RotateCw, { size: 10 }), "Repeats")),
          h("div", { className: "flex gap-1.5 flex-wrap" }, RULES.map((r) =>
            h(Chip, { key: r.id, on: (d.repeat && d.repeat.rule || "none") === r.id,
              onClick: () => setR("rule", r.id) }, r.label))),

          d.repeat && d.repeat.rule !== "none" ? h("div", { className: "mt-3 space-y-2.5" },
            h("div", { className: "flex gap-1.5 flex-wrap" },
              h(Chip, { on: d.repeat.mode !== "until", onClick: () => setR("mode", "count") }, "A SET NUMBER OF TIMES"),
              h(Chip, { on: d.repeat.mode === "until", onClick: () => setR("mode", "until") }, "UNTIL A DATE")),

            d.repeat.mode === "until"
              ? h("div", null,
                  h(Label, null, "Repeat until"),
                  h(DayPick, { value: d.repeat.until || d.end,
                    onPick: (y, mo, dd) => setR("until", new Date(y, mo, dd, 23, 59).toISOString()) }))
              : h("div", { className: "flex gap-1.5 flex-wrap items-center" },
                  [2, 4, 6, 8, 12, 24].map((n) =>
                    h(Chip, { key: n, on: Number(d.repeat.count) === n, onClick: () => setR("count", n) }, n + "\u00D7")),
                  h("input", { type: "number", min: 1, max: 60, value: d.repeat.count || 1,
                    onChange: (e) => setR("count", Math.max(1, Math.min(60, Number(e.target.value) || 1))),
                    style: { ...input, maxWidth: 76, textAlign: "center" } })),

            h("div", { className: "rounded-xl px-3 py-2.5",
              style: { background: T.panel, border: "1px solid " + T.hair } },
              h("div", { className: "text-sm" }, repeatSummary(d.repeat)),
              h("div", { className: "mt-1", style: { fontFamily: MONO, fontSize: 9, color: T.gold, letterSpacing: "0.12em" } },
                occurrences + " EVENT" + (occurrences === 1 ? "" : "S") + " WILL BE ADDED TO THE LINE"))) : null),

        /* ── editing one of a repeating set ── */
        inSeries ? h("div", { className: "rounded-xl p-3",
          style: { background: T.panel, border: "1px solid " + T.hair } },
          h(Label, null, "This is one of a repeating set"),
          h("div", { className: "flex gap-1.5 flex-wrap" },
            h(Chip, { on: (d.scope || "one") === "one", onClick: () => set("scope", "one") }, "THIS ONE ONLY"),
            h(Chip, { on: d.scope === "future", onClick: () => set("scope", "future") }, "THIS & LATER ONES"),
            h(Chip, { on: d.scope === "all", onClick: () => set("scope", "all") }, "THE WHOLE SET")),
          h("div", { className: "mt-2 text-xs", style: { color: T.muted } },
            (d.scope || "one") === "one"
              ? "Only this occurrence changes."
              : "Name, type, hosts, place, notes, length and start time travel to the others \u2014 each keeps its own date.")) : null,

        /* ── reminders ── */
        h("div", { className: "pt-1", style: { borderTop: "1px solid " + T.hair } },
          h("div", { className: "pt-3" },
            h(Label, null, "Remind Discord before it starts"),
            (p.hooks || []).length
              ? h("div", null,
                  h("div", { className: "flex gap-1.5 flex-wrap" }, LEADS.map((l) => {
                    const on = ((d.remind && d.remind.leads) || []).includes(l.id);
                    return h(Chip, { key: l.id, on,
                      onClick: () => setD((x) => {
                        const cur = (x.remind && x.remind.leads) || [];
                        const leads = on ? cur.filter((n) => n !== l.id) : [...cur, l.id];
                        return { ...x, remind: { ...(x.remind || {}), leads,
                          hook: (x.remind && x.remind.hook) || (p.hooks[0] && p.hooks[0].id) } };
                      }) }, l.label);
                  })),
                  ((d.remind && d.remind.leads) || []).length
                    ? h("div", { className: "mt-2.5" },
                        h("div", { style: { fontFamily: MONO, fontSize: 9.5, color: T.muted, marginBottom: 5 } }, "POST IT IN"),
                        h("div", { className: "flex gap-1.5 flex-wrap" }, p.hooks.map((w) =>
                          h(Chip, { key: w.id, on: (d.remind && d.remind.hook) === w.id,
                            onClick: () => setD((x) => ({ ...x, remind: { ...(x.remind || {}), hook: w.id } })) },
                            w.name.toUpperCase()))))
                    : h("div", { className: "mt-1.5 text-xs", style: { color: T.muted } },
                        "Off \u2014 nothing gets posted automatically."))
              : h("div", { className: "text-xs", style: { color: T.muted } },
                  "Connect a Discord channel in the admin panel first, then reminders can post there."))),

        /* ── break in the way ── */
        clash.length ? h("div", { className: "rounded-xl p-3",
          style: { background: "rgba(210,60,80,.09)", border: "1px solid rgba(210,60,80,.3)" } },
          h("div", { className: "inline-flex items-center gap-1.5 mb-1.5",
            style: { fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.16em", color: T.danger } },
            h(Hourglass, { size: 11 }), "THE TEAM IS ON BREAK"),
          clash.map((b) => h("div", { key: b.id, className: "text-sm" },
            brLine(b), b.reason ? h("span", { style: { color: T.muted } }, " \u2014 " + b.reason) : null)),
          h("div", { className: "mt-2.5 flex items-center gap-2 flex-wrap" },
            h(Chip, { on: !!d.overrideBreak, onClick: () => set("overrideBreak", !d.overrideBreak) },
              d.overrideBreak ? "OVERRIDDEN" : "SCHEDULE ANYWAY"),
            h("span", { className: "text-xs", style: { color: T.muted } },
              d.overrideBreak ? "Saving is unlocked." : "Move the date, or override to save regardless."))) : null) : null,

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

        h("div", null, h(Label, null, "Where it sits on the line"),
          h("div", { className: "flex gap-1.5 flex-wrap" },
            [["auto", "AUTO"], ["top", "ABOVE"], ["bot", "BELOW"]].map((opt) =>
              h(Chip, { key: opt[0], on: (d.side || "auto") === opt[0], onClick: () => set("side", opt[0]) }, opt[1]))),
          h("div", { className: "mt-1.5 text-xs", style: { color: T.muted } },
            (d.side || "auto") === "auto"
              ? "Placed automatically so nothing overlaps."
              : "Pinned " + (d.side === "top" ? "above" : "below") + " the line. Pinned events that clash stack outward on that side.")),

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

        h("div", null,
          h(Label, null, "How results are recorded"),
          h("div", { className: "flex gap-1.5 flex-wrap" },
            h(Chip, { on: (d.resultMode || "places") === "places", onClick: () => set("resultMode", "places") }, "PLACEMENTS"),
            h(Chip, { on: d.resultMode === "text", onClick: () => set("resultMode", "text") }, "JUST WRITE IT")),
          h("div", { className: "mt-1.5 text-xs", style: { color: T.muted } },
            d.resultMode === "text"
              ? "Free text \u2014 write it however you like."
              : "Ranked list with scores and prizes.")),

        /* chat chart events score themselves from a pasted chart */
        (d.resultMode || "places") === "places"
          ? h("button", {
              onClick: () => setCalc(true),
              className: "w-full text-left px-3 py-2.5 rounded-xl",
              style: { background: T.field, border: "1px solid " + T.hair, cursor: "pointer", color: T.body },
            },
              h("div", { className: "inline-flex items-center gap-2", style: { fontFamily: DISPLAY, fontSize: 15 } },
                h(Trophy, { size: 14, style: { color: T.gold } }), "Score a chat chart"),
              h("div", { className: "mt-0.5", style: { fontFamily: MONO, fontSize: 9.5, color: T.muted } },
                "SET THE POINTS \u00B7 PASTE THE CHART \u00B7 FILLS THE PLACEMENTS"))
          : null,

        d.resultMode === "text"
          ? h(Field, { label: "Result", hint: "Shown on the event and copied into the Discord post" },
              h("textarea", { rows: 4, style: { ...input, resize: "vertical" }, value: d.resultText || "",
                onChange: (e) => set("resultText", e.target.value),
                placeholder: "e.g. Ann took it with 42 points, Bo close behind" }))
          : h("div", null, h(Label, null, "Placements"),
          h("div", { className: "space-y-2.5" }, (d.winners || []).map((w, i) =>
            h("div", { key: i, className: "rounded-xl p-2.5",
              style: { background: T.panel, border: "1px solid " + T.hair } },
              h("div", { className: "flex gap-2 items-center" },
                h("span", { className: "w-8 shrink-0 text-center py-2 rounded-lg",
                  style: { background: "rgba(180,140,40,.1)", border: "1px solid rgba(180,140,40,.3)", fontFamily: MONO, fontSize: 10, color: T.gold } },
                  String(w.place || i + 1).padStart(2, "0")),
                h("input", { style: input, value: w.name || "", onChange: (e) => setW(i, "name", e.target.value), placeholder: "Username" }),
                h("button", { onClick: () => setD((x) => ({ ...x, winners: x.winners.filter((_, y) => y !== i) })),
                  style: { color: T.muted, background: "none", border: "none", cursor: "pointer" } }, h(X, { size: 15 }))),
              h("div", { className: "flex gap-2 mt-2 pl-10 flex-wrap" },
                h("input", { style: { ...input, fontFamily: MONO, fontSize: 12, minWidth: 150, flex: 2 },
                  value: w.uid || "", inputMode: "numeric",
                  onChange: (e) => setW(i, "uid", e.target.value.replace(/[^0-9]/g, "")),
                  placeholder: "User ID (optional)" }),
                h("input", { style: { ...input, minWidth: 84, flex: 1 }, value: w.points || "",
                  onChange: (e) => setW(i, "points", e.target.value), placeholder: "Points" }),
                h("input", { style: { ...input, minWidth: 110, flex: 1.4 }, value: w.prize || "",
                  onChange: (e) => setW(i, "prize", e.target.value), placeholder: "Reward" }))))),
          h("button", { className: "mt-2 inline-flex items-center gap-1.5 text-xs",
            style: { color: T.gold, background: "none", border: "none", cursor: "pointer" },
            onClick: () => setD((x) => ({ ...x, winners: [...(x.winners || []), blankWinner((x.winners || []).length + 1)] })) },
            h(Plus, { size: 12 }), " Add a place"),
          h("div", { className: "mt-2 text-xs", style: { color: T.muted } },
            "Right-click a member in Discord \u2192 Copy User ID. With an ID the graphic can show it and the Discord post pings them.")),

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

      h("div", { className: "mt-6 flex gap-2 flex-wrap" },
        h(Btn, { tone: "solid", full: true, disabled: blocked, onClick: () => { if (!blocked) save(); } },
          blocked ? h("span", { className: "inline-flex items-center gap-1.5" },
            h(AlertCircle, { size: 13 }), "Blocked by a break") : "Save event"),
        p.canSaveTemplate && (d.title || "").trim()
          ? h(Btn, { onClick: () => setSavingTpl(true), title: "Save this shape as a template" },
              h(Sparkles, { size: 13 }))
          : null,
        h(Btn, { onClick: p.onClose }, "Cancel")),

      h(ChartCalc, { open: calc, ev: d,
        onClose: () => setCalc(false),
        onCopy: p.onCopy,
        onApply: (winners, scheme) => {
          setD((x) => ({ ...x, winners, chartScheme: scheme, resultMode: "places" }));
          setCalc(false);
        } }),

      h(SaveTemplate, { open: savingTpl, ev: d,
        onClose: () => setSavingTpl(false),
        onSave: (name) => { p.onSaveTemplate && p.onSaveTemplate({
            ...d,
            title: (d.title || "").trim(),
            hosts: (d.hosts || []).filter(Boolean),
            durationMin: durMin(d),
          }, name); setSavingTpl(false); } })));
}
