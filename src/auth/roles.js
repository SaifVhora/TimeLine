import { BUILTIN_ROLES, OWNER_PERMS, NO_PERMS } from "../config.js";

/* every role available: the three built-ins plus whatever this team has made */
export function allRoles(access) {
  const custom = (access && access.roles) || [];
  const seen = new Set(BUILTIN_ROLES.map((r) => r.id));
  return BUILTIN_ROLES.concat(custom.filter((r) => r && r.id && !seen.has(r.id)));
}

export function roleById(access, id) {
  return allRoles(access).find((r) => r.id === id) || BUILTIN_ROLES[2];
}

/* a member's powers = their role's powers, with any personal overrides on top */
export function permsFor(access, member) {
  const role = roleById(access, member.role);
  return { ...NO_PERMS, ...(role.perms || {}), ...(member.perms || {}) };
}

export function computeAuth(db, me) {
  const a = db.access;
  const base = { registered: false, roleName: "Guest", roleColor: "#8B93AD" };
  if (!me || !me.key) return { state: "loading", role: "guest", ...base, ...NO_PERMS };

  if (a.ownerKey && a.ownerKey === me.key)
    return { state: "in", role: "owner", registered: true, roleName: "Owner", roleColor: "#E8C87A", ...OWNER_PERMS };

  const m = a.members.find((x) => x.key === me.key);
  if (m) {
    const role = roleById(a, m.role);
    const perms = permsFor(a, m);
    return { state: "in", role: m.role, registered: true, roleName: role.name, roleColor: role.color || "#8B93AD", ...perms };
  }
  if (a.denied.includes(me.key)) return { state: "denied", role: "guest", ...base, ...NO_PERMS };
  if (a.pending.some((p) => p.key === me.key)) return { state: "waiting", role: "guest", ...base, ...NO_PERMS };
  return { state: "guest", role: "guest", ...base, ...NO_PERMS };
}

/* can this person edit this particular event? */
export function canEditEvent(auth, ev, me) {
  if (auth.edit) return true;
  if (!auth.editOwn) return false;
  return !!(ev && me && ev.createdBy && ev.createdBy === me.key);
}

/* anything that should open the admin panel at all */
export const canOpenAdmin = (auth) => !!(auth.members || auth.roles || auth.data);
