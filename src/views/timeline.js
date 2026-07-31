import { h, useState, useMemo, Fragment } from "../react.js";
import { DISPLAY, BODY, MONO } from "../theme.js";
import { useT, Btn } from "../ui/atoms.js";
import { Modal } from "../ui/modal.js";
import { Search, ChevronDown, ZoomIn, ZoomOut, Plus } from "../icons.js";
import { TYPES, ZOOMS } from "../config.js";
import { nowISO } from "../lib/time.js";
import { copy } from "../lib/util.js";
import { resolveType, evHosts, evStart } from "../lib/events.js";
import { Line } from "../timeline/line.js";
import { Detail } from "../events/detail.js";
import { Editor, blankEvent } from "../events/editor.js";

export function ServerTimeline(p) {
  const T = useT();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [zoom, setZoom] = useState(1);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const events = useMemo(
    () => Object.values(p.db.events).filter((e) => !e.deleted && e.serverId === p.server.id),
    [p.db, p.server]);

  const names = useMemo(
    () => [p.db.access.ownerName, ...p.db.access.members.map((m) => m.name)].filter(Boolean),
    [p.db]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events
      .filter((e) => (typeFilter === "all" ? true : resolveType(e).id === typeFilter))
      .filter((e) => !q || [e.title, e.label, ...evHosts(e), e.notes, e.where && e.where.channel,
        ...(e.participants || []), ...(e.winners || []).map((w) => w.name)].join(" ").toLowerCase().includes(q))
      .sort((a, b) => evStart(a) - evStart(b));
  }, [events, query, typeFilter]);

  const saveEvent = (ev) => {
    const exists = !!p.db.events[ev.id];
    p.apply((d) => {
      d.events[ev.id] = { ...(d.events[ev.id] || {}), ...ev, serverId: p.server.id, deleted: false,
        updatedAt: nowISO(), updatedBy: p.me.name };
      return d;
    }, exists ? "Event updated" : "Event added");
    setEditing(null);
  };

  const deleteEvent = (id) => {
    p.apply((d) => {
      if (d.events[id]) d.events[id] = { ...d.events[id], deleted: true, updatedAt: nowISO(), updatedBy: p.me.name };
      return d;
    }, "Event deleted");
    setConfirmDel(null); setDetail(null);
  };

  return h(Fragment, null,
    h("div", { className: "shrink-0 px-4 sm:px-7 flex gap-2 pt-3 flex-wrap" },
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
        p.auth.create ? h(Btn, { tone: "solid", size: "sm", onClick: () => setEditing(blankEvent()) },
          h(Plus, { size: 14 }), h("span", { className: "hidden sm:inline" }, "New event")) : null)),

    h(Line, { events: visible, now: p.now, zoom: ZOOMS[zoom], onOpen: setDetail, empty: events.length === 0,
      canCreate: p.auth.create, onAdd: () => setEditing(blankEvent()), serverName: p.server.name, ping: p.ping }),

    h(Detail, { ev: detail, now: p.now, perms: p.auth, names, onClose: () => setDetail(null),
      onEdit: (e) => { setDetail(null); setEditing(e); }, onDelete: setConfirmDel, onCopy: (t) => copy(t, p.ping) }),

    h(Editor, { ev: editing, onClose: () => setEditing(null), onSave: saveEvent, names }),

    h(Modal, { open: !!confirmDel, onClose: () => setConfirmDel(null) },
      h("div", { className: "p-6" },
        h("div", { style: { fontFamily: DISPLAY, fontSize: 19 } }, "Delete this event?"),
        h("p", { className: "mt-2 text-sm", style: { color: T.body } },
          "\u201C" + (confirmDel ? confirmDel.title : "") + "\u201D leaves the line for everyone on the next sync. There's no undo."),
        h("div", { className: "mt-5 flex gap-2" },
          h(Btn, { tone: "danger", full: true, onClick: () => deleteEvent(confirmDel.id) }, "Delete event"),
          h(Btn, { full: true, onClick: () => setConfirmDel(null) }, "Keep it")))));
}
