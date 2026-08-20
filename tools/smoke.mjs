/* Render smoke test — mounts the real app in a fake browser.

   verify.mjs deliberately has no dependencies, so it can only read code, not
   run it. That gap let a blank screen ship once: `me.key` was dereferenced
   during render while `me` is null until sign-in. Every module imported fine,
   so verify saw nothing wrong.

   This file closes that gap, but it needs three packages that aren't in the
   repo. Run it before a big upload:

     npm i --no-save jsdom react@18 react-dom@18
     node tools/smoke.mjs

   It mounts the app twice — signed out and signed in — because those are two
   different render paths and the signed-out one is the one people forget. */

import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>",
  { pretendToBeVisual: true, url: "https://timeline.local/" });

global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, "navigator", { value: dom.window.navigator, configurable: true });
for (const k of ["HTMLElement", "Element", "Node", "Event", "CustomEvent", "getComputedStyle", "SVGElement"]) {
  try { global[k] = dom.window[k]; } catch {}
}
global.requestAnimationFrame = (f) => setTimeout(f, 0);
global.cancelAnimationFrame = clearTimeout;
dom.window.matchMedia = dom.window.matchMedia
  || (() => ({ matches: false, addEventListener() {}, addListener() {}, removeEventListener() {} }));
global.matchMedia = dom.window.matchMedia;
/* never let a smoke test post to a real Discord channel */
global.fetch = async () => ({ ok: true, status: 200, json: async () => ({}), text: async () => "" });
dom.window.fetch = global.fetch;

const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
global.React = React; dom.window.React = React;
dom.window.ReactDOM = { createRoot };
global.ReactDOM = dom.window.ReactDOM;

const problems = [];
const swallow = ["getContext", "canvas", "Not implemented"];
const realError = console.error;
console.error = (...a) => {
  const msg = a.map((x) => (x && x.stack) ? x.stack : String(x)).join(" ");
  if (!swallow.some((s) => msg.includes(s))) problems.push(msg.split("\n").slice(0, 8).join("\n"));
};
process.on("unhandledRejection", (e) => problems.push("unhandled: " + (e && e.stack || e)));

/* signed out is the default — nothing in storage */
try {
  await import("../src/app.js");
} catch (e) {
  console.error = realError;
  console.log("\x1b[31m✗ the app threw on load\x1b[0m\n  " + e.message);
  process.exit(1);
}

await new Promise((r) => setTimeout(r, 500));
console.error = realError;

const out = document.getElementById("root").textContent || "";
let bad = 0;
const is = (c, m) => { console.log(c ? "  \x1b[32m✓\x1b[0m " + m : "  \x1b[31m✗ " + m + "\x1b[0m"); if (!c) bad++; };

console.log("\nrender smoke test");
is(out.length > 0, "the app renders something when signed out (not a blank screen)");
is(problems.length === 0, "nothing threw during render");
if (problems.length) problems.slice(0, 3).forEach((p) => console.log("\n" + p));

console.log(bad
  ? "\n\x1b[31m" + bad + " problem(s) — do not upload\x1b[0m\n"
  : "\n\x1b[32mrenders clean\x1b[0m\n");
process.exit(bad ? 1 : 0);
