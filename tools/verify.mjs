/* Pre-flight check. Run before every upload:  node tools/verify.mjs
   Catches the things that cause a white screen, without a browser.
   This file is a dev tool — it is never loaded by the app. */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let fails = 0, checks = 0;
const ok = (m) => { checks++; console.log("  \x1b[32m✓\x1b[0m " + m); };
const bad = (m) => { checks++; fails++; console.log("  \x1b[31m✗ " + m + "\x1b[0m"); };
const is = (cond, m) => (cond ? ok(m) : bad(m));

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d).sort()) {
    const p = path.join(d, f);
    fs.statSync(p).isDirectory() ? walk(p) : f.endsWith(".js") && files.push(p);
  }
})(path.join(ROOT, "src"));
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, "/");

/* ── 1. every relative import points at a real file, with a .js extension ── */
console.log("\n1. import paths");
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
    const spec = m[1];
    if (!spec.endsWith(".js")) { bad(`${rel(f)} imports "${spec}" without a .js extension — the browser will 404`); continue; }
    if (!fs.existsSync(path.join(path.dirname(f), spec))) bad(`${rel(f)} imports "${spec}" which does not exist`);
  }
}
if (!fails) ok(`all relative imports in ${files.length} modules resolve`);

/* ── 2. no JSX, no bundler-only syntax ── */
console.log("\n2. no build-step syntax");
let jsx = 0;
for (const f of files) {
  const src = fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
  if (/<[A-Z][A-Za-z0-9]*[\s/>]/.test(src)) { bad(`${rel(f)} looks like it contains JSX — nothing compiles this`); jsx++; }
  if (/from\s+["'][a-zA-Z@]/.test(src)) { bad(`${rel(f)} imports a bare package name — there is no bundler`); jsx++; }
}
if (!jsx) ok("no JSX, no bare package imports");

/* ── 3. every icon used is actually exported ── */
console.log("\n3. icons");
{
  const iconSrc = fs.readFileSync(path.join(ROOT, "src/icons.js"), "utf8");
  const defined = new Set([...iconSrc.matchAll(/export\s+(?:function|const)\s+([A-Za-z0-9_$]+)/g)].map((m) => m[1]));
  let missing = 0;
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*["'][^"']*icons\.js["']/g))
      for (const n of m[1].split(",")) {
        const nm = n.trim().split(/\s+as\s+/)[0].trim();
        if (nm && !defined.has(nm)) { bad(`${rel(f)} imports icon "${nm}" — icons.js does not export it`); missing++; }
      }
  }
  if (!missing) ok(`all icon imports match icons.js (${defined.size} defined)`);
}

/* ── 4. boot every module against a stubbed browser ── */
console.log("\n4. modules load");
const React = {
  createElement: (t, p, ...c) => ({ t, p, c }),
  Fragment: "Fragment",
  useState: (v) => [typeof v === "function" ? v() : v, () => {}],
  useEffect: () => {}, useMemo: (fn) => fn(), useCallback: (fn) => fn,
  useRef: (v) => ({ current: v }), useContext: () => ({}), createContext: (v) => ({ Provider: "P", _v: v }),
};
const store = new Map();
const el = () => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {}, setAttribute() {},
  addEventListener() {}, removeEventListener() {}, getContext: () => null, remove() {}, click() {} });
globalThis.window = {
  React, ReactDOM: { createRoot: () => ({ render() {} }) },
  addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }),
  localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
  location: { origin: "https://eventstimeline.netlify.app", href: "https://eventstimeline.netlify.app/" },
  navigator: { onLine: true }, crypto: globalThis.crypto, innerWidth: 1400, innerHeight: 900,
};
globalThis.document = { createElement: el, head: el(), body: el(), documentElement: el(),
  getElementById: () => el(), querySelector: () => null, addEventListener() {}, removeEventListener() {},
  fonts: { ready: Promise.resolve() } };
globalThis.localStorage = window.localStorage;
/* node 22 already defines a read-only navigator — only stub what's missing */
try { if (!globalThis.navigator) globalThis.navigator = window.navigator; } catch {}
try { if (globalThis.navigator && !("onLine" in globalThis.navigator))
  Object.defineProperty(globalThis.navigator, "onLine", { value: true, configurable: true }); } catch {}

const mod = {};
for (const f of files) {
  try { mod[rel(f)] = await import(pathToFileURL(f).href); }
  catch (e) { bad(`${rel(f)} threw on load: ${e.message}`); }
}
if (Object.keys(mod).length === files.length) ok(`all ${files.length} modules imported cleanly`);

