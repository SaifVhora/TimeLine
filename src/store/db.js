/* Firebase REST + local cache + conflict merge. Nothing else talks to the network. */
import { CONFIG, DB_PATH } from "../config.js";
import { newer } from "../lib/time.js";

export const EMPTY = {
  servers: {}, events: {},
  access: { ownerKey: "", ownerName: "", ownerAvatar: null, ownerPassHash: "",
            members: [], pending: [], denied: [], templates: [], webhooks: [], reminded: {},
            link: "", updatedAt: null },
};

export const configured = /^https:\/\/.+/.test(CONFIG.databaseURL) && !CONFIG.databaseURL.includes("PASTE_YOUR");
const dbUrl = () => CONFIG.databaseURL.replace(/\/+$/, "") + "/" + DB_PATH + ".json";

export function normalize(db) {
  if (!db) return JSON.parse(JSON.stringify(EMPTY));
  return {
    servers: db.servers || {},
    events: db.events || {},
    access: {
      ...EMPTY.access, ...(db.access || {}),
      members: db.access?.members || [],
      pending: db.access?.pending || [],
      denied: db.access?.denied || [],
      templates: db.access?.templates || [],
      webhooks: db.access?.webhooks || [],
      reminded: db.access?.reminded || {},
    },
  };
}

export function mergeDB(a, b) {
  a = normalize(a); b = normalize(b);
  const pick = (x, y) => {
    const out = { ...x };
    Object.values(y).forEach((r) => { const c = out[r.id]; if (!c || newer(r.updatedAt, c.updatedAt)) out[r.id] = r; });
    return out;
  };
  const winner = newer(b.access.updatedAt, a.access.updatedAt) ? b.access : a.access;
  const seen = new Set();
  const pending = [...a.access.pending, ...b.access.pending].filter((p) => {
    if (seen.has(p.key)) return false;
    seen.add(p.key);
    const decided = (winner.members || []).some((m) => m.key === p.key) || (winner.denied || []).includes(p.key);
    return !decided;
  });
  return { servers: pick(a.servers, b.servers), events: pick(a.events, b.events), access: { ...winner, pending } };
}

export async function readRemote() {
  const r = await fetch(dbUrl(), { cache: "no-store" });
  if (!r.ok) throw new Error("remote " + r.status);
  return normalize(await r.json());
}
export async function writeRemote(db) {
  const r = await fetch(dbUrl(), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(db) });
  if (!r.ok) throw new Error("remote " + r.status);
}

/* ── per-record writes ──
   Compares two snapshots and sends ONLY the records that changed, as one
   multi-path PATCH. Two people editing different events can no longer wipe
   each other, and a save costs bytes proportional to the change — not the
   whole database. */
export function buildPatch(prev, next) {
  prev = normalize(prev); next = normalize(next);
  const patch = {};
  for (const sect of ["servers", "events"]) {
    for (const id of Object.keys(next[sect])) {
      const a = prev[sect][id], b = next[sect][id];
      if (!a || JSON.stringify(a) !== JSON.stringify(b)) patch[sect + "/" + id] = b;
    }
  }
  if (JSON.stringify(prev.access) !== JSON.stringify(next.access)) patch["access"] = next.access;
  return patch;
}

export async function patchRemote(patch) {
  if (!Object.keys(patch).length) return;
  const r = await fetch(dbUrl(), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
  if (!r.ok) throw new Error("remote " + r.status);
}

/* ── realtime stream ──
   Firebase RTDB speaks Server-Sent Events on the same free REST endpoint.
   Instead of re-downloading everything every 12 seconds, the server pushes
   each change the instant it lands — the line is genuinely live.
   onData(remoteDb) fires with a fresh remote mirror; onState("open"|"down"). */
export function openStream(onData, onState) {
  if (typeof EventSource === "undefined") return null;
  let mirror = null, es = null, closed = false, retry = null;

  const setAtPath = (path, data) => {
    const parts = path.split("/").filter(Boolean);
    if (!parts.length) { mirror = normalize(data); return; }
    if (!mirror) mirror = normalize(null);
    let node = mirror;
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof node[parts[i]] !== "object" || node[parts[i]] === null) node[parts[i]] = {};
      node = node[parts[i]];
    }
    const last = parts[parts.length - 1];
    if (data === null) delete node[last]; else node[last] = data;
  };

  const connect = () => {
    if (closed) return;
    try { es = new EventSource(dbUrl()); } catch (e) { onState("down"); return; }
    const handle = (e) => {
      try {
        const { path, data } = JSON.parse(e.data);
        if (e.type === "patch" && data && typeof data === "object") {
          Object.keys(data).forEach((k) => setAtPath(path.replace(/\/$/, "") + "/" + k, data[k]));
        } else setAtPath(path, data);
        if (mirror) onData(normalize(JSON.parse(JSON.stringify(mirror))));
      } catch (err) {}
    };
    es.addEventListener("put", handle);
    es.addEventListener("patch", handle);
    es.addEventListener("open", () => onState("open"));
    es.onerror = () => {
      onState("down");
      try { es.close(); } catch (e) {}
      if (!closed) retry = setTimeout(connect, 5000);
    };
  };
  connect();
  return { close: () => { closed = true; clearTimeout(retry); try { es && es.close(); } catch (e) {} } };
}

export const cache = {
  db:      () => { try { const s = localStorage.getItem("et_cache"); return s ? normalize(JSON.parse(s)) : null; } catch (e) { return null; } },
  saveDb:  (d) => { try { localStorage.setItem("et_cache", JSON.stringify(d)); } catch (e) {} },
  me:      () => { try { const s = localStorage.getItem("et_me"); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
  saveMe:  (m) => { try { localStorage.setItem("et_me", JSON.stringify(m)); } catch (e) {} },
  pref:    () => { try { const s = localStorage.getItem("et_pref"); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
  savePref:(p) => { try { localStorage.setItem("et_pref", JSON.stringify(p)); } catch (e) {} },
};
