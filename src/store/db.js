/* Firebase REST + local cache + conflict merge. Nothing else talks to the network. */
import { CONFIG, DB_PATH } from "../config.js";
import { newer } from "../lib/time.js";

export const EMPTY = {
  servers: {}, events: {},
  access: { ownerKey: "", ownerName: "", ownerAvatar: null, ownerPassHash: "",
            members: [], pending: [], denied: [], link: "", updatedAt: null },
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

export const cache = {
  db:      () => { try { const s = localStorage.getItem("et_cache"); return s ? normalize(JSON.parse(s)) : null; } catch (e) { return null; } },
  saveDb:  (d) => { try { localStorage.setItem("et_cache", JSON.stringify(d)); } catch (e) {} },
  me:      () => { try { const s = localStorage.getItem("et_me"); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
  saveMe:  (m) => { try { localStorage.setItem("et_me", JSON.stringify(m)); } catch (e) {} },
  pref:    () => { try { const s = localStorage.getItem("et_pref"); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
  savePref:(p) => { try { localStorage.setItem("et_pref", JSON.stringify(p)); } catch (e) {} },
};
