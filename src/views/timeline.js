import { h, useState, useMemo, Fragment } from "../react.js";
import { BODY } from "../theme.js";
import { useT, Btn } from "../ui/atoms.js";
import { Search, ChevronDown, ZoomIn, ZoomOut, Plus, Hourglass } from "../icons.js";
import { TYPES, ZOOMS } from "../config.js";
import { resolveType, evHosts, evStart } from "../lib/events.js";
import { Line } from "../timeline/line.js";

export function TimelinePage(p) {
  const T = useT();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [zoom, setZoom] = useState(1);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return p.events
      .filter((e) => (typeFilter === "all" ? true : resolveType(e).id === typeFilter))
      .filter((e) => !q || [e.title, e.label, ...evHosts(e), e.notes, e.where && e.where.channel,
        ...(e.participants || []), ...(e.winners || []).map((w) => w.name)].join(" ").toLowerCase().includes(q))
      .sort((a, b) => evStart(a) - evStart(b));
  }, [p.events, query, typeFilter]);

  return h(Fragment, null,
    h("div", { className: "shrink-0 px-4 sm:px-7 flex gap-2 pt-2 flex-wrap" },
      h("div", { className: "relative flex-1 min-w-[150px] max-w-xs" },
        h(Search, { size: 14, className: "absolute left-3 top-1/2 -translate-y-1/2", style: { color: T.muted } }),
        h("input", { value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Search the line",
          style: { width: "100%", background: T.field, border: "1px solid " + T.hair, borderRadius: 10, color: T.text,
            fontFamily: BODY, fontSize: 14, outline: "none", padding: "8px 12px 8px 34px" } })),
      h("div", { className: "relative" },
        h("select", { value: typeFilter, onChange: (e) => setTypeFilter(e.target.value),
          style: { background: T.field, border: "1px solid " + T.hair, borderRadius: 10, color: T.text,
            fontFamily: BODY, fontSize: 14, outline: "none", appearance: "none", padding: "8px 30px 8px 12px" } },
          h("option", { value: "all" }, "All types"),
          TYPES.map((t) => h("option", { key: t.id, value: t.id }, t.label))),
        h(ChevronDown, { size: 13, className: "absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none", style: { color: T.muted } })),
      h("div", { className: "ml-auto flex items-center gap-1.5" },
        h(Btn, { size: "sm", onClick: () => setZoom((z) => Math.max(0, z - 1)), disabled: zoom === 0 }, h(ZoomOut, { size: 13 })),
        h(Btn, { size: "sm", onClick: () => setZoom((z) => Math.min(2, z + 1)), disabled: zoom === 2 }, h(ZoomIn, { size: 13 })),
        p.canCreate ? h(Btn, { tone: "gold", size: "sm", onClick: p.onAddBreak, title: "Add a staff break" },
          h(Hourglass, { size: 13 }), h("span", { className: "hidden sm:inline" }, "Break")) : null,
        p.canCreate ? h(Btn, { tone: "solid", size: "sm", onClick: p.onAdd },
          h(Plus, { size: 14 }), h("span", { className: "hidden sm:inline" }, "New event")) : null)),

    h(Line, { events: visible, breaks: p.breaks, now: p.now, zoom: ZOOMS[zoom], onOpen: p.onOpen,
      empty: p.events.length === 0, onOpenBreak: p.canCreate ? p.onOpenBreak : null,
      canCreate: p.canCreate, onAdd: p.onAdd, serverName: p.server.name, ping: p.ping }));
}