/* ── 5. the logic that drives what you see ── */
const ev = mod["src/lib/events.js"], tm = mod["src/lib/time.js"],
      ln = mod["src/timeline/lanes.js"], cf = mod["src/config.js"],
      rl = mod["src/auth/roles.js"], db = mod["src/store/db.js"];

if (ev && tm) {
  console.log("\n5. status (green = live, and only live)");
  const at = (h) => new Date(2026, 6, 15, h).getTime();
  const e = { start: new Date(2026, 6, 15, 12).toISOString(), durationMin: 120 };
  is(ev.statusOf(e, at(13)) === "live", "during the event  → live");
  is(ev.statusOf(e, at(11)) === "soon", "an hour before    → soon");
  is(ev.statusOf(e, at(15)) === "past", "after it ends     → past");
  is(ev.statusOf(e, new Date(2026, 6, 1).getTime()) === "upcoming", "two weeks out     → upcoming");
  is(ev.statusOf(e, at(12)) === "live" && ev.statusOf(e, at(14)) === "live", "both boundaries count as live");
}

if (ln && cf) {
  console.log("\n6. green is reserved");
  const T = { live: "#6BE3B8", soon: "#F2C55C", silver: "#C3CEE3", muted: "#78849F", current: "#FFFFFF" };
  is(ln.statusColors("live", T, "#8B7BFF").stroke === T.live, "live events draw green");
  is(ln.statusColors("past", T, "#8B7BFF").star === T.current, "finished events keep a white star");
  is(ln.statusColors("past", T, "#8B7BFF").dim < 1, "finished events are dulled");
  const green = (hex) => { const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    /* teal (#35D6C0) is fine — only flag colours where green clearly beats blue,
       which is what makes something read as the same green as "live" */
    return g > 150 && g > r * 1.35 && g > b * 1.18; };
  const greens = [...cf.TYPES.map((t) => t.color), ...cf.PALETTE].filter(green);
  is(greens.length === 0, greens.length ? `a non-live colour reads as green: ${greens.join(", ")}` : "no green in TYPES or PALETTE");
}

if (ev && cf) {
  console.log("\n7. legacy events still work");
  for (const [old, want] of Object.entries(cf.LEGACY_TYPE))
    is(ev.resolveType({ type: old }).id === want, `"${old}" still maps to ${want}`);
  is(ev.resolveType({ type: "nonsense" }).id === "other", "an unknown type falls back to Other");
}

if (tm) {
  console.log("\n8. typed times (the 12 AM / 12 PM trap)");
  const iso = new Date(2026, 6, 15, 9, 30).toISOString();
  const rt = (h, m, ap) => { const p = tm.clockParts(tm.withClock(iso, { hour: h, minute: m, ampm: ap })); return `${p.hour}:${String(p.minute).padStart(2, "0")} ${p.ampm}`; };
  is(rt(12, 0, "AM") === "12:00 AM", "12:00 AM survives a round-trip (midnight, not noon)");
  is(rt(12, 0, "PM") === "12:00 PM", "12:00 PM survives a round-trip (noon, not midnight)");
  is(rt(1, 5, "AM") === "1:05 AM", "1:05 AM survives a round-trip");
  is(rt(11, 59, "PM") === "11:59 PM", "11:59 PM survives a round-trip");
  is(new Date(tm.withClock(iso, { hour: 12, minute: 0, ampm: "AM" })).getHours() === 0, "12 AM is hour 0 on the clock");
}

if (ln) {
  console.log("\n9. cards never overlap");
  const many = Array.from({ length: 12 }, (_, i) => ({ id: i, x: i * 8 }));
  const laid = ln.layoutCards(many, (e) => e.x, (e) => e.x + 4, 200);
  const seen = new Map();
  let clash = 0;
  for (const c of laid) { const k = c.side + c.lane; if (seen.has(k) && c.x - seen.get(k) < 200) clash++; seen.set(k, c.x); }
  is(clash === 0, "12 events crammed together still get separate lanes");
  is(laid.length === 12, "no event is silently dropped");
}

if (rl) {
  console.log("\n10. permissions");
  const mk = (role) => rl.computeAuth({ access: { ownerKey: "owner", members: [{ key: "me", name: "Me", role }], pending: [], denied: [] } }, { key: "me", name: "Me" });
  is(mk("viewer").create === false, "viewers cannot create");
  is(mk("editor").create === true && mk("editor").delete === false, "editors create but never delete");
  is(mk("admin").members === true && mk("admin").data === true && mk("admin").roles === false,
     "admins manage people and data but not roles");
  const guest = rl.computeAuth({ access: { ownerKey: "owner", members: [], pending: [], denied: [] } }, { key: "stranger", name: "?" });
  is(guest.create === false && guest.members === false && guest.edit === false,
     "a stranger gets read-only");
}

