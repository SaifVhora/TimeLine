/* Repeating events.
   A rule never lives on its own — every occurrence is written to the database
   as a real, independently editable event that happens to carry the same
   series id. That keeps the timeline, calendar, archive and standings code
   completely unaware that recurrence exists. */

import { uid } from "./util.js";

export const RULES = [
  { id: "none",     label: "DOESN'T REPEAT", short: "" },
  { id: "daily",    label: "EVERY DAY",      short: "daily" },
  { id: "weekly",   label: "EVERY WEEK",     short: "weekly" },
  { id: "biweekly", label: "EVERY 2 WEEKS",  short: "every 2 weeks" },
  { id: "monthly",  label: "EVERY MONTH",    short: "monthly" },
];

export const MAX_OCCURRENCES = 60;

export const blankRepeat = () => ({ rule: "none", mode: "count", count: 8, until: null });

/* month steps clamp instead of spilling: 31 Jan → 28 Feb, not 3 Mar */
function addMonths(date, n) {
  const day = date.getDate();
  const d = new Date(date.getTime());
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  d.setHours(date.getHours(), date.getMinutes(), date.getSeconds(), 0);
  return d;
}

function step(first, rule, i) {
  const d = new Date(first.getTime());
  if (rule === "daily") { d.setDate(first.getDate() + i); return d; }
  if (rule === "weekly") { d.setDate(first.getDate() + 7 * i); return d; }
  if (rule === "biweekly") { d.setDate(first.getDate() + 14 * i); return d; }
  if (rule === "monthly") return addMonths(first, i);
  return null;
}

/* every start time in the series, the original included */
export function seriesStarts(startISO, repeat) {
  const r = repeat || {};
  const first = new Date(startISO);
  if (!r.rule || r.rule === "none") return [first];

  const out = [first];
  if (r.mode === "until" && r.until) {
    const limit = new Date(r.until);
    limit.setHours(23, 59, 59, 999);
    for (let i = 1; i < MAX_OCCURRENCES; i++) {
      const d = step(first, r.rule, i);
      if (!d || d > limit) break;
      out.push(d);
    }
    return out;
  }

  const n = Math.max(1, Math.min(MAX_OCCURRENCES, Number(r.count) || 1));
  for (let i = 1; i < n; i++) {
    const d = step(first, r.rule, i);
    if (!d) break;
    out.push(d);
  }
  return out;
}

/* the base event plus one clone per later occurrence */
export function expandSeries(base, repeat) {
  const starts = seriesStarts(base.start, repeat);
  if (starts.length <= 1) return [{ ...base, series: null }];

  const seriesId = (base.series && base.series.id) || uid();
  const meta = { id: seriesId, rule: repeat.rule, mode: repeat.mode, count: repeat.count || null, until: repeat.until || null };

  return starts.map((d, i) => ({
    ...base,
    id: i === 0 ? base.id : uid(),
    start: d.toISOString(),
    series: { ...meta, index: i, of: starts.length },
  }));
}

export function repeatSummary(repeat) {
  const r = repeat || {};
  const rule = RULES.find((x) => x.id === r.rule);
  if (!rule || r.rule === "none") return "One-off — happens once.";
  const n = seriesStarts(new Date().toISOString(), r).length;
  const tail = r.mode === "until" && r.until
    ? "until " + new Date(r.until).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : n + " times";
  return "Repeats " + rule.short + ", " + tail + ".";
}

/* fields that travel when you edit a whole series — dates never do */
export const SERIES_FIELDS = [
  "title", "type", "label", "color", "side", "hosts", "host", "where",
  "notes", "durationMin", "allDay",
];

export function applyToSibling(sibling, edited) {
  const next = { ...sibling };
  SERIES_FIELDS.forEach((k) => { next[k] = edited[k]; });
  /* keep each occurrence's own day, take the edited time of day */
  const src = new Date(edited.start), dst = new Date(sibling.start);
  dst.setHours(src.getHours(), src.getMinutes(), 0, 0);
  next.start = dst.toISOString();
  return next;
}
