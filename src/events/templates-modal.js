import { h, useState } from "../react.js";
import { DISPLAY, MONO } from "../theme.js";
import { useT, useInput, Btn, Label, Field } from "../ui/atoms.js";
import { Modal } from "../ui/modal.js";
import { X, Trash, Sparkles, Plus } from "../icons.js";
import { tplList, tplLine, tplColor, MAX_TEMPLATES } from "../lib/templates.js";

/* Shown when you tap Add — pick a template or start from scratch. */
export function TemplatePicker(p) {
  const T = useT();
  if (!p.open) return null;
  const list = tplList(p.access);

  const row = (t) => h("div", { key: t.id, className: "flex items-stretch gap-2" },
    h("button", {
      onClick: () => p.onPick(t),
      className: "flex-1 text-left px-3 py-2.5 rounded-xl transition",
      style: { background: T.field, border: "1px solid " + T.hair, cursor: "pointer", color: T.body },
    },
      h("div", { className: "flex items-center gap-2" },
        h("span", { style: { width: 8, height: 8, borderRadius: 2, flexShrink: 0,
          transform: "rotate(45deg)", background: tplColor(t), display: "inline-block" } }),
        h("span", { style: { fontFamily: DISPLAY, fontSize: 15 } }, t.name)),
      h("div", { className: "mt-1", style: { fontFamily: MONO, fontSize: 9.5, color: T.muted } },
        tplLine(t))),
    p.onDelete
      ? h("button", {
          onClick: () => p.onDelete(t),
          title: "Delete template",
          style: { width: 38, borderRadius: 11, flexShrink: 0, cursor: "pointer",
            background: "transparent", border: "1px solid " + T.hair, color: T.muted },
        }, h(Trash, { size: 13 }))
      : null);

  return h(Modal, { open: true, onClose: p.onClose },
    h("div", { className: "p-5 sm:p-6" },
      h("div", { className: "flex items-center justify-between mb-1" },
        h("div", { className: "inline-flex items-center gap-2", style: { fontFamily: DISPLAY, fontSize: 21 } },
          h(Sparkles, { size: 16, style: { color: T.gold } }), "Start from"),
        h("button", { onClick: p.onClose,
          style: { color: T.muted, background: "none", border: "none", cursor: "pointer" } },
          h(X, { size: 19 }))),
      h("div", { className: "mb-4", style: { fontFamily: MONO, fontSize: 10, color: T.muted } },
        list.length
          ? list.length + " TEMPLATE" + (list.length === 1 ? "" : "S") + " SAVED"
          : "NO TEMPLATES YET \u00B7 SAVE ONE FROM ANY EVENT"),

      h("div", { className: "space-y-2" },
        h("button", {
          onClick: () => p.onPick(null),
          className: "w-full text-left px-3 py-2.5 rounded-xl",
          style: { background: "transparent", border: "1px dashed " + T.hair, cursor: "pointer", color: T.body },
        },
          h("div", { className: "flex items-center gap-2", style: { fontFamily: DISPLAY, fontSize: 15 } },
            h(Plus, { size: 13, style: { color: T.muted } }), "Blank event")),
        list.map(row)),

      list.length >= MAX_TEMPLATES
        ? h("div", { className: "mt-3 text-xs", style: { color: T.muted } },
            "That's the maximum of " + MAX_TEMPLATES + ". Delete one to save another.")
        : null,

      h("div", { className: "mt-5" }, h(Btn, { full: true, onClick: p.onClose }, "Cancel"))));
}

/* Shown from the event editor — name the template you're about to save. */
export function SaveTemplate(p) {
  const T = useT();
  const input = useInput();
  const [name, setName] = useState("");
  if (!p.open) return null;

  const suggested = (p.ev && p.ev.title) || "";
  const final = (name || suggested).trim();

  return h(Modal, { open: true, onClose: p.onClose },
    h("div", { className: "p-5 sm:p-6" },
      h("div", { style: { fontFamily: DISPLAY, fontSize: 19 } }, "Save as a template"),
      h("p", { className: "mt-2 mb-4 text-sm", style: { color: T.body } },
        "Keeps the name, type, colour, length, channel, hosts and notes. The date, results and winners are left behind."),
      h(Field, { label: "Template name" },
        h("input", { style: input, value: name, maxLength: 40, autoFocus: true,
          placeholder: suggested || "e.g. Friday LLTVC",
          onChange: (e) => setName(e.target.value) })),
      h("div", { className: "mt-5 flex gap-2" },
        h(Btn, { tone: "solid", full: true, disabled: !final,
          onClick: () => final && p.onSave(final) }, "Save template"),
        h(Btn, { onClick: p.onClose }, "Cancel"))));
}
