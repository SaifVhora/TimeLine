/* works out what actually needs a human's attention */
import { DAY } from "./time.js";
import { evStart, evEnd, evHosts, statusOf, hasResult } from "./events.js";

export function buildTodo(events, now) {
  const live = [], today = [], soon = [], missingResults = [], missingHost = [];
  const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999);

  events.forEach((ev) => {
    const st = statusOf(ev, now);
    if (st === "live") live.push(ev);
    else if (st !== "past" && evStart(ev) <= dayEnd.getTime()) today.push(ev);
    else if (st !== "past" && evStart(ev) - now <= 7 * DAY) soon.push(ev);

    if (st === "past") {
      /* only nag about the last 60 days — older than that, it's history */
      if (!hasResult(ev) && now - evEnd(ev) < 60 * DAY) missingResults.push(ev);
    } else if (!evHosts(ev).length) {
      missingHost.push(ev);
    }
  });

  const bySoonest = (a, b) => evStart(a) - evStart(b);
  const byRecent = (a, b) => evEnd(b) - evEnd(a);
  live.sort(bySoonest); today.sort(bySoonest); soon.sort(bySoonest);
  missingResults.sort(byRecent); missingHost.sort(bySoonest);

  return { live, today, soon, missingResults, missingHost,
    count: missingResults.length + missingHost.length };
}
