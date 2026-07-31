import { h, useState } from "../react.js";
import { DISPLAY, BODY, MONO } from "../theme.js";
import { Stars } from "../ui/stars.js";
import { DB_PATH } from "../config.js";

const RULES = '{\n  "rules": {\n    ".read": false,\n    ".write": false,\n    "' + DB_PATH + '": { ".read": true, ".write": true }\n  }\n}';

export function Setup(p) {
  const T = p.T;
  const [copied, setCopied] = useState(false);
  return h("div", { className: "min-h-screen flex items-center justify-center p-6 relative",
    style: { background: T.canvas, color: T.text, fontFamily: BODY } },
    h("div", { className: "absolute inset-0 pointer-events-none" }, h(Stars, { width: 1200, height: 900, T, density: 11 })),
    h("div", { className: "relative w-full max-w-lg rounded-2xl p-6", style: { background: T.sheet, border: "1px solid " + T.hair } },
      h("div", { style: { fontFamily: DISPLAY, fontSize: 26 } }, "One-time setup"),
      h("p", { className: "mt-2 mb-4 text-sm", style: { color: T.body } },
        "This app needs a free Firebase database to sync between staff. Five minutes, once."),
      h("ol", { className: "space-y-2.5 list-decimal pl-5", style: { fontSize: 14, color: T.body, lineHeight: 1.65 } },
        h("li", null, "console.firebase.google.com \u2192 Create project (analytics off is fine)."),
        h("li", null, "Build \u2192 Realtime Database \u2192 Create database \u2192 locked mode."),
        h("li", null, "Rules tab \u2192 paste the snippet below \u2192 Publish."),
        h("li", null, "Data tab \u2192 copy the URL at the top."),
        h("li", null, "Open src/config.js, paste it into databaseURL, re-upload that one file.")),
      h("div", { className: "mt-4" },
        h("div", { className: "mb-1.5 uppercase", style: { fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.18em", color: T.muted } }, "Rules snippet"),
        h("pre", { className: "p-3 rounded-lg text-xs overflow-x-auto",
          style: { background: T.panel, border: "1px solid " + T.hair, color: T.body } }, RULES),
        h("button", { onClick: () => { try { navigator.clipboard.writeText(RULES); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (e) {} },
          className: "mt-2 px-3 py-2 rounded-lg text-sm w-full",
          style: { background: T.solidBtn, color: T.solidInk, border: "none", fontFamily: BODY, cursor: "pointer" } },
          copied ? "Copied" : "Copy rules"))));
}
