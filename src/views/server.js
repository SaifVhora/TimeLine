import { h, useState, useMemo, useEffect, Fragment } from "../react.js";
import { DISPLAY } from "../theme.js";
import { useT, Btn } from "../ui/atoms.js";
import { Modal } from "../ui/modal.js";
import { BackStack } from "../ui/gestures.js";
import { nowISO, MIN, HOUR } from "../lib/time.js";
import { copy } from "../lib/util.js";
import { evHosts, evStart } from "../lib/events.js";
import { canEditEvent } from "../auth/roles.js";
import { buildTodo } from "../lib/todo.js";
import { Nav, pagesFor } from "./nav.js";
import { TimelinePage } from "./timeline.js";
import { NowPage } from "./now.js";
import { CalendarPage } from "./calendar.js";
import { ArchivePage } from "./archive.js";
import { StandingsPage } from "./standings.js";
import { Detail } from "../events/detail.js";
import { Editor, blankEvent } from "../events/editor.js";

export function ServerView(p) {
  const T = useT();
  const [page, setPage] = useState("timeline");
  /* create/edit rights are what make someone "staff" for navigation purposes */
  const isStaff = !!(p.auth.create || p.auth.edit || p.auth.editOwn || p.auth.delete || p.auth.members);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const events = useMemo(
    () => Object.values(p.db.events).filter((e) => !e.deleted && e.serverId === p.server.id),
    [p.db, p.server]);

  const names = useMemo(
    () => [p.db.access.ownerName, ...p.db.access.members.map((m) => m.name)].filter(Boolean),
    [p.db]);

  const todo = useMemo(() => buildTodo(events, p.now), [events, p.now]);

  /* leaving a sub-page goes back to the timeline before leaving the server */
  useEffect(() => {
    if (page === "timeline") return;
    return BackStack.push(() => { setPage("timeline"); return true; });
  }, [page]);

  const saveEvent = (ev) => {
    const exists = !!p.db.events[ev.id];
    p.apply((d) => {
      const existing = d.events[ev.id];
      d.events[ev.id] = { ...(existing || {}), ...ev, serverId: p.server.id, deleted: false,
        createdBy: (existing && existing.createdBy) || p.me.key,
        createdByName: (existing && existing.createdByName) || p.me.name,
        updatedAt: nowISO(), updatedBy: p.me.name };
      return d;
    }, exists ? "Event updated" : "Event added");
    setEditing(null);
  };

  const deleteEvent = (id) => {
    p.apply((d) => {
      if (d.events[id]) d.events[id] = { ...d.events[id], deleted: true, updatedAt: nowISO(), updatedBy: p.me.name };
      return d;
    }, "Deleted \u2014 you can undo this from the admin panel");
    setConfirmDel(null); setDetail(null);
  };

  const addBlank = () => setEditing(blankEvent());
  const addOnDay = (dayMs) => {
    const b = blankEvent();
    const s = new Date(dayMs); s.setHours(20, 0, 0, 0);
    setEditing({ ...b, start: s.toISOString() });
  };

  /* if rights change while you're on a staff page, fall back to the timeline */
  useEffect(() => {
    if (!isStaff && (page === "now" || page === "standings")) setPage("timeline");
  }, [isStaff, page]);

  const shared = { events, now: p.now, onOpen: setDetail, names,
    canCreate: p.auth.create, canEdit: p.auth.edit, onAdd: addBlank };

  return h(Fragment, null,
    h(Nav, { page, onGo: setPage, todo: todo.count, isStaff }),

    h("div", { className: "flex-1 min-h-0 flex flex-col" },
      page === "timeline" ? h(TimelinePage, { ...shared, server: p.server, auth: p.auth, ping: p.ping }) : null,
      page === "now" && isStaff ? h(NowPage, shared) : null,
      page === "calendar" ? h(CalendarPage, { ...shared, onAddOn: addOnDay, serverName: p.server.name, ping: p.ping }) : null,
      page === "archive" ? h(ArchivePage, shared) : null,
      page === "standings" && isStaff ? h(StandingsPage, shared) : null),

    h(Detail, { ev: detail, now: p.now, names, onClose: () => setDetail(null),
      perms: { edit: canEditEvent(p.auth, detail, p.me), delete: p.auth.delete },
      onEdit: (e) => { setDetail(null); setEditing(e); }, onDelete: setConfirmDel, onCopy: (t) => copy(t, p.ping) }),

    h(Editor, { ev: editing, onClose: () => setEditing(null), onSave: saveEvent, names }),

    h(Modal, { open: !!confirmDel, onClose: () => setConfirmDel(null) },
      h("div", { className: "p-6" },
        h("div", { style: { fontFamily: DISPLAY, fontSize: 19 } }, "Delete this event?"),
        h("p", { className: "mt-2 text-sm", style: { color: T.body } },
          "\u201C" + (confirmDel ? confirmDel.title : "") + "\u201D leaves the line for everyone. You can bring it back from the admin panel's Data tab."),
        h("div", { className: "mt-5 flex gap-2" },
          h(Btn, { tone: "danger", full: true, onClick: () => deleteEvent(confirmDel.id) }, "Delete event"),
          h(Btn, { full: true, onClick: () => setConfirmDel(null) }, "Keep it")))));
}
