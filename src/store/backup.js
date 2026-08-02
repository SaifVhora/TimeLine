/* Safety net: rolling local snapshots, file export/import, and the trash.
   Nothing here talks to Firebase — app.js applies whatever these return. */
import { normalize } from "./db.js";

const KEY = "et_backups";
const MAX = 12;                 /* keep the last dozen snapshots */
const MIN_GAP = 20 * 60 * 1000; /* don't snapshot more often than every 20 min */

const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } };
const write = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; } };

export function countsOf(db) {
  const d = normalize(db);
  return {
    servers: Object.values(d.servers).filter((s) => !s.deleted).length,
    events: Object.values(d.events).filter((e) => !e.deleted).length,
    people: (d.access.members || []).length + (d.access.ownerKey ? 1 : 0),
  };
}

export function listBackups() {
  return read().sort((a, b) => b.at - a.at);
}

/* called after every successful sync — cheap, and skips if nothing meaningful changed */
export function maybeSnapshot(db, opts) {
  const force = opts && opts.force;
  const d = normalize(db);
  if (!d.access.ownerKey) return null;            /* nothing worth keeping yet */
  const list = read();
  const last = list.sort((a, b) => b.at - a.at)[0];
  const counts = countsOf(d);
  const json = JSON.stringify(d);

  if (!force && last) {
    const sameSize = last.size === json.length;
    const tooSoon = Date.now() - last.at < MIN_GAP;
    if (sameSize && tooSoon) return null;
    if (tooSoon && !sameSize && last.counts.events === counts.events && last.counts.servers === counts.servers) return null;
  }

  /* random suffix: two snapshots in the same millisecond must not share an id */
  const id = "b" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  const entry = { id, at: Date.now(), counts, size: json.length, json, manual: !!force };
  let next = [entry, ...list].slice(0, MAX);
  /* localStorage is small — if we're over quota, drop the oldest until it fits */
  while (next.length && !write(next)) next = next.slice(0, next.length - 1);
  return entry;
}

export function backupById(id) {
  const hit = read().find((b) => b.id === id);
  if (!hit) return null;
  try { return normalize(JSON.parse(hit.json)); } catch (e) { return null; }
}

export function deleteBackup(id) { write(read().filter((b) => b.id !== id)); }

/* ── file export / import ── */

export function downloadBackup(db, label) {
  const d = normalize(db);
  const payload = { format: "events-timeline-backup", version: 1, savedAt: new Date().toISOString(), counts: countsOf(d), data: d };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const a = document.createElement("a");
  a.href = url;
  a.download = "events-timeline-" + (label || "backup").toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + stamp + ".json";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/* accepts either our wrapper or a bare database object */
export function parseBackup(text) {
  let obj;
  try { obj = JSON.parse(text); } catch (e) { throw new Error("That file isn't valid JSON"); }
  const body = obj && obj.data ? obj.data : obj;
  if (!body || typeof body !== "object") throw new Error("That file doesn't look like a backup");
  const hasShape = ("events" in body) || ("servers" in body) || ("access" in body);
  if (!hasShape) throw new Error("That file doesn't contain timeline data");
  const d = normalize(body);
  if (!d.access.ownerKey) throw new Error("That backup has no owner recorded — it may be from an empty timeline");
  return d;
}

export function readFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("Couldn't read that file"));
    r.readAsText(file);
  });
}

/* ── the trash ── */

export function trashOf(db) {
  const d = normalize(db);
  const events = Object.values(d.events).filter((e) => e.deleted)
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  const servers = Object.values(d.servers).filter((s) => s.deleted)
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  return { events, servers, total: events.length + servers.length };
}

/* how a restore merges: bring the backup in, but never resurrect things
   deleted *after* the backup was taken unless the whole thing is replaced */
export function summariseRestore(current, incoming) {
  const cur = countsOf(current), inc = countsOf(incoming);
  return {
    events: { from: cur.events, to: inc.events, delta: inc.events - cur.events },
    servers: { from: cur.servers, to: inc.servers, delta: inc.servers - cur.servers },
    people: { from: cur.people, to: inc.people, delta: inc.people - cur.people },
  };
}