if (db) {
  console.log("\n11. sync keeps the newer edit");
  const A = { servers: {}, events: { e1: { id: "e1", title: "old", updatedAt: "2026-07-01T00:00:00Z" } }, access: {} };
  const B = { servers: {}, events: { e1: { id: "e1", title: "new", updatedAt: "2026-07-20T00:00:00Z" } }, access: {} };
  is(db.mergeDB(A, B).events.e1.title === "new", "a later edit wins over an earlier one");
  is(db.mergeDB(B, A).events.e1.title === "new", "…whichever order they arrive in");
}

/* ── deploy safety ── */
console.log("\n12. deploy");
{
  /* actually run sw.js and watch which source it reaches for first.
     Checking for the *word* "network-first" would pass even if the logic
     were inverted, so this drives the real handler. */
  const swSrc = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  const ORIGIN = "https://eventstimeline.netlify.app";
  const order = [];
  const handlers = {};
  const self_ = { addEventListener: (k, fn) => (handlers[k] = fn), location: { origin: ORIGIN }, skipWaiting() {}, clients: { claim() {} } };
  const caches_ = { open: async () => ({ put() {}, addAll() {} }), keys: async () => [], delete: async () => {},
    match: async () => { order.push("cache"); return { status: 200, clone: () => ({}) }; } };
  const fetch_ = async () => { order.push("network"); return { status: 200, clone: () => ({}) }; };

  try {
    new Function("self", "caches", "fetch", "location", swSrc)(self_, caches_, fetch_, self_.location);
    const hit = async (url) => { order.length = 0; let p;
      await handlers.fetch({ request: { method: "GET", url }, respondWith: (x) => (p = x) });
      await p; return order[0]; };
    is((await hit(ORIGIN + "/src/app.js")) === "network", "our own files come from the network first (deploys land on reload)");
    is((await hit("https://cdn.tailwindcss.com/x.js")) === "cache", "CDN files still come from cache first");
  } catch (e) { bad("sw.js could not be evaluated: " + e.message); }
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  is(/type="module"\s+src="\.\/src\/app\.js"/.test(html), "index.html mounts src/app.js with no stale ?v= tag");
  is(/etFail/.test(html), "crash reporter is still in index.html");
}

/* ── 13. V29: breaks, templates, chart points ───────────────────── */
{
  const brk = mod["src/lib/breaks.js"];
  const tpl = mod["src/lib/templates.js"];
  const cp  = mod["src/lib/chart-points.js"];
  const rc  = mod["src/lib/recur.js"];

  if (brk && tpl && cp && rc) {
    console.log("\n13. breaks, templates and chart points");

    /* a break must never be counted as an event anywhere */
    const b = { ...brk.blankBreak(), serverId: "s1" };
    const e = { id: "e1", serverId: "s1", title: "LLTVC", start: new Date().toISOString() };
    is([e, b].filter(brk.notBreak).length === 1, "a staff break never counts as an event");
    is(fs.readFileSync(path.join(ROOT, "src/app.js"), "utf8").includes("filter(notBreak)"),
       "app.js strips breaks before Home and Hub see them");

    /* a zero-length break is zero, not a silent 24 hours */
    const z = { start: new Date().toISOString(), durationMin: 0 };
    is(brk.brEnd(z) - brk.brStart(z) === 0, "a 0-minute break is 0 minutes, not a day");

    /* repeats stay inside the documented cap */
    const far = rc.seriesStarts(new Date(2026, 0, 1, 20).toISOString(),
      { rule: "daily", mode: "until", until: new Date(2027, 0, 1).toISOString() });
    is(far.length <= rc.MAX_OCCURRENCES, "'until a date' never exceeds the " + rc.MAX_OCCURRENCES + " cap");

    /* a repeating break fans out into real, separately-identified records */
    const set = brk.expandBreakSeries(brk.blankBreak(), { rule: "weekly", mode: "count", count: 4 });
    is(set.length === 4 && new Set(set.map((x) => x.id)).size === 4,
       "a repeating break makes 4 records with 4 distinct ids");
    is(new Set(set.map((x) => x.series.id)).size === 1, "…all sharing one series id");

    /* templates carry shape, never a date or a result */
    const t = tpl.tplFromEvent({ title: "Friday LLTVC", type: "vc", durationMin: 90,
      hosts: ["Saif"], start: "2026-01-01T00:00:00Z", winners: [{ name: "x" }] }, "Friday LLTVC");
    is(t.start === undefined && t.winners === undefined, "a template carries no date and no winners");
    const applied = tpl.tplApply({ id: "new", start: "2030-05-05T20:00:00Z" }, t);
    is(applied.id === "new" && applied.start === "2030-05-05T20:00:00Z" && applied.title === "Friday LLTVC",
       "applying a template keeps the new id and date");

    /* chart scoring: ties share a place, the next place is skipped */
    const rows = cp.parseChart("1. Saif — 412\n#2 Rayyan 388\nZoya 388\n95 Meera");
    is(rows.length === 4, "the parser reads all four shapes people actually paste");
    is(rows.some((r) => r.name === "Meera" && r.messages === 95), "…including count-before-name");
    const sc = cp.scoreChart(rows, { points: [10, 7, 5, 3], tail: 0, minMessages: 0 });
    is(sc[1].rank === 2 && sc[2].rank === 2, "tied message counts share a place");
    is(sc[3].rank === 4, "…and the place after a tie is skipped");
    is(sc[1].points === sc[2].points, "tied people earn the same points");
    is(cp.pointsForRank({ points: [10], tail: 2 }, 9) === 2, "anyone past the list gets the tail value");
  }
}

