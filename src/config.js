/* ═══ the only file you edit to point at a different database ═══ */
export const CONFIG = {
  databaseURL: "https://eventstimeline-6fc74-default-rtdb.firebaseio.com",
};

export const DB_PATH = "events_timeline_v1";

/* event types — add one here and it appears everywhere */
export const TYPES = [
  { id: "vc",      label: "VC event",      short: "VC",      color: "#8B7BFF" },
  { id: "channel", label: "Channel event", short: "CHANNEL", color: "#38BDF8" },
  { id: "server",  label: "Server event",  short: "SERVER",  color: "#E8C87A" },
  { id: "other",   label: "Other",         short: "EVENT",   color: "#8B93AD" },
];
/* events made before the type rename map onto the new ones */
export const LEGACY_TYPE = { lltvc: "vc", karaoke: "vc", gtac: "channel", chart: "channel", auction: "server" };

/* deliberately no greens — green is reserved for "happening right now" */
export const PALETTE = ["#8B7BFF", "#38BDF8", "#E8C87A", "#FF9F6B", "#FF7BD5", "#C08BFF", "#7BC5FF", "#FF7285"];

export const ROLE_PRESET = {
  admin:  { create: true,  edit: true,  delete: true,  manage: true  },
  editor: { create: true,  edit: true,  delete: false, manage: false },
  viewer: { create: false, edit: false, delete: false, manage: false },
};
export const PERMS = ["create", "edit", "delete", "manage"];

export const ZOOMS = [6, 18, 52];   /* pixels per day at each zoom step */
export const PAD_X = 170;
export const PASS_SALT = "et-salt";
