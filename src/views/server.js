import { h, useState, useMemo, useEffect, Fragment } from "../react.js";
import { DISPLAY } from "../theme.js";
import { useT, Btn } from "../ui/atoms.js";
import { Modal } from "../ui/modal.js";
import { BackStack } from "../ui/gestures.js";
import { nowISO } from "../lib/time.js";
import { copy } from "../lib/util.js";
import { evStart } from "../lib/events.js";
import { canEditEvent } from "../auth/roles.js";
import { buildTodo } from "../lib/todo.js";
import { Nav } from "./nav.js";
import { TimelinePage } from "./timeline.js";
import { NowPage } from "./now.js";
import { CalendarPage } from "./calendar.js";
import { ArchivePage } from "./archive.js";
import { StandingsPage } from "./standings.js";
import { Detail } from "../events/detail.js";
import { Editor, blankEvent } from "../events/editor.js";
import { BreakEditor } from "../events/break-editor.js";
import { isBreak, notBreak, blankBreak } from "../lib/breaks.js";
import { expandSeries, applyToSibling } from "../lib/recur.js";

export function ServerView(p) {
  const T = useT();
  const [page, setPage] = useState("timeline");
  /* create/edit rights are what make someone "staff" for navigation purposes */
  const isStaff = !!(p.auth.create || p.auth.edit || p.auth.editOwn || p.auth.delete || p.auth.members);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [editingBreak, setEditingBreak] = useState(null);

  const all = useMemo(
    () => Object.values(p.db.events).filter((e) => !e.deleted && e.serverId === p.server.id),
    [p.db, p.server]);

  /* breaks live in the same table but are never events */
  const events = useMemo(() => all.filter(notBreak), [all]);
  const breaks = useMemo(() => all.filter(isBreak).sort((a, b) => new Date(a.start) - new Date(b.start)), [all]);

  const names = useMemo(
    () => [p.db.access.ownerName, ...p.db.access.members.map((m) => m.name)].filter(Boolean),
    [p.db]);

  const todo = useMemo(() => buildTodo(events, p.now), [events, p.now]);

  /* leaving a sub-page goes back to the timeline before leaving the server */
  useEffect(() => {
    if (page === "timeline") return;
    return BackStack.push(() => { setPage("timeline"); return true; });
  }, [page]);

  const stamp = (d, ev) => {
    const existing = d.events[ev.id];
    d.events[ev.id] = { ...(existing || {}), ...ev, serverId: p.server.id, deleted: false,
      createdBy: (existing && existing.createdBy) || p.me.key,
      createdByName: (existing && existing.createdByName) || p.me.name,
      createdAt: (existing && existing.createdAt) || nowISO(),
      updatedAt: nowISO(), updatedBy: p.me.name };
  };

  const saveEvent = (raw) => {
    const { _scope, _isNew, ...ev } = raw;
    const exists = !!p.db.events[ev.id];
    const repeat = ev.repeat;
    let msg = exists ? "Event updated" : "Event added";

    p.apply((d) => {
      /* a brand-new event with a repeat rule fans out into real occurrences */
      if (!exists && repeat && repeat.rule && repeat.rule !== "none") {
        const set = expandSeries(ev, repeat);
        set.forEach((one) => stamp(d, one));
        msg = set.length + " events added \u2014 the whole set is on the line";
        return d;
      }

      stamp(d, ev);

      /* editing one of a set can carry the change to its siblings */
      if (exists && _scope && _scope !== "one" && ev.series && ev.series.id) {
        const mine = Object.values(d.events).filter((x) =>
          !x.deleted && x.series && x.series.id === ev.series.id && x.id !== ev.id);
        const from = new Date(ev.start).getTime();
        const targets = _scope === "all" ? mine : mine.filter((x) => new Date(x.start).getTime() > from);
        targets.forEach((sib) => {
          d.events[sib.id] = { ...applyToSibling(sib, ev), updatedAt: nowISO(), updatedBy: p.me.name };
        });
        if (targets.length) msg = "Updated this and " + targets.length + " other" + (targets.length === 1 ? "" : "s") + " in the set";
      }
      return d;
    }, msg);
    setEditing(null);
  };

  const saveBreak = (brk) => {
    const exists = !!p.db.events[brk.id];
    p.apply((d) => { stamp(d, brk); return d; }, exists ? "Break updated" : "Break added \u2014 nothing can be scheduled inside it");
    setEditingBreak(null);
  };

  const deleteBreak = (brk) => {
    p.apply((d) => {
      if (d.events[brk.id]) d.events[brk.id] = { ...d.events[brk.id], deleted: true, updatedAt: nowISO(), updatedBy: p.me.name };
      return d;
    }, "Break removed");
    setEditingBreak(null);
  };

  const deleteEvent = (id, wholeSeries) => {
    p.apply((d) => {
      const target = d.events[id];
      const kill = (x) => { d.events[x.id] = { ...x, deleted: true, updatedAt: nowISO(), updatedBy: p.me.name }; };
      if (!target) return d;
      kill(target);
      if (wholeSeries && target.series && target.series.id) {
        Object.values(d.events)
          .filter((x) => !x.deleted && x.series && x.series.id === target.series.id)
          .forEach(kill);
      }
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

  const addBreak = () => setEditingBreak(blankBreak());

  const shared = { events, breaks, now: p.now, onOpen: setDetail, names,
    canCreate: p.auth.create, canEdit: p.auth.edit, onAdd: addBlank,
    onAddBreak: addBreak, onOpenBreak: setEditingBreak };

  return h(Fragment, null,
    h(Nav, { page, onGo: setPage, todo: todo.count, isStaff }),

    h("div", { className: "flex-1 min-h-0 flex flex-col" },
      page === "timeline" ? h(TimelinePage, { ...shared, server: p.server, auth: p.auth, ping: p.ping }) : null,
      page === "now" && isStaff ? h(NowPage, shared) : null,
      page === "calendar" ? h(CalendarPage, { ...shared, onAddOn: addOnDay, serverName: p.server.name, ping: p.ping }) : null,
      page === "archive" ? h(ArchivePage, shared) : null,
      page === "standings" && isStaff ? h(StandingsPage, shared) : null),

    h(Detail, { ev: detail, now: p.now, names, onClose: () => setDetail(null),
      serverName: p.server.name, onPing: p.ping,
      perms: { edit: canEditEvent(p.auth, detail, p.me), delete: p.auth.delete },
      onEdit: (e) => { setDetail(null); setEditing(e); }, onDelete: setConfirmDel, onCopy: (t) => copy(t, p.ping) }),

    h(Editor, { ev: editing, onClose: () => setEditing(null), onSave: saveEvent, names, breaks }),

    h(BreakEditor, { brk: editingBreak, onClose: () => setEditingBreak(null),
      onSave: saveBreak, onDelete: p.auth.delete ? deleteBreak : null }),

    h(Modal, { open: !!confirmDel, onClose: () => setConfirmDel(null) },
      h("div", { className: "p-6" },
        h("div", { style: { fontFamily: DISPLAY, fontSize: 19 } }, "Delete this event?"),
        h("p", { className: "mt-2 text-sm", style: { color: T.body } },
          "\u201C" + (confirmDel ? confirmDel.title : "") + "\u201D leaves the line for everyone. You can bring it back from the admin panel's Data tab."),
        confirmDel && confirmDel.series && confirmDel.series.id
          ? h("p", { className: "mt-2 text-xs", style: { color: T.muted } },
              "This is one of a repeating set.")
          : null,
        h("div", { className: "mt-5 flex gap-2 flex-wrap" },
          h(Btn, { tone: "danger", full: true, onClick: () => deleteEvent(confirmDel.id, false) }, "Delete this one"),
          confirmDel && confirmDel.series && confirmDel.series.id
            ? h(Btn, { tone: "danger", full: true, onClick: () => deleteEvent(confirmDel.id, true) }, "Delete the whole set")
            : null,
          h(Btn, { full: true, onClick: () => setConfirmDel(null) }, "Keep it")))));
}
