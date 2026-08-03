import { h } from "../react.js";
import { DISPLAY } from "../theme.js";
import { useT, useInput, Btn, Label, Toggle } from "./atoms.js";
import { Modal } from "./modal.js";
import { Download } from "../icons.js";

/* Used by both the timeline and the calendar so the two exports behave alike. */
export function ExportDialog(p) {
  const T = useT();
  const input = useInput();
  const o = p.opts;
  return h(Modal, { open: p.open, onClose: p.onClose },
    h("div", { className: "p-6" },
      h("div", { style: { fontFamily: DISPLAY, fontSize: 20 } }, "Export " + p.title),
      h("p", { className: "mt-1.5 mb-4 text-sm", style: { color: T.body } },
        "Saved as a PNG you can drop straight into Discord."),

      h("div", { className: "space-y-3" },
        h(Toggle, { on: o.showList, label: p.listLabel || "List the event names down the side",
          onChange: (v) => p.setOpts({ ...o, showList: v }) }),
        h(Toggle, { on: o.showPast, label: "Include events that already finished",
          onChange: (v) => p.setOpts({ ...o, showPast: v }) })),

      h("div", { className: "mt-4" },
        h(Label, null, "Caption (optional)"),
        h("input", { style: input, value: o.caption, maxLength: 60,
          onChange: (e) => p.setOpts({ ...o, caption: e.target.value }),
          placeholder: "e.g. August line-up \u2014 come hang out" })),

      h("div", { className: "mt-4 p-3 rounded-lg text-xs",
        style: { background: T.panel, border: "1px solid " + T.hair, color: T.muted } },
        (o.showList ? "Grid plus a list of every event. " : "Just the layout. ") +
        (o.showPast ? "Finished events appear greyed out." : "Only upcoming events are shown.")),

      h("div", { className: "mt-5 flex gap-2" },
        h(Btn, { tone: "solid", full: true, onClick: p.onGo }, h(Download, { size: 13 }), " Save the image"),
        h(Btn, { onClick: p.onClose }, "Cancel"))));
}
