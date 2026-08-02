/* ═══ the only file you edit to point at a different database ═══ */
export const CONFIG = {
  databaseURL: "https://eventstimeline-6fc74-default-rtdb.firebaseio.com",
};

export const DB_PATH = "events_timeline_v1";

/* event types — add one here and it appears everywhere */
export const TYPES = [
  { id: "vc",      label: "VC event",      short: "VC",      color: "#8B7BFF" },
  { id: "channel", label: "Channel event", short: "CHANNEL", color: "#35D6C0" },
  { id: "server",  label: "Server event",  short: "SERVER",  color: "#E8C87A" },
  { id: "other",   label: "Other",         short: "EVENT",   color: "#8B93AD" },
];
/* events made before the type rename map onto the new ones */
export const LEGACY_TYPE = { lltvc: "vc", karaoke: "vc", gtac: "channel", chart: "channel", auction: "server" };

export const PALETTE = ["#8B7BFF", "#35D6C0", "#E8C87A", "#FF9F6B", "#FF7BD5", "#6BE3B8", "#7BC5FF", "#FF7285"];

/* every power someone can be given, with a plain-English label */
export const PERMS = [
  { id: "create",  label: "Add events",        hint: "Create new events on the line" },
  { id: "edit",    label: "Edit any event",    hint: "Change events other people made" },
  { id: "editOwn", label: "Edit own events",   hint: "Change only the events they created" },
  { id: "delete",  label: "Delete events",     hint: "Move events to the trash" },
  { id: "servers", label: "Manage servers",    hint: "Add or remove servers on the hub" },
  { id: "members", label: "Approve people",    hint: "Let people in and change what they can do" },
  { id: "roles",   label: "Manage roles",      hint: "Create roles and set their powers" },
  { id: "data",    label: "Backups & restore", hint: "Save, restore and empty the trash" },
];
export const PERM_IDS = PERMS.map((p) => p.id);
export const NO_PERMS = PERM_IDS.reduce((o, k) => { o[k] = false; return o; }, {});

/* roles that always exist and can't be deleted */
export const BUILTIN_ROLES = [
  { id: "admin",  name: "Admin",  color: "#FF7BD5", builtin: true,
    perms: { create: true, edit: true, editOwn: true, delete: true, servers: true, members: true, roles: false, data: true } },
  { id: "editor", name: "Editor", color: "#35D6C0", builtin: true,
    perms: { create: true, edit: true, editOwn: true, delete: false, servers: false, members: false, roles: false, data: false } },
  { id: "viewer", name: "Viewer", color: "#8B93AD", builtin: true,
    perms: { ...NO_PERMS } },
];

/* owner has everything, always */
export const OWNER_PERMS = PERM_IDS.reduce((o, k) => { o[k] = true; return o; }, {});

/* kept so old records that say role: "editor" still resolve */
export const ROLE_PRESET = BUILTIN_ROLES.reduce((o, r) => { o[r.id] = r.perms; return o; }, {});

export const ROLE_COLORS = ["#FF7BD5", "#35D6C0", "#8B7BFF", "#E8C87A", "#FF9F6B", "#6BE3B8", "#7BC5FF", "#8B93AD"];

export const ZOOMS = [6, 18, 52];   /* pixels per day at each zoom step */
export const PAD_X = 170;
export const PASS_SALT = "et-salt";