/* ── 14. V29: Discord channels and reminders ────────────────────── */
{
  const wh = mod["src/lib/webhooks.js"];
  const rm = mod["src/lib/reminders.js"];

  if (wh && rm) {
    console.log("\n14. Discord channels and reminders");

    /* only real Discord hosts — a lookalike must never be posted to */
    is(wh.validHook("https://discord.com/api/webhooks/123456789012345678/aBc-_1"),
       "a real webhook URL is accepted");
    is(!wh.validHook("https://evil.com/api/webhooks/1/x"), "a lookalike host is refused");
    is(!wh.validHook("http://discord.com/api/webhooks/1/x"), "plain http is refused");
    is(!wh.maskHook("https://discord.com/api/webhooks/123456789012345678/SECRETTOKEN")
        .includes("SECRETTOKEN"), "the UI never shows the secret half of a webhook");

    /* Discord truncates past 2000 chars — we split instead of losing the tail */
    const long = Array.from({ length: 300 }, (_, i) => "winner number " + i).join("\n");
    const parts = wh.chunk(long);
    is(parts.every((x) => x.length <= 1900), "a long post is split under Discord's cap");
    is(parts.join("\n") === long, "splitting loses nothing");

    /* a bad webhook resolves an error — it must never throw into a save */
    const bad = await wh.postToDiscord("nonsense", "hi");
    is(bad && bad.ok === false && !!bad.error, "a broken webhook returns an error instead of throwing");

    /* reminder timing */
    const NOW = new Date(2026, 5, 1, 20, 0, 0).getTime();
    const at = (mins, leads) => ({ id: "e" + mins, title: "E",
      start: new Date(NOW + mins * 60000).toISOString(), remind: { leads, hook: "h1" } });

    is(rm.dueReminders([at(15, [15])], {}, NOW).length === 1, "a 15-minute reminder fires 15 minutes out");
    is(rm.dueReminders([at(40, [15])], {}, NOW).length === 0, "it never fires early");
    is(rm.dueReminders([at(15, [15])], { "e15:15": { at: NOW } }, NOW).length === 0,
       "a reminder already sent never fires twice");
    is(rm.dueReminders([at(-120, [15])], {}, NOW).length === 0,
       "a long-missed reminder is dropped, not spammed after the fact");
    is(rm.dueReminders([at(10, [15])], {}, NOW).length === 1,
       "a slightly late reminder still fires inside the grace window");
    is(rm.dueReminders([at(15, [15, 60, 1440])], {}, NOW).length === 1,
       "only the due lead fires, not the other leads on the same event");
    is(rm.dueReminders([{ id: "x", start: "garbage", remind: { leads: [15] } }], {}, NOW).length === 0,
       "a broken date cannot crash the reminder scan");
    is(rm.dueReminders([{ id: "y", start: new Date(NOW).toISOString() }], {}, NOW).length === 0,
       "an event with no reminders set is left alone");

    /* the ledger must not grow forever */
    const pruned = rm.pruneLedger({ old: { at: NOW - 8 * 86400000 }, fresh: { at: NOW - 3600000 } }, NOW);
    is(!pruned.old && !!pruned.fresh, "the reminder ledger drops anything older than a week");
  }
}

console.log(`\n${fails ? "\x1b[31m" + fails + " of " + checks + " checks FAILED — do not upload\x1b[0m"
  : "\x1b[32mall " + checks + " checks passed — safe to upload\x1b[0m"}\n`);
process.exit(fails ? 1 : 0);
