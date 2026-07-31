import { placeOf } from "../icons.js";
import { fmtDur } from "../lib/time.js";
import { resolveType, evLabel, evHosts, evStart, evEnd, isMultiDay } from "../lib/events.js";

export function announcement(ev) {
  const t = resolveType(ev);
  const w = (ev.winners || []).filter((x) => x.name);
  const medals = ["\uD83E\uDD47", "\uD83E\uDD48", "\uD83E\uDD49"];
  const start = Math.floor(evStart(ev) / 1000);
  const end = Math.floor(evEnd(ev) / 1000);
  const multi = isMultiDay(ev);
  const pl = ev.where && ev.where.channel ? placeOf(ev.where.kind) : null;
  const hosts = evHosts(ev);
  return [
    "**" + ev.title + "** \u00B7 " + evLabel(ev) + (ev.label ? " (" + t.label + ")" : ""),
    ev.allDay
      ? (multi ? "\uD83D\uDDD3\uFE0F <t:" + start + ":D> \u2192 <t:" + end + ":D>" : "\uD83D\uDDD3\uFE0F <t:" + start + ":D> \u00B7 all day")
      : (multi ? "\uD83D\uDD52 <t:" + start + ":F> \u2192 <t:" + end + ":F>" : "\uD83D\uDD52 <t:" + start + ":F> \u00B7 runs " + fmtDur(ev.durationMin)),
    pl ? pl.emoji + " " + (ev.where.channel.startsWith("#") ? ev.where.channel : "#" + ev.where.channel) : "",
    hosts.length ? "\uD83C\uDF99\uFE0F Hosted by " + hosts.join(", ") : "",
    ...w.map((x, i) => (medals[i] || "\uD83C\uDFC5") + " **" + x.name + "**" + (x.score ? " \u2014 " + x.score : "") + (x.prize ? " \u00B7 " + x.prize : "")),
    ...(ev.attachments || []).filter((f) => f.url).map((f) => "\uD83D\uDD17 " + (f.label || "Results") + ": " + f.url),
    (ev.participants || []).length ? "\n\uD83D\uDC65 " + ev.participants.length + " joined: " + ev.participants.join(", ") : "",
    ev.notes ? "\n\uD83D\uDCDD " + ev.notes : "",
  ].filter(Boolean).join("\n");
}
