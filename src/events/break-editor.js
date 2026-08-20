import { h, useState, useEffect } from "../react.js";
import { DISPLAY, MONO } from "../theme.js";
import { useT, useInput, Btn, Label, Field, Chip } from "../ui/atoms.js";
import { Modal } from "../ui/modal.js";
import { X, Hourglass, Trash } from "../icons.js";
import { TYPES } from "../config.js";
import { MIN, DAY, startOfDay, fmtD } from "../lib/time.js";
import { brStart, brEnd, brWho } from "../lib/breaks.js";
import { RULES, blankRepeat, repeatSummary, seriesStarts } from "../lib/recur.js";

/* Breaks run in whole days — nobody schedules a break for 90 minutes. */
export function BreakEditor(p) {
  const T = useT();
  const input = useInput();
  const [d, setD] = useState(null);

  useEffect(() => {
    if (!p.brk) { setD(null); return; }
    setD({
      ...p.brk,
      first: startOfDay(brStart(p.brk)),
      last: startOfDay(brEnd(p.brk) - MIN),
      scope: p.brk.scope || "all",
      types: p.brk.types || [],
      repeat: p.brk.repeat && p.brk.repeat.rule ? p.brk.repeat : blankRepeat(),
      scopeEdit: "one",
    });
  }, [p.brk]);

  if (!d) return null;

  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));
  const setR = (k, v) => setD((x) => ({ ...x, repeat: { ...x.repeat, [k]: v } }));
  const inSeries = !!(p.brk && p.brk.series && p.brk.series.id);
  const days = Math.max(1, Math.round((d.last - d.first) / DAY) + 1);

  const shiftFirst = (n) => setD((x) => {
    const first = x.first + n * DAY;
    return { ...x, first, last: Math.max(first, x.last) };
  });
  const shiftLast = (n) => setD((x) => ({ ...x, last: Math.max(x.first, x.last + n * DAY) }));

  const toggleType = (id) => setD((x) => ({
    ...x,
    types: (x.types || []).includes(id) ? x.types.filter((t) => t !== id) : [...(x.types || []), id],
  }));

  const save = () => {
    const s = new Date(d.first); s.setHours(0, 0, 0, 0);
    p.onSave({
      id: d.id, kind: "break",
      title: (d.title || "").trim() || "Staff break",
      start: s.toISOString(),
      durationMin: days * 1440,
      scope: d.scope,
      types: d.scope === "types" ? (d.types || []) : [],
      reason: (d.reason || "").trim(),
      repeat: d.repeat && d.repeat.rule !== "none" ? d.repeat : null,
      series: d.series || null,
      _scope: inSeries ? (d.scopeEdit || "one") : "one",
    });
  };

  const dayRow = (label, value, shift) => h("div", null,
    h(Label, null, label),
    h("div", { className: "flex items-center gap-1.5" },
      h("button", { onClick: () => shift(-1), style: stepBtn(T) }, "\u2039"),
      h("div", { className: "flex-1 text-center py-2 rounded-lg",
        style: { background: T.field, border: "1px solid " + T.hair, fontFamily: DISPLAY, fontSize: 15 } },
        fmtD(value)),
      h("button", { onClick: () => shift(1), style: stepBtn(T) }, "\u203A")));

  return h(Modal, { open: !!d, onClose: p.onClose },
    h("div", { className: "p-5 sm:p-6" },
      h("div", { className: "flex items-center justify-between mb-1" },
        h("div", { className: "inline-flex items-center gap-2", style: { fontFamily: DISPLAY, fontSize: 21 } },
          h(Hourglass, { size: 16, style: { color: T.gold } }),
          p.brk && p.brk.createdAt ? "Edit break" : "New staff break"),
        h("button", { onClick: p.onClose, style: { color: T.muted, background: "none", border: "none", cursor: "pointer" } },
          h(X, { size: 19 }))),
      h("div", { className: "mb-4", style: { fontFamily: MONO, fontSize: 10, color: T.muted } },
        days + " DAY" + (days === 1 ? "" : "S") + " \u00B7 " + brWho({ scope: d.scope, types: d.types }).toUpperCase()),

      h("div", { className: "space-y-4" },
        h(Field, { label: "What to call it" },
          h("input", { style: input, value: d.title, maxLength: 40,
            onChange: (e) => set("title", e.target.value),
            placeholder: "e.g. Staff break \u2014 exam week" })),

        h("div", { className: "grid grid-cols-2 gap-3" },
          dayRow("First day", d.first, shiftFirst),
          dayRow("Last day", d.last, shiftLast)),

        h("div", { className: "flex gap-1.5 flex-wrap" },
          [[3, "3 DAYS"], [7, "1 WEEK"], [14, "2 WEEKS"], [30, "1 MONTH"]].map(([n, l]) =>
            h(Chip, { key: l, on: days === n, onClick: () => setD((x) => ({ ...x, last: x.first + (n - 1) * DAY })) }, l))),

        h("div", null,
          h(Label, null, "What it blocks"),
          h("div", { className: "flex gap-1.5 flex-wrap mb-2" },
            h(Chip, { on: d.scope === "all", onClick: () => set("scope", "all") }, "EVERYTHING"),
            h(Chip, { on: d.scope === "types", onClick: () => set("scope", "types") }, "CERTAIN TYPES")),
          d.scope === "types"
            ? h("div", { className: "flex gap-1.5 flex-wrap" }, TYPES.map((t) =>
                h(Chip, { key: t.id, on: (d.types || []).includes(t.id), color: t.color, onClick: () => toggleType(t.id) },
                  h("span", { style: { width: 7, height: 7, borderRadius: 2, transform: "rotate(45deg)",
                    background: t.color, display: "inline-block" } }),
                  t.short)))
            : h("div", { className: "text-xs", style: { color: T.muted } },
                "Nothing at all can be scheduled inside this range.")),

        /* ── repeats ── */
        inSeries ? null : h("div", { className: "pt-1", style: { borderTop: "1px solid " + T.hair } },
          h("div", { className: "pt-3" },
            h(Label, null, "Repeats"),
            h("div", { className: "flex gap-1.5 flex-wrap" }, RULES.map((r) =>
              h(Chip, { key: r.id, on: (d.repeat && d.repeat.rule || "none") === r.id,
                onClick: () => setR("rule", r.id) }, r.label))),
            d.repeat && d.repeat.rule !== "none" ? h("div", { className: "mt-3 space-y-2.5" },
              h("div", { className: "flex gap-1.5 flex-wrap" },
                h(Chip, { on: d.repeat.mode !== "until", onClick: () => setR("mode", "count") }, "A SET NUMBER OF TIMES"),
                h(Chip, { on: d.repeat.mode === "until", onClick: () => setR("mode", "until") }, "UNTIL A DATE")),
              d.repeat.mode === "until"
                ? h("div", { className: "flex items-center gap-1.5" },
                    h("button", { onClick: () => setR("until", (d.repeat.until || d.last) - 7 * DAY), style: stepBtn(T) }, "\u2039"),
                    h("div", { className: "flex-1 text-center py-2 rounded-lg",
                      style: { background: T.field, border: "1px solid " + T.hair, fontFamily: DISPLAY, fontSize: 15 } },
                      fmtD(d.repeat.until || d.last)),
                    h("button", { onClick: () => setR("until", (d.repeat.until || d.last) + 7 * DAY), style: stepBtn(T) }, "\u203A"))
                : h("div", { className: "flex gap-1.5 flex-wrap" }, [2, 4, 6, 8, 12].map((n) =>
                    h(Chip, { key: n, on: Number(d.repeat.count) === n, onClick: () => setR("count", n) }, n + "\u00D7"))),
              h("div", { className: "px-3 py-2 rounded-lg", style: { background: T.field, border: "1px solid " + T.hair } },
                h("div", { style: { fontFamily: MONO, fontSize: 10, color: T.muted } }, "THIS CREATES"),
                h("div", { className: "text-sm" },
                  seriesStarts(new Date(d.first).toISOString(), d.repeat).length + " breaks \u00B7 " +
                  repeatSummary(d.repeat).replace(/^Repeats /, "").replace(/\.$/, "")))) : null)),

        /* ── editing one of a repeating set ── */
        inSeries ? h("div", { className: "pt-3", style: { borderTop: "1px solid " + T.hair } },
          h(Label, null, "This is one of a repeating set"),
          h("div", { className: "flex gap-1.5 flex-wrap" },
            h(Chip, { on: (d.scopeEdit || "one") === "one", onClick: () => set("scopeEdit", "one") }, "THIS ONE ONLY"),
            h(Chip, { on: d.scopeEdit === "later", onClick: () => set("scopeEdit", "later") }, "THIS AND LATER"),
            h(Chip, { on: d.scopeEdit === "all", onClick: () => set("scopeEdit", "all") }, "THE WHOLE SET"))) : null,

        h(Field, { label: "Reason", hint: "Shown to anyone who tries to schedule into it" },
          h("input", { style: input, value: d.reason, maxLength: 90,
            onChange: (e) => set("reason", e.target.value),
            placeholder: "e.g. team is off for finals" }))),

      h("div", { className: "mt-6 flex gap-2" },
        h(Btn, { tone: "solid", full: true, onClick: save }, "Save break"),
        p.onDelete && p.brk && p.brk.createdAt
          ? h(Btn, { tone: "danger", onClick: () => p.onDelete(p.brk, inSeries && d.scopeEdit === "all") },
              h(Trash, { size: 13 }),
              inSeries && d.scopeEdit === "all" ? " SET" : "")
          : null,
        h(Btn, { onClick: p.onClose }, "Cancel"))));
}

const stepBtn = (T) => ({
  width: 30, height: 34, borderRadius: 9, flexShrink: 0,
  background: "transparent", border: "1px solid " + T.hair, color: T.body,
  cursor: "pointer", fontFamily: DISPLAY, fontSize: 17, lineHeight: 1,
});
