/* Pre-event reminders.
   A reminder is "post this event's announcement N minutes before it starts".

   The hard part isn't the timer, it's not posting twice. Every staff member's
   browser is running the same clock over the same shared data, so if all five
   of them have the tab open, five reminders would fire. We solve it the same
   way the rest of the app solves everything: write a record to the shared DB
   and let last-write-wins sort it out. Before posting, a client claims the
   reminder by writing its own id; a moment later it re-reads, and only the
   client whose claim survived actually posts.

   That's not a perfect lock — two clients can still both post if their writes
   land within the sync window — but it turns "always five copies" into "very
   occasionally two", which is the right trade for a Discord schedule tool. */

export const LEADS = [
  { id: 0, label: "AT START" },
  { id: 5, label: "5 MIN" },
  { id: 15, label: "15 MIN" },
  { id: 30, label: "30 MIN" },
  { id: 60, label: "1 HOUR" },
  { id: 1440, label: "1 DAY" },
];

/* how late is too late — if the tab was closed and we've missed the window by
   more than this, the reminder is stale and gets skipped rather than spamming
   the channel with things that already happened */
export const GRACE_MIN = 10;

export const remKey = (ev, lead) => ev.id + ":" + lead;

export const remOf = (ev) => {
  const r = (ev && ev.remind) || null;
  if (!r || !Array.isArray(r.leads) || !r.leads.length) return null;
  return { leads: r.leads.map(Number).filter((n) => Number.isFinite(n)), hook: r.hook || null };
};

/* Which reminders are due right now, given what's already been sent. */
export function dueReminders(events, ledger, nowMs) {
  const sent = ledger || {};
  const out = [];
  (events || []).forEach((ev) => {
    const r = remOf(ev);
    if (!r) return;
    const start = new Date(ev.start).getTime();
    if (!Number.isFinite(start)) return;
    r.leads.forEach((lead) => {
      const fireAt = start - lead * 60000;
      if (nowMs < fireAt) return;                          /* not yet */
      if (nowMs > fireAt + GRACE_MIN * 60000) return;      /* missed the window */
      const key = remKey(ev, lead);
      if (sent[key]) return;                               /* already handled */
      out.push({ key, ev, lead, fireAt, hook: r.hook });
    });
  });
  return out.sort((a, b) => a.fireAt - b.fireAt);
}

export function leadLabel(lead) {
  const f = LEADS.find((l) => l.id === Number(lead));
  if (f) return f.label;
  const n = Number(lead);
  return n >= 1440 ? Math.round(n / 1440) + " DAY" : n >= 60 ? Math.round(n / 60) + " HOUR" : n + " MIN";
}

export const remSummary = (ev) => {
  const r = remOf(ev);
  if (!r) return "";
  return r.leads.slice().sort((a, b) => b - a).map(leadLabel).join(" \u00B7 ") + " BEFORE";
};

/* The line that goes above the announcement so people know why they're pinged. */
export const remHeader = (ev, lead) =>
  Number(lead) === 0
    ? "\uD83D\uDD34 **Starting now**"
    : "\u23F0 **" + leadLabel(lead).toLowerCase().replace(/^(\d+)/, "In $1") + "**";

/* Trim the ledger so it can't grow forever — anything older than a week is
   irrelevant because the grace window already closed on it. */
export function pruneLedger(ledger, nowMs) {
  const out = {};
  const cut = nowMs - 7 * 86400000;
  Object.entries(ledger || {}).forEach(([k, v]) => {
    const at = v && v.at ? v.at : 0;
    if (at > cut) out[k] = v;
  });
  return out;
}
