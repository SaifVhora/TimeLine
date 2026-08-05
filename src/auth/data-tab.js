import { h, useState, useEffect, useRef } from "../react.js";
import { DISPLAY, MONO } from "../theme.js";
import { useT, Btn, Label } from "../ui/atoms.js";
import { Modal } from "../ui/modal.js";
import { Download, Upload, History, Undo, Trash, AlertCircle, X, Database, ShieldAlert } from "../icons.js";
import { ago, nowISO } from "../lib/time.js";
import { listBackups, backupById, deleteBackup, downloadBackup, parseBackup, readFile,
         maybeSnapshot, trashOf, summariseRestore, countsOf } from "../store/backup.js";

const bytes = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");

export function DataTab(p) {
  const T = useT();
  const fileRef = useRef(null);
  const [backups, setBackups] = useState([]);
  const [pendingRestore, setPendingRestore] = useState(null); /* { db, summary, source } */
  const [busy, setBusy] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(null);

  const refresh = () => setBackups(listBackups());
  useEffect(() => { refresh(); }, [p.db]);

  const trash = trashOf(p.db);
  const counts = countsOf(p.db);

  const askRestore = (db, source) => setPendingRestore({ db, source, summary: summariseRestore(p.db, db) });

  const doRestore = async () => {
    if (!pendingRestore) return;
    setBusy(true);
    maybeSnapshot(p.db, { force: true });          /* safety snapshot of what we're about to replace */
    const incoming = pendingRestore.db;
    await p.apply((d) => {
      d.servers = incoming.servers;
      d.events = incoming.events;
      d.access = { ...incoming.access, updatedAt: nowISO() };
      return d;
    }, "Restored \u2014 everyone sees this version now");
    setBusy(false); setPendingRestore(null); refresh();
  };

  const onFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      const db = parseBackup(await readFile(f));
      askRestore(db, f.name);
    } catch (err) { p.ping(err.message, true); }
  };

  const restoreEvent = (ev) => p.apply((d) => {
    if (d.events[ev.id]) d.events[ev.id] = { ...d.events[ev.id], deleted: false, updatedAt: nowISO() };
    return d;
  }, "\u201C" + ev.title + "\u201D is back on the line");

  const restoreServer = (s) => p.apply((d) => {
    if (d.servers[s.id]) d.servers[s.id] = { ...d.servers[s.id], deleted: false, updatedAt: nowISO() };
    return d;
  }, "\u201C" + s.name + "\u201D restored");

  const purgeAll = () => p.apply((d) => {
    Object.keys(d.events).forEach((k) => { if (d.events[k].deleted) delete d.events[k]; });
    Object.keys(d.servers).forEach((k) => { if (d.servers[k].deleted) delete d.servers[k]; });
    return d;
  }, "Trash emptied for good");

  const row = { background: T.panel, border: "1px solid " + T.hair };

  return h("div", { className: "space-y-6" },

    /* ── snapshot + export ── */
    h("div", null,
      h(Label, null, "This timeline right now"),
      h("div", { className: "p-3 rounded-lg flex items-center gap-3 flex-wrap", style: row },
        h(Database, { size: 15, style: { color: T.gold } }),
        h("div", { className: "flex-1", style: { fontFamily: MONO, fontSize: 10.5, color: T.body, letterSpacing: "0.06em" } },
          counts.events + " EVENTS \u00B7 " + counts.servers + " SERVERS \u00B7 " + counts.people + " PEOPLE"),
        h(Btn, { size: "sm", tone: "gold", onClick: () => { downloadBackup(p.db, "timeline"); p.ping("Backup file saved to your downloads"); } },
          h(Download, { size: 12 }), " Save a copy"),
        h(Btn, { size: "sm", onClick: () => { const s = maybeSnapshot(p.db, { force: true }); refresh(); p.ping(s ? "Snapshot taken" : "Couldn't snapshot \u2014 storage is full", !s); } },
          h(History, { size: 12 }), " Snapshot")),
      h("div", { className: "mt-2 text-xs", style: { color: T.muted } },
        "The saved file is the whole timeline. Keep one somewhere safe \u2014 it's the only copy that survives if the database is wiped.")),

    /* ── restore from file ── */
    h("div", null,
      h(Label, null, "Restore from a file"),
      h("input", { ref: fileRef, type: "file", accept: "application/json,.json", onChange: onFile, style: { display: "none" } }),
      h(Btn, { full: true, onClick: () => fileRef.current && fileRef.current.click() },
        h(Upload, { size: 13 }), " Choose a backup file"),
      h("div", { className: "mt-2 text-xs", style: { color: T.muted } },
        "You'll see exactly what changes before anything is written.")),

    /* ── automatic snapshots ── */
    h("div", null,
      h(Label, null, "Automatic snapshots \u00B7 " + backups.length),
      backups.length === 0
        ? h("div", { className: "p-3 rounded-lg text-sm", style: { ...row, color: T.muted } },
            "None yet. One is taken automatically as you use the app, and they live on this device only.")
        : h("div", { className: "space-y-1.5" }, backups.map((b) =>
            h("div", { key: b.id, className: "p-2.5 rounded-lg flex items-center gap-2 flex-wrap", style: row },
              h("div", { className: "flex-1 min-w-0" },
                h("div", { style: { fontFamily: MONO, fontSize: 10, color: T.text, letterSpacing: "0.06em" } },
                  ago(b.at).toUpperCase() + (b.manual ? " \u00B7 MANUAL" : "")),
                h("div", { style: { fontFamily: MONO, fontSize: 9, color: T.muted } },
                  b.counts.events + " events \u00B7 " + b.counts.servers + " servers \u00B7 " + bytes(b.size))),
              h(Btn, { size: "sm", onClick: () => { const db = backupById(b.id); if (db) askRestore(db, "snapshot from " + ago(b.at)); else p.ping("That snapshot is unreadable", true); } },
                h(Undo, { size: 11 }), " Restore"),
              h(Btn, { size: "sm", tone: "danger", onClick: () => { deleteBackup(b.id); refresh(); } }, h(X, { size: 11 }))))),
      h("div", { className: "mt-2 text-xs", style: { color: T.muted } },
        "Snapshots are stored in this browser, not in the database \u2014 so they survive a wipe, but not clearing your browser data.")),

    /* ── trash ── */
    h("div", null,
      h(Label, null, "Recently deleted \u00B7 " + trash.total),
      trash.total === 0
        ? h("div", { className: "p-3 rounded-lg text-sm", style: { ...row, color: T.muted } }, "Nothing deleted. Deleted events stay here so you can undo.")
        : h("div", { className: "space-y-1.5" },
            trash.servers.map((s) =>
              h("div", { key: s.id, className: "p-2.5 rounded-lg flex items-center gap-2", style: row },
                h("div", { className: "flex-1 min-w-0" },
                  h("div", { className: "truncate", style: { fontFamily: DISPLAY, fontSize: 15 } }, s.name),
                  h("div", { style: { fontFamily: MONO, fontSize: 9, color: T.muted, letterSpacing: "0.1em" } },
                    "SERVER \u00B7 REMOVED " + ago(new Date(s.updatedAt || 0).getTime()).toUpperCase())),
                h(Btn, { size: "sm", tone: "gold", onClick: () => restoreServer(s) }, h(Undo, { size: 11 }), " Restore"))),
            trash.events.map((ev) =>
              h("div", { key: ev.id, className: "p-2.5 rounded-lg flex items-center gap-2", style: row },
                h("div", { className: "flex-1 min-w-0" },
                  h("div", { className: "truncate", style: { fontFamily: DISPLAY, fontSize: 15 } }, ev.title),
                  h("div", { style: { fontFamily: MONO, fontSize: 9, color: T.muted, letterSpacing: "0.1em" } },
                    "DELETED " + ago(new Date(ev.updatedAt || 0).getTime()).toUpperCase() +
                    (ev.updatedBy ? " BY " + String(ev.updatedBy).toUpperCase() : ""))),
                h(Btn, { size: "sm", tone: "gold", onClick: () => restoreEvent(ev) }, h(Undo, { size: 11 }), " Restore")))),
      trash.total > 0
        ? h("div", { className: "mt-2" },
            h(Btn, { size: "sm", tone: "danger", onClick: () => setConfirmPurge(true) }, h(Trash, { size: 11 }), " Empty the trash"))
        : null),

    /* ── restore confirmation ── */
    h(Modal, { open: !!pendingRestore, onClose: () => setPendingRestore(null) },
      pendingRestore ? h("div", { className: "p-6" },
        h("div", { className: "flex items-center gap-2 mb-1" },
          h(ShieldAlert, { size: 17, style: { color: T.gold } }),
          h("div", { style: { fontFamily: DISPLAY, fontSize: 20 } }, "Replace the live timeline?")),
        h("p", { className: "mt-2 text-sm", style: { color: T.body } },
          "This overwrites what everyone sees with ", h("strong", null, pendingRestore.source),
          ". A snapshot of the current version is taken first, so you can undo this."),
        h("div", { className: "mt-4 space-y-1.5" },
          ["events", "servers", "people"].map((k) => {
            const s = pendingRestore.summary[k];
            const up = s.delta > 0, same = s.delta === 0;
            return h("div", { key: k, className: "flex items-center gap-2 p-2 rounded-lg", style: row },
              h("span", { className: "flex-1", style: { fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em", color: T.muted } }, k.toUpperCase()),
              h("span", { style: { fontFamily: MONO, fontSize: 12, color: T.body } }, s.from + " \u2192 " + s.to),
              h("span", { style: { fontFamily: MONO, fontSize: 10, color: same ? T.muted : up ? T.live : T.danger } },
                same ? "no change" : (up ? "+" : "") + s.delta));
          })),
        pendingRestore.summary.events.delta < 0
          ? h("div", { className: "mt-3 p-2.5 rounded-lg flex gap-2 text-xs", style: { background: "rgba(210,60,80,.08)", border: "1px solid " + T.danger + "44", color: T.body } },
              h(AlertCircle, { size: 13, style: { color: T.danger, flexShrink: 0 } }),
              h("span", null, "This backup has fewer events than the live timeline. Anything added since it was taken will disappear."))
          : null,
        h("div", { className: "mt-5 flex gap-2" },
          h(Btn, { tone: "solid", full: true, disabled: busy, onClick: doRestore }, busy ? "Restoring\u2026" : "Yes, restore"),
          h(Btn, { full: true, onClick: () => setPendingRestore(null) }, "Cancel"))) : null),

    /* ── purge confirmation ── */
    h(Modal, { open: !!confirmPurge, onClose: () => setConfirmPurge(null) },
      h("div", { className: "p-6" },
        h("div", { style: { fontFamily: DISPLAY, fontSize: 19 } }, "Empty the trash?"),
        h("p", { className: "mt-2 text-sm", style: { color: T.body } },
          trash.total + " deleted item" + (trash.total === 1 ? "" : "s") + " will be gone for good. Your snapshots and saved files still have them."),
        h("div", { className: "mt-5 flex gap-2" },
          h(Btn, { tone: "danger", full: true, onClick: () => { purgeAll(); setConfirmPurge(null); } }, "Empty it"),
          h(Btn, { full: true, onClick: () => setConfirmPurge(null) }, "Keep them")))));
}
