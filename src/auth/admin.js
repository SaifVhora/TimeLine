import { h, useState, useEffect } from "../react.js";
import { DISPLAY, MONO } from "../theme.js";
import { useT, useInput, Btn, Label, Field } from "../ui/atoms.js";
import { Modal } from "../ui/modal.js";
import { X, Check, Trash, Smartphone, ChevronDown, Share2, Copy, Link2, AlertCircle, KeyRound } from "../icons.js";
import { PERMS, NO_PERMS } from "../config.js";
import { allRoles, roleById, permsFor } from "./roles.js";
import { RolesTab } from "./roles-tab.js";
import { DataTab } from "./data-tab.js";
import { Webhooks } from "./webhooks-panel.js";
import { fingerprint, copy, appLink } from "../lib/util.js";
import { nowISO, ago } from "../lib/time.js";
import { Avatar } from "./avatar.js";

export function Admin(p) {
  const T = useT();
  const input = useInput();
  const access = p.access;
  const auth = p.auth;
  const first = auth.members ? "requests" : auth.roles ? "roles" : "data";
  const [tab, setTab] = useState(first);
  const [link, setLink] = useState("");

  useEffect(() => { if (p.open) { setTab(first); setLink(access.link || appLink()); } }, [p.open]);

  const members = access.members || [];
  const pending = access.pending || [];
  const savedLink = access.link || appLink();
  const roles = allRoles(access);

  const approve = (req, role) => p.apply((d) => {
    d.access.members = [...d.access.members.filter((m) => m.key !== req.key),
      { key: req.key, name: req.name, role, perms: {}, passHash: req.passHash || "", approvedAt: nowISO() }];
    d.access.pending = d.access.pending.filter((x) => x.key !== req.key);
    d.access.denied = d.access.denied.filter((k) => k !== req.key);
    d.access.updatedAt = nowISO(); return d;
  }, req.name + " is in");

  const deny = (req) => p.apply((d) => {
    d.access.pending = d.access.pending.filter((x) => x.key !== req.key);
    d.access.denied = [...d.access.denied, req.key];
    d.access.updatedAt = nowISO(); return d;
  }, "Request turned down");

  const setPerm = (key, k, val) => p.apply((d) => {
    d.access.members = d.access.members.map((m) => {
      if (m.key !== key) return m;
      const base = { ...NO_PERMS, ...(roleById(d.access, m.role).perms || {}) };
      const next = { ...(m.perms || {}), [k]: val };
      Object.keys(next).forEach((kk) => { if (next[kk] === base[kk]) delete next[kk]; });
      return { ...m, perms: next };
    });
    d.access.updatedAt = nowISO(); return d;
  }, null);

  const setRole = (key, role) => p.apply((d) => {
    d.access.members = d.access.members.map((m) => m.key === key ? { ...m, role, perms: {} } : m);
    d.access.updatedAt = nowISO(); return d;
  }, "Role changed");

  const revoke = (key) => p.apply((d) => {
    d.access.members = d.access.members.filter((m) => m.key !== key);
    d.access.denied = [...d.access.denied, key];
    d.access.updatedAt = nowISO(); return d;
  }, "Access revoked");

  const inviteText = "You've got access to our Events Timeline \u2728\n\n1. Open " + savedLink +
    "\n2. Tap \"Join the team\" and put your name in\n3. I approve it and you're in\n\nEvery event, winner and result \u2014 in your own time zone. No account needed.";

  const shareInvite = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Events Timeline", text: inviteText, url: savedLink }); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    copy(inviteText, p.ping);
  };

  const tabBtn = (id, label) => h("button", { key: id, onClick: () => setTab(id), className: "flex-1 py-2 rounded-lg",
    style: { background: tab === id ? T.solidBtn : "transparent", color: tab === id ? T.solidInk : T.muted,
      fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.1em", border: "none", cursor: "pointer", whiteSpace: "nowrap" } },
    String(label).toUpperCase());

  const roleDot = (r, size) => h("span", { style: { width: size || 7, height: size || 7, borderRadius: 2,
    transform: "rotate(45deg)", background: r.color || T.muted, display: "inline-block", flexShrink: 0 } });

  return h(Modal, { open: p.open, onClose: p.onClose, wide: true },
    h("div", { className: "p-6" },
      h("div", { className: "flex items-center justify-between mb-4" },
        h("div", null,
          h("div", { style: { fontFamily: DISPLAY, fontSize: 21 } }, "Admin panel"),
          h("div", { style: { fontFamily: MONO, fontSize: 9.5, color: T.muted, letterSpacing: "0.12em" } },
            "PEOPLE \u00B7 ROLES \u00B7 CHANNELS \u00B7 DATA")),
        h("button", { onClick: p.onClose, style: { color: T.muted, background: "none", border: "none", cursor: "pointer" } },
          h(X, { size: 19 }))),

      h("div", { className: "flex gap-1 mb-5 p-1 rounded-xl overflow-x-auto scroller",
        style: { background: T.panel, border: "1px solid " + T.hair } },
        auth.members ? tabBtn("requests", "Requests \u00B7 " + pending.length) : null,
        auth.members ? tabBtn("staff", "Staff \u00B7 " + members.length) : null,
        auth.roles ? tabBtn("roles", "Roles") : null,
        auth.members ? tabBtn("invite", "Invite") : null,
        auth.servers ? tabBtn("channels", "Channels") : null,
        auth.data ? tabBtn("data", "Data") : null),

      tab === "requests" && auth.members ? h("div", null,
        pending.length === 0
          ? h("div", { className: "py-8 text-sm text-center", style: { color: T.muted } }, "Nobody's knocking right now.")
          : null,
        h("div", { className: "space-y-2" }, pending.map((req) =>
          h("div", { key: req.key, className: "p-3 rounded-lg", style: { background: T.panel, border: "1px solid " + T.hair } },
            h("div", { className: "flex items-center gap-2" },
              h(Avatar, { name: req.name, size: 30 }),
              h("div", { className: "flex-1 min-w-0" },
                h("div", { className: "truncate", style: { fontFamily: DISPLAY, fontSize: 16 } }, req.name),
                h("div", { className: "inline-flex items-center gap-1.5",
                  style: { fontFamily: MONO, fontSize: 9, color: T.muted, letterSpacing: "0.1em" } },
                  h(Smartphone, { size: 9 }),
                  "DEVICE " + fingerprint(req.key) + " \u00B7 " + ago(new Date(req.at).getTime()).toUpperCase(),
                  req.passHash ? h(KeyRound, { size: 9, style: { color: T.gold } }) : null))),
            h("div", { className: "mt-2.5" },
              h("div", { className: "mb-1.5", style: { fontFamily: MONO, fontSize: 9, color: T.muted, letterSpacing: "0.14em" } }, "LET THEM IN AS"),
              h("div", { className: "flex gap-1.5 flex-wrap" },
                roles.map((r) => h(Btn, { key: r.id, size: "sm", onClick: () => approve(req, r.id) },
                  roleDot(r), " " + r.name)),
                h(Btn, { size: "sm", tone: "danger", onClick: () => deny(req) }, h(X, { size: 12 }), " Decline")))))))
        : null,

      tab === "staff" && auth.members ? h("div", null,
        h("div", { className: "flex items-center gap-2 py-2.5 px-3 rounded-lg mb-3",
          style: { background: T.panel, border: "1px solid " + T.hair } },
          h(Avatar, { name: access.ownerName, avatar: access.ownerAvatar, size: 30 }),
          h("div", { className: "flex-1", style: { fontFamily: DISPLAY, fontSize: 15 } }, access.ownerName),
          access.ownerPassHash ? h(KeyRound, { size: 11, style: { color: T.gold } }) : null,
          h("span", { style: { fontFamily: MONO, fontSize: 9, color: T.gold, letterSpacing: "0.1em" } }, "OWNER")),
        members.length === 0
          ? h("div", { className: "py-3 text-sm", style: { color: T.muted } }, "Nobody approved yet \u2014 share the invite.")
          : null,
        h("div", { className: "space-y-2" }, members.map((m) => {
          const perms = permsFor(access, m);
          const meta = roleById(access, m.role);
          const overrides = Object.keys(m.perms || {}).length;
          return h("div", { key: m.key, className: "p-3 rounded-lg", style: { background: T.panel, border: "1px solid " + T.hair } },
            h("div", { className: "flex items-center gap-2" },
              h(Avatar, { name: m.name, avatar: m.avatar, size: 30 }),
              h("div", { className: "flex-1 min-w-0" },
                h("div", { className: "truncate", style: { fontFamily: DISPLAY, fontSize: 15 } }, m.name,
                  m.passHash ? h(KeyRound, { size: 10, style: { marginLeft: 6, color: T.gold, display: "inline" } }) : null),
                h("div", { className: "inline-flex items-center gap-1.5",
                  style: { fontFamily: MONO, fontSize: 8.5, color: T.muted, letterSpacing: "0.1em" } },
                  roleDot(meta, 6), meta.name.toUpperCase() + " \u00B7 " + fingerprint(m.key) +
                  (overrides ? " \u00B7 " + overrides + " CUSTOM" : ""))),
              h("div", { className: "relative" },
                h("select", { value: m.role, onChange: (e) => setRole(m.key, e.target.value),
                  style: { ...input, width: "auto", padding: "5px 26px 5px 9px", fontSize: 11, appearance: "none" } },
                  roles.map((r) => h("option", { key: r.id, value: r.id }, r.name))),
                h(ChevronDown, { size: 11, className: "absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none",
                  style: { color: T.muted } })),
              h(Btn, { size: "sm", tone: "danger", onClick: () => revoke(m.key) }, h(Trash, { size: 12 }))),
            h("div", { className: "flex flex-wrap gap-1.5 mt-2.5" }, PERMS.map((pm) =>
              h("button", { key: pm.id, title: pm.hint, onClick: () => setPerm(m.key, pm.id, !perms[pm.id]),
                className: "px-2 py-1 rounded-md inline-flex items-center gap-1",
                style: { fontFamily: MONO, fontSize: 9, letterSpacing: "0.08em", cursor: "pointer",
                  border: "1px solid " + (perms[pm.id] ? T.gold + "66" : T.hair),
                  background: perms[pm.id] ? "rgba(180,140,40,.1)" : "transparent",
                  color: perms[pm.id] ? T.gold : T.muted } },
                perms[pm.id] ? h(Check, { size: 9 }) : h(X, { size: 9 }), " " + pm.label.toUpperCase()))));
        })))
        : null,

      tab === "roles" && auth.roles ? h(RolesTab, { access, apply: p.apply }) : null,

      tab === "invite" && auth.members ? h("div", { className: "space-y-4" },
        h(Field, { label: "This app's link", hint: "Auto-filled from the address bar. Save it once and every invite includes it." },
          h("div", { className: "flex gap-2" },
            h("input", { style: input, value: link, onChange: (e) => setLink(e.target.value) }),
            h(Btn, { tone: "solid", disabled: !link.trim() || link.trim() === access.link,
              onClick: () => p.apply((d) => { d.access.link = link.trim(); d.access.updatedAt = nowISO(); return d; },
                "Link saved for everyone") }, "Save"))),
        h("div", null, h(Label, null, "Invite message"),
          h("div", { className: "p-3 rounded-lg text-sm",
            style: { background: T.panel, border: "1px solid " + T.hair, color: T.body, whiteSpace: "pre-wrap", lineHeight: 1.6 } },
            inviteText),
          h("div", { className: "mt-2 flex gap-2" },
            h(Btn, { tone: "gold", full: true, onClick: shareInvite }, h(Share2, { size: 13 }), " Share invite"),
            h(Btn, { full: true, onClick: () => copy(inviteText, p.ping) }, h(Copy, { size: 13 }), " Copy")),
          h("div", { className: "mt-2" },
            h(Btn, { full: true, onClick: () => copy(savedLink, p.ping) }, h(Link2, { size: 13 }), " Copy just the link"))),
        h("div", { className: "flex gap-2 text-xs", style: { color: T.muted } },
          h(AlertCircle, { size: 13, className: "shrink-0 mt-0.5" }),
          h("span", null, "Anyone with the link can ask; nobody gets in without your tap. Names are self-declared \u2014 match the device tag against who actually messaged you.")))
        : null,

      tab === "channels" && auth.servers
        ? h(Webhooks, { access, ping: p.ping,
            onSave: (webhooks) => p.apply((d) => {
              d.access = { ...d.access, webhooks };
              return d;
            }, "Channels updated") })
        : null,

      tab === "data" && auth.data ? h(DataTab, { db: p.db, apply: p.apply, ping: p.ping }) : null));
}
