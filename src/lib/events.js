/* everything about reading an event record lives here */
import { TYPES, LEGACY_TYPE } from "../config.js";
import { MIN, sameDay, fmtD } from "./time.js";

export function resolveType(ev) {
  const id = LEGACY_TYPE[ev.type] || ev.type || "other";
  return TYPES.find((t) => t.id === id) || TYPES[3];
}
export const evLabel = (ev) => (ev.label && ev.label.trim()) || resolveType(ev).label;
export const evShort = (ev) => ((ev.label && ev.label.trim()) || resolveType(ev).short).toUpperCase();
export const evColor = (ev) => ev.color || resolveType(ev).color;

export function evHosts(ev) {
  if (Array.isArray(ev.hosts)) return ev.hosts.filter(Boolean);
  return ev.host ? String(ev.host).split(/,\s*/).filter(Boolean) : [];
}

export const evStart = (ev) => new Date(ev.start).getTime();
export const evEnd = (ev) => evStart(ev) + (ev.durationMin || 90) * MIN;

export function evRange(ev) {
  const s = evStart(ev), e = evEnd(ev);
  return sameDay(s, e - MIN) ? fmtD(s) : fmtD(s) + " → " + fmtD(e);
}
export const isMultiDay = (ev) => !sameDay(evStart(ev), evEnd(ev) - MIN);

/* live · soon · upcoming · past — drives every colour on the line */
export function statusOf(ev, now) {
  const s = evStart(ev), e = evEnd(ev);
  if (now >= s && now <= e) return "live";
  if (now > e) return "past";
  return s - now <= 24 * 3600000 ? "soon" : "upcoming";
}

export const kindFromType = { vc: "voice", channel: "text", server: "other", other: "other" };
