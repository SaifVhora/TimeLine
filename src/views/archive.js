import { h, useState, useMemo } from "../react.js";
import { DISPLAY, BODY, MONO } from "../theme.js";
import { useT, Chip } from "../ui/atoms.js";
import { Search, Trophy, Paperclip, Users } from "../icons.js";
import { TYPES } from "../config.js";
import { fmtTime } from "../lib/time.js";
import { evStart, evColor, evShort, evRange, evHosts, resolveType, statusOf } from "../lib/events.js";

export function ArchivePage(p) {
  const T = useT();
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [when, setWhen] = useState("all");
  const [order, setOrder] = useState("new");

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = p.events.filter((ev) => {
      if (type !== "all" && resolveType(ev).id !== type) return false;
      const st = statusOf(ev, p.now);
      if (when === "past" && st !== "past") return false;
      if (when === "upcoming" && st === "past") return false;
      if (!needle) return true;
      return [ev.title, ev.label, ev.notes, ev.where && ev.where.channel, ...evHosts(ev),
        ...(ev.participants || []), ...(ev.winners || []).map((w) => w.name)]
        .filter(Boolean).join(" ").toLowerCase().includes(needle);
    });
    out.sort((a, b) => order === "new" ? evStart(b) - evStart(a) : evStart(a) - evStart(b));
    return out;
  }, [p.events, q, type, when, order, p.now]);

  /* group by month for readable scanning */
  const groups = useMemo(() => {
    const g = [];
    list.forEach((ev) => {
      const d = new Date(evStart(ev));
      const key = d.getFullYear() + "-" + d.getMonth();
      const label = d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      const last = g[g.length - 1];
      if (last && last.key === key) last.items.push(ev);
      else g.push({ key, label, items: [ev] });
    });
    return g;
  }, [list]);

  const input = { width: "100%", background: T.field, border: "1px solid " + T.hair, borderRadius: 10,
    color: T.text, fontFamily: BODY, fontSize: 14, outline: "none", padding: "9px 12px 9px 34px" };

  return h("div", { className: "h-full overflow-y-auto px-4 sm:px-7 pb-8 pt-1" },
    h("div", { className: "mx-auto w-full", style: { maxWidth: 720 } },

      h("div", { className: "relative mb-2.5" },
        h(Search, { size: 14, className: "absolute left-3 top-1/2 -translate-y-1/2", style: { color: T.muted } }),
        h("input", { value: q, onChange: (e) => setQ(e.target.value), style: input,
          placeholder: "Search titles, hosts, winners, notes\u2026" })),

      h("div", { className: "flex gap-1.5 flex-wrap mb-2" },
        h(Chip, { on: type === "all", onClick: () => setType("all") }, "ALL"),
        TYPES.map((t) => h(Chip, { key: t.id, on: type === t.id, color: t.color, onClick: () => setType(t.id) }, t.short))),

      h("div", { className: "flex gap-1.5 flex-wrap mb-4 items-center" },
        h(Chip, { on: when === "all", onClick: () => setWhen("all") }, "EVERYTHING"),
        h(Chip, { on: when === "past", onClick: () => setWhen("past") }, "FINISHED"),
        h(Chip, { on: when === "upcoming", onClick: () => setWhen("upcoming") }, "STILL TO COME"),
        h("button", { onClick: () => setOrder(order === "new" ? "old" : "new"),
          className: "ml-auto", style: { background: "none", border: "none", cursor: "pointer",
            fontFamily: MONO, fontSize: 9, letterSpacing: "0.12em", color: T.muted } },
          order === "new" ? "NEWEST FIRST \u2193" : "OLDEST FIRST \u2191")),

      h("div", { className: "mb-3", style: { fontFamily: MONO, fontSize: 9, color: T.muted, letterSpacing: "0.14em" } },
        list.length + " EVENT" + (list.length === 1 ? "" : "S") + (q || type !== "all" || when !== "all" ? " MATCHING" : "")),

      list.length === 0
        ? h("div", { className: "py-14 text-center" },
            h("div", { style: { fontFamily: DISPLAY, fontSize: 19 } }, "Nothing matches"),
            h("p", { className: "mt-2 text-sm", style: { color: T.muted } }, "Try a shorter search or clear the filters."))
        : h("div", { className: "space-y-6" }, groups.map((g) =>
            h("div", { key: g.key },
              h("div", { className: "mb-2 flex items-baseline gap-2" },
                h("div", { style: { fontFamily: DISPLAY, fontSize: 17, color: T.text } }, g.label),
                h("div", { style: { fontFamily: MONO, fontSize: 8.5, color: T.muted, letterSpacing: "0.14em" } }, g.items.length)),
              h("div", { className: "space-y-2" }, g.items.map((ev) => {
                const st = statusOf(ev, p.now);
                const col = st === "past" ? T.silver : evColor(ev);
                const win = (ev.winners || []).filter((w) => w.name);
                const hosts = evHosts(ev);
                return h("button", { key: ev.id, onClick: () => p.onOpen(ev),
                  className: "w-full text-left p-3 rounded-xl flex gap-3",
                  style: { background: T.panel, border: "1px solid " + T.hair, cursor: "pointer",
                    opacity: st === "past" ? 0.82 : 1 } },
                  h("span", { className: st === "live" ? "breathe" : "",
                    style: { width: 9, height: 9, marginTop: 5, borderRadius: 2, transform: "rotate(45deg)",
                      background: col, flexShrink: 0, display: "inline-block",
                      boxShadow: st === "past" ? "none" : "0 0 10px " + col } }),
                  h("div", { className: "flex-1 min-w-0" },
                    h("div", { className: "truncate", style: { fontFamily: DISPLAY, fontSize: 16 } }, ev.title),
                    h("div", { className: "truncate", style: { fontFamily: MONO, fontSize: 9, color: T.muted, letterSpacing: "0.1em" } },
                      evShort(ev) + " \u00B7 " + evRange(ev) + (ev.allDay ? "" : " \u00B7 " + fmtTime(ev.start)) +
                      (hosts.length ? " \u00B7 " + hosts.join(", ") : "")),
                    win.length ? h("div", { className: "mt-1 truncate inline-flex items-center gap-1.5",
                      style: { fontFamily: MONO, fontSize: 9.5, color: T.gold } },
                      h(Trophy, { size: 9 }), win[0].name + (win.length > 1 ? " +" + (win.length - 1) : "")) : null),
                  h("div", { className: "flex flex-col items-end gap-1", style: { flexShrink: 0 } },
                    st === "live" ? h("span", { style: { fontFamily: MONO, fontSize: 8.5, color: T.live, letterSpacing: "0.1em" } }, "LIVE") : null,
                    (ev.participants || []).length ? h("span", { className: "inline-flex items-center gap-1",
                      style: { fontFamily: MONO, fontSize: 8.5, color: T.muted } },
                      h(Users, { size: 8 }), (ev.participants || []).length) : null,
                    (ev.attachments || []).filter((f) => f.url).length ? h("span", { className: "inline-flex items-center gap-1",
                      style: { fontFamily: MONO, fontSize: 8.5, color: T.muted } },
                      h(Paperclip, { size: 8 }), (ev.attachments || []).filter((f) => f.url).length) : null));
              })))))));
}
