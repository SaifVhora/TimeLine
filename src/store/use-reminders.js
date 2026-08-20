/* The clock that actually fires reminders.

   Runs in every staff browser, which is the whole problem — see the note in
   lib/reminders.js. The claim/confirm dance below is what stops five tabs
   posting five copies of the same reminder.

   The db ref matters: step 2 has to read the *latest* synced data, not the
   snapshot the effect closed over, or every client sees only its own claim
   and they all post anyway. */

import { useEffect, useRef } from "../react.js";
import { dueReminders, remHeader, pruneLedger } from "../lib/reminders.js";
import { hookList, postToDiscord } from "../lib/webhooks.js";
import { announcement } from "../events/announce.js";

const TICK = 30000;
const CLAIM_WAIT = 2500;   /* long enough for a claim to sync out and back */

export function useReminders({ db, events, apply, clientId, enabled }) {
  const busy = useRef(false);
  const dbRef = useRef(db);
  const evRef = useRef(events);
  const applyRef = useRef(apply);

  /* keep the refs pointed at the newest render's data */
  dbRef.current = db;
  evRef.current = events;
  applyRef.current = apply;

  useEffect(() => {
    if (!enabled) return undefined;
    let stopped = false;

    const record = (key, val) => applyRef.current((d) => {
      const reminded = pruneLedger((d.access && d.access.reminded) || {}, Date.now());
      d.access = { ...d.access, reminded: { ...reminded, [key]: val } };
      return d;
    }, null);   /* null message — reminders never interrupt with a toast */

    const tick = async () => {
      if (busy.current || stopped) return;
      const access = dbRef.current.access || {};
      const due = dueReminders(evRef.current, access.reminded || {}, Date.now());
      if (!due.length) return;

      busy.current = true;
      try {
        const job = due[0];                       /* one per tick, oldest first */
        const hooks = hookList(access);
        const hook = hooks.find((w) => w.id === job.hook) || hooks[0];

        /* nothing to post into — record it as handled so it stops coming up
           due every 30 seconds for the rest of the grace window */
        if (!hook) { record(job.key, { at: Date.now(), skipped: "no channel" }); return; }

        /* 1. claim it */
        record(job.key, { at: Date.now(), by: clientId, claimed: true });
        await new Promise((r) => setTimeout(r, CLAIM_WAIT));
        if (stopped) return;

        /* 2. did our claim survive the round trip? if another client's landed
              on top of ours, they own it — stand down */
        const fresh = (dbRef.current.access && dbRef.current.access.reminded) || {};
        const holder = fresh[job.key];
        if (!holder || holder.by !== clientId || holder.posted) return;

        /* 3. post */
        const text = remHeader(job.ev, job.lead) + "\n" + announcement(job.ev);
        const r = await postToDiscord(hook.url, text);
        record(job.key, { at: Date.now(), by: clientId, posted: true,
          ok: r.ok, error: r.ok ? null : r.error });
      } catch (e) {
        /* a reminder must never take the app down */
      } finally {
        busy.current = false;
      }
    };

    const id = setInterval(tick, TICK);
    const kick = setTimeout(tick, 1500);   /* let the first sync land first */
    return () => { stopped = true; clearInterval(id); clearTimeout(kick); };
  }, [enabled, clientId]);
}
