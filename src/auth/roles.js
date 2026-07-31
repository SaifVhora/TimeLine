import { ROLE_PRESET } from "../config.js";

/* works out what this device is allowed to do */
export function computeAuth(db, me) {
  const a = db.access;
  if (!me || !me.key) return { state: "loading", role: "guest", registered: false, ...ROLE_PRESET.viewer };
  if (a.ownerKey && a.ownerKey === me.key)
    return { state: "in", role: "owner", registered: true, create: true, edit: true, delete: true, manage: true };
  const m = a.members.find((x) => x.key === me.key);
  if (m) return { state: "in", role: m.role, registered: true, ...ROLE_PRESET[m.role], ...(m.perms || {}) };
  if (a.denied.includes(me.key)) return { state: "denied", role: "guest", registered: false, ...ROLE_PRESET.viewer };
  if (a.pending.some((p) => p.key === me.key)) return { state: "waiting", role: "guest", registered: false, ...ROLE_PRESET.viewer };
  return { state: "guest", role: "guest", registered: false, ...ROLE_PRESET.viewer };
}
