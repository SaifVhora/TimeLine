/* Staff breaks.
   A break is stored in the same events table with kind: "break", so it syncs,
   merges, backs up and restores with everything else — but it never renders as
   an event node and never counts towards standings or the archive. */

import { MIN, fmtD, fmtDay, fmtTime, sameDay } from "./time.js";
import { TYPES } from "../config.js";
import { uid } from "./util.js";
import { seriesStarts } from "./recur.js";

export const isBreak = (e) => !!e && e.kind === "break";
export const notBreak = (e) => !isBreak(e);

export const brStart = (b) => new Date(b.start).getTime();
export const brEnd = (b) =>
  brStart(b) + (b.durationMin == null ? 1440 : Math.max(0, b.durationMin)) * MIN;

export const blankBreak = () => {
  const s = new Date();
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() + 1);
  return {
    id: uid(), kind: "break", title: "Staff break",
    start: s.toISOString(), durationMin: 1440 * 3,
    scope: "all", types: [], reason: "",
    repeat: { rule: "none", mode: "count", count: 8, until: null },
  };
};

/* A repeating break fans out the same way a repeating event does: every
   occurrence is a real record sharing a series id, so conflict detection,
   the calendar and the timeline curtain need to know nothing about repeats. */
export function expandBreakSeries(base, repeat) {
  const starts = seriesStarts(base.start, repeat);
  if (starts.length <= 1) return [{ ...base, series: null }];
  const seriesId = (base.series && base.series.id) || uid();
  const meta = { id: seriesId, rule: repeat.rule, mode: repeat.mode,
                 count: repeat.count || null, until: repeat.until || null };
  return starts.map((d, i) => ({
    ...base,
    id: i === 0 ? base.id : uid(),
    start: d.toISOString(),
    series: { ...meta, index: i, of: starts.length },
  }));
}

/* does this break stand in the way of an event of this type? */
export const brCovers = (b, typeId) =>
  b.scope === "all" || (b.types || []).includes(typeId);

/* every break that overlaps the window and applies to the type */
export function brConflicts(breaks, startMs, endMs, typeId) {
  return (breaks || []).filter((b) =>
    !b.deleted && brCovers(b, typeId) && startMs < brEnd(b) && endMs > brStart(b));
}

export function brRange(b) {
  const s = brStart(b), e = brEnd(b);
  return sameDay(s, e - MIN) ? fmtDay(s) : fmtD(s) + " \u2192 " + fmtD(e - MIN);
}

export function brWho(b) {
  if (b.scope === "all") return "All events";
  const names = (b.types || []).map((id) => (TYPES.find((t) => t.id === id) || {}).short || id);
  return names.length ? names.join(", ") + " only" : "Nothing selected";
}

export const brLive = (b, now) => now >= brStart(b) && now <= brEnd(b);

export function brLine(b) {
  return b.title + " \u00B7 " + brRange(b) + " \u00B7 " + brWho(b);
}
