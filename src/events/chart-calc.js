import { h, useState, useEffect, useMemo } from "../react.js";
import { DISPLAY, MONO } from "../theme.js";
import { useT, useInput, Btn, Label, Field, Chip } from "../ui/atoms.js";
import { Modal } from "../ui/modal.js";
import { X, Trophy, Plus, Trash, Copy } from "../icons.js";
import {
  schemeOf, blankScheme, parseChart, scoreChart, toWinners, schemeSummary, ordinal,
} from "../lib/chart-points.js";

/* Set the points, paste the chart, get placings. */
export function ChartCalc(p) {
  const T = useT();
  const input = useInput();
  const [scheme, setScheme] = useState(blankScheme());
  const [text, setText] = useState("");

  useEffect(() => {
    if (!p.open) return;
    setScheme(schemeOf(p.ev));
    setText("");
  }, [p.open, p.ev]);

  const scored = useMemo(() => scoreChart(parseChart(text), scheme), [text, scheme]);
  const kept = scored.filter((r) => r.points > 0);

  if (!p.open) return null;

  const setPt = (i, v) => setScheme((s) => {
    const points = [...s.points];
    points[i] = v === "" ? "" : Number(v);
    return { ...s, points };
  });
  const addPlace = () => setScheme((s) => ({ ...s, points: [...s.points, 1] }));
  const dropPlace = () => setScheme((s) => ({ ...s, points: s.points.slice(0, -1) }));

  const clean = () => ({
    ...scheme,
    points: scheme.points.map((n) => Number(n) || 0),
  });

  const asText = () => kept
    .map((r) => ordinal(r.rank) + " \u2014 " + r.name + " \u00B7 " + r.messages + " msgs \u00B7 " + r.points + " pts")
    .join("\n");

  return h(Modal, { open: true, onClose: p.onClose, wide: true },
    h("div", { className: "p-5 sm:p-6" },
      h("div", { className: "flex items-center justify-between mb-1" },
        h("div", { className: "inline-flex items-center gap-2", style: { fontFamily: DISPLAY, fontSize: 21 } },
          h(Trophy, { size: 16, style: { color: T.gold } }), "Chat chart points"),
        h("button", { onClick: p.onClose,
          style: { color: T.muted, background: "none", border: "none", cursor: "pointer" } },
          h(X, { size: 19 }))),
      h("div", { className: "mb-4", style: { fontFamily: MONO, fontSize: 10, color: T.muted } },
        schemeSummary(clean()).toUpperCase()),

      h("div", { className: "space-y-4" },
        /* ── the points you set ── */
        h("div", null,
          h(Label, null, "Points per place"),
          h("div", { className: "flex gap-2 flex-wrap items-end" },
            scheme.points.map((v, i) => h("div", { key: i, style: { width: 62 } },
              h("div", { style: { fontFamily: MONO, fontSize: 9, color: T.muted, marginBottom: 3 } },
                ordinal(i + 1).toUpperCase()),
              h("input", {
                type: "number", value: v, min: 0,
                onChange: (e) => setPt(i, e.target.value),
                style: { ...input, textAlign: "center", padding: "7px 4px" },
              }))),
            h("div", { className: "flex gap-1.5 pb-0.5" },
              h("button", { onClick: addPlace, style: miniBtn(T), title: "Add a place" }, h(Plus, { size: 13 })),
              scheme.points.length > 1
                ? h("button", { onClick: dropPlace, style: miniBtn(T), title: "Remove the last place" }, h(Trash, { size: 12 }))
                : null))),

        h("div", { className: "grid grid-cols-2 gap-3" },
          h(Field, { label: "Everyone else gets", hint: "Anyone charting past the list above" },
            h("input", { type: "number", min: 0, style: input, value: scheme.tail,
              onChange: (e) => setScheme((s) => ({ ...s, tail: e.target.value })) })),
          h(Field, { label: "Minimum messages", hint: "Below this, no points at all" },
            h("input", { type: "number", min: 0, style: input, value: scheme.minMessages,
              onChange: (e) => setScheme((s) => ({ ...s, minMessages: e.target.value })) }))),

        h("div", { className: "flex gap-1.5 flex-wrap" },
          [["Standard", [10, 7, 5, 3, 2]], ["Top 3", [10, 6, 3]], ["Flat 5", [5, 5, 5, 5, 5]], ["Big top", [25, 15, 10, 5, 3]]]
            .map(([name, pts]) => h(Chip, {
              key: name,
              on: scheme.points.join() === pts.join(),
              onClick: () => setScheme((s) => ({ ...s, points: [...pts] })),
            }, name.toUpperCase()))),

        /* ── the chart itself ── */
        h(Field, {
          label: "Paste the chart",
          hint: "One person per line \u2014 name and message count, any order. Ranking numbers are ignored.",
        },
          h("textarea", {
            rows: 7, style: { ...input, resize: "vertical", fontFamily: MONO, fontSize: 12.5 },
            value: text, onChange: (e) => setText(e.target.value),
            placeholder: "1. Saif \u2014 412\n2. Rayyan: 388\nZoya 388\nKabir 210",
          })),

        /* ── results ── */
        scored.length
          ? h("div", { className: "rounded-xl overflow-hidden", style: { border: "1px solid " + T.hair } },
              h("div", { className: "px-3 py-2 flex items-center justify-between",
                style: { background: T.field, fontFamily: MONO, fontSize: 9.5, color: T.muted, letterSpacing: "0.14em" } },
                h("span", null, scored.length + " CHARTED \u00B7 " + kept.length + " SCORING"),
                h("span", null, "POINTS")),
              h("div", { style: { maxHeight: 240, overflowY: "auto" } },
                scored.map((r, i) => h("div", {
                  key: i, className: "px-3 py-2 flex items-center gap-2.5",
                  style: { borderTop: "1px solid " + T.hair, opacity: r.eligible ? 1 : 0.45 },
                },
                  h("span", { style: { fontFamily: MONO, fontSize: 10, color: T.muted, width: 30, flexShrink: 0 } },
                    ordinal(r.rank).toUpperCase()),
                  h("span", { className: "flex-1 truncate", style: { fontSize: 14 } }, r.name),
                  h("span", { style: { fontFamily: MONO, fontSize: 10, color: T.muted } }, r.messages),
                  h("span", {
                    style: {
                      fontFamily: DISPLAY, fontSize: 14, minWidth: 34, textAlign: "right",
                      color: r.points > 0 ? T.gold : T.muted,
                    },
                  }, r.points)))))
          : h("div", { className: "text-sm px-3 py-4 rounded-xl text-center",
              style: { color: T.muted, border: "1px dashed " + T.hair } },
              "Paste a chart above and the placings work themselves out."),

        kept.some((r) => r.rank > 1 && scored.some((o) => o.rank === r.rank && o !== r))
          ? h("div", { className: "text-xs", style: { color: T.muted } },
              "Tied message counts share a place and both earn its points.")
          : null),

      h("div", { className: "mt-6 flex gap-2 flex-wrap" },
        h(Btn, {
          tone: "solid", full: true, disabled: !kept.length,
          onClick: () => kept.length && p.onApply(toWinners(scored), clean()),
        }, kept.length ? "Put " + kept.length + " on the results" : "Nothing to apply"),
        kept.length
          ? h(Btn, { onClick: () => p.onCopy && p.onCopy(asText()) }, h(Copy, { size: 13 }))
          : null,
        h(Btn, { onClick: p.onClose }, "Cancel"))));
}

const miniBtn = (T) => ({
  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
  background: "transparent", border: "1px solid " + T.hair, color: T.muted,
  cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
});
