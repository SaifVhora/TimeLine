import { h, useState, useMemo } from "../react.js";
import { DISPLAY, MONO } from "../theme.js";
import { useT, Chip, Label } from "../ui/atoms.js";
import { Trophy, Users, BadgeCheck } from "../icons.js";
import { DAY } from "../lib/time.js";
import { Avatar } from "../auth/avatar.js";
import { buildStandings } from "../lib/standings.js";


export function StandingsPage(p) {
  const T = useT();
  const [range, setRange] = useState("all");
  const [board, setBoard] = useState("hosts");

  const from = useMemo(() => {
    if (range === "90") return p.now - 90 * DAY;
    if (range === "365") return p.now - 365 * DAY;
    return 0;
  }, [range, p.now]);

  const s = useMemo(() => buildStandings(p.events, { from }), [p.events, from]);
  const rows = s[board] || [];

  const stat = (n, label) => h("div", { className: "text-center" },
    h("div", { style: { fontFamily: DISPLAY, fontSize: 26, lineHeight: 1 } }, n),
    h("div", { className: "mt-1", style: { fontFamily: MONO, fontSize: 8, letterSpacing: "0.16em", color: T.muted } }, label));

  const metricFor = (row) => board === "hosts" ? row.hosted + " HOSTED" : row.joined + " JOINED";

  return h("div", { className: "h-full overflow-y-auto px-4 sm:px-7 pb-8 pt-1" },
    h("div", { className: "mx-auto w-full", style: { maxWidth: 620 } },

      h("div", { className: "flex justify-center gap-8 py-4" },
        stat(s.totals.people, "PEOPLE"), stat(s.counted, "EVENTS"), stat(s.totals.hosted, "HOSTED")),

      h("div", { className: "flex gap-1.5 flex-wrap mb-2 justify-center" },
        h(Chip, { on: board === "hosts", onClick: () => setBoard("hosts") }, "HOSTS"),
        h(Chip, { on: board === "regulars", onClick: () => setBoard("regulars") }, "REGULARS")),

      h("div", { className: "flex gap-1.5 flex-wrap mb-5 justify-center" },
        h(Chip, { on: range === "all", onClick: () => setRange("all") }, "ALL TIME"),
        h(Chip, { on: range === "365", onClick: () => setRange("365") }, "THIS YEAR"),
        h(Chip, { on: range === "90", onClick: () => setRange("90") }, "90 DAYS")),

      rows.length === 0
        ? h("div", { className: "py-14 text-center" },
            h(Trophy, { size: 20, style: { color: T.muted, margin: "0 auto 12px" } }),
            h("div", { style: { fontFamily: DISPLAY, fontSize: 19 } }, "No standings yet"),
            h("p", { className: "mt-2 text-sm", style: { color: T.muted } },
              board === "hosts" ? "Tag hosts on your events and they'll show up here."
                : "Add participants to your events to see your regulars."))
        : h("div", { className: "space-y-2" }, rows.map((row, i) => {
            const top = false;
            return h("div", { key: row.key, className: "p-3 rounded-xl flex items-center gap-3",
              style: { background: T.panel,
                border: "1px solid " + (top ? T.gold + "44" : T.hair) } },
              h("div", { className: "text-center", style: { width: 26, flexShrink: 0 } },
                h("span", { style: { fontFamily: MONO, fontSize: 11, color: T.muted } }, String(i + 1).padStart(2, "0"))),
              h(Avatar, { name: row.name, size: 32 }),
              h("div", { className: "flex-1 min-w-0" },
                h("div", { className: "truncate inline-flex items-center gap-1.5", style: { fontFamily: DISPLAY, fontSize: 16 } },
                  row.name,
                  (p.names || []).some((n) => n.toLowerCase() === row.key)
                    ? h(BadgeCheck, { size: 11, style: { color: T.gold } }) : null),
                h("div", { style: { fontFamily: MONO, fontSize: 8.5, color: T.muted, letterSpacing: "0.1em" } },
                  [row.wins ? row.wins + " WON" : "", row.podium ? row.podium + " TOP 3" : "",
                   row.hosted ? row.hosted + " HOSTED" : "", row.joined ? row.joined + " JOINED" : ""]
                    .filter(Boolean).join(" \u00B7 "))),
              h("div", { style: { fontFamily: MONO, fontSize: 9.5, color: top ? T.gold : T.muted,
                letterSpacing: "0.08em", whiteSpace: "nowrap" } }, metricFor(row)));
          })),

      rows.length > 0 ? h("div", { className: "mt-5 text-xs text-center", style: { color: T.muted } },
        "Counted from the hosts and participants on each event.") : null));
}
