/* Event templates.
   A template is the *shape* of an event with the date stripped out — name,
   type, colour, hosts, channel, length, notes. It lives under access.templates
   so it syncs and backs up with everything else, and it is never an event
   record, so nothing that reads the events table has to know it exists. */

import { uid } from "./util.js";
import { TYPES } from "../config.js";

/* only these fields are worth remembering — dates, results and winners never are */
export const TPL_FIELDS = [
  "title", "type", "label", "color", "side", "hosts", "where",
  "notes", "durationMin", "allDay",
];

export const MAX_TEMPLATES = 24;

export function tplFromEvent(ev, name) {
  const t = { id: uid(), name: (name || ev.title || "Untitled").trim().slice(0, 40) };
  TPL_FIELDS.forEach((k) => { if (ev[k] !== undefined) t[k] = ev[k]; });
  /* a template carries hosts but never a specific date, result or attachment */
  t.hosts = Array.isArray(ev.hosts) ? [...ev.hosts] : [];
  t.where = ev.where ? { ...ev.where } : null;
  return t;
}

/* apply a template onto a blank event, keeping the blank's id and start time */
export function tplApply(blank, tpl) {
  const next = { ...blank };
  TPL_FIELDS.forEach((k) => { if (tpl[k] !== undefined) next[k] = tpl[k]; });
  next.hosts = Array.isArray(tpl.hosts) ? [...tpl.hosts] : [];
  next.host = next.hosts.join(", ");
  next.where = tpl.where ? { ...tpl.where } : { kind: "voice", channel: "" };
  next.id = blank.id;
  next.start = blank.start;
  next.fromTemplate = tpl.id;
  return next;
}

export const tplList = (access) => ((access && access.templates) || []).filter((t) => t && t.id);

export function tplLine(t) {
  const ty = TYPES.find((x) => x.id === t.type);
  const bits = [ty ? ty.short : "EVENT"];
  const mins = Number(t.durationMin) || 0;
  if (mins) bits.push(mins >= 60 ? (mins / 60).toFixed(mins % 60 ? 1 : 0) + "H" : mins + "M");
  if (t.where && t.where.channel) bits.push("#" + t.where.channel);
  if (t.hosts && t.hosts.length) bits.push(t.hosts.length + " HOST" + (t.hosts.length === 1 ? "" : "S"));
  return bits.join(" \u00B7 ");
}

export const tplColor = (t) =>
  t.color || (TYPES.find((x) => x.id === t.type) || TYPES[3]).color;
