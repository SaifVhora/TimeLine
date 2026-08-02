/* aggregates placements, hosting and turnout across every event */
import { evStart, evEnd, evHosts } from "./events.js";

const clean = (s) => String(s || "").trim().replace(/^@/, "");
const keyOf = (s) => clean(s).toLowerCase();

export function buildStandings(events, opts) {
  const from = (opts && opts.from) || 0;
  const people = {};
  const touch = (name) => {
    const k = keyOf(name);
    if (!k) return null;
    if (!people[k]) people[k] = { key: k, name: clean(name), wins: 0, podium: 0, places: 0, hosted: 0, joined: 0, points: 0, last: 0 };
    return people[k];
  };

  let counted = 0;
  events.forEach((ev) => {
    if (evStart(ev) < from) return;
    counted++;
    const when = evEnd(ev);

    (ev.winners || []).forEach((w, i) => {
      const p = touch(w.name);
      if (!p) return;
      const place = Number(w.place || i + 1);
      p.places++;
      if (place === 1) p.wins++;
      if (place <= 3) p.podium++;
      p.points += place === 1 ? 5 : place === 2 ? 3 : place === 3 ? 2 : 1;
      p.last = Math.max(p.last, when);
    });

    evHosts(ev).forEach((hn) => {
      const p = touch(hn);
      if (!p) return;
      p.hosted++; p.points += 2;
      p.last = Math.max(p.last, when);
    });

    (ev.participants || []).forEach((pn) => {
      const p = touch(pn);
      if (!p) return;
      p.joined++;
      p.last = Math.max(p.last, when);
    });
  });

  const all = Object.values(people);

  return {
    counted,
    hosts: all.filter((p) => p.hosted > 0).sort((a, b) => b.hosted - a.hosted || a.name.localeCompare(b.name)).slice(0, 20),
    regulars: all.filter((p) => p.joined > 0).sort((a, b) => b.joined - a.joined || a.name.localeCompare(b.name)).slice(0, 20),
    totals: {
      people: all.length,
      hosted: all.reduce((n, p) => n + p.hosted, 0),
    },
  };
}
