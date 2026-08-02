import { h, useState } from "../react.js";
import { DISPLAY, MONO } from "../theme.js";
import { useT, useInput, Btn, Label } from "../ui/atoms.js";
import { Modal } from "../ui/modal.js";
import { Plus, X, Trash, Check, Pencil, Lock } from "../icons.js";
import { PERMS, NO_PERMS, ROLE_COLORS } from "../config.js";
import { allRoles } from "./roles.js";
import { nowISO } from "../lib/time.js";
import { uid } from "../lib/util.js";

export function RolesTab(p) {
  const T = useT();
  const input = useInput();
  const [draft, setDraft] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const roles = allRoles(p.access);
  const custom = (p.access.roles || []);
  const countFor = (id) => (p.access.members || []).filter((m) => m.role === id).length;

  const blank = () => ({ id: "r" + uid(), name: "", color: ROLE_COLORS[0], perms: { ...NO_PERMS }, isNew: true });

  const save = () => {
    const d = draft;
    if (!d.name.trim()) return;
    p.apply((dd) => {
      const list = (dd.access.roles || []).filter((r) => r.id !== d.id);
      dd.access.roles = [...list, { id: d.id, name: d.name.trim(), color: d.color, perms: d.perms }];
      dd.access.updatedAt = nowISO();
      return dd;
    }, d.isNew ? "Role created" : "Role updated");
    setDraft(null);
  };

  const remove = (role) => {
    p.apply((dd) => {
      dd.access.roles = (dd.access.roles || []).filter((r) => r.id !== role.id);
      /* anyone holding it drops to viewer rather than losing access entirely */
      dd.access.members = dd.access.members.map((m) => m.role === role.id ? { ...m, role: "viewer" } : m);
      dd.access.updatedAt = nowISO();
      return dd;
    }, "Role deleted \u2014 anyone using it is now a Viewer");
    setConfirmDel(null);
  };

  const permCount = (role) => PERMS.filter((pm) => (role.perms || {})[pm.id]).length;

  return h("div", { className: "space-y-4" },
    h("div", { className: "text-xs", style: { color: T.muted } },
      "A role is a named set of powers. Give someone a role, then tweak individual powers on them if you need to."),

    h("div", { className: "space-y-2" }, roles.map((role) => {
      const n = countFor(role.id);
      return h("div", { key: role.id, className: "p-3 rounded-lg", style: { background: T.panel, border: "1px solid " + T.hair } },
        h("div", { className: "flex items-center gap-2.5" },
          h("span", { style: { width: 10, height: 10, borderRadius: 2, transform: "rotate(45deg)",
            background: role.color || T.muted, flexShrink: 0, display: "inline-block" } }),
          h("div", { className: "flex-1 min-w-0" },
            h("div", { className: "truncate inline-flex items-center gap-1.5", style: { fontFamily: DISPLAY, fontSize: 16 } },
              role.name,
              role.builtin ? h(Lock, { size: 10, style: { color: T.muted } }) : null),
            h("div", { style: { fontFamily: MONO, fontSize: 9, color: T.muted, letterSpacing: "0.1em" } },
              permCount(role) + " OF " + PERMS.length + " POWERS \u00B7 " + n + " PERSON" + (n === 1 ? "" : "S"))),
          h(Btn, { size: "sm", onClick: () => setDraft({ ...role, perms: { ...NO_PERMS, ...(role.perms || {}) }, isNew: false }) },
            h(Pencil, { size: 11 }), role.builtin ? " View" : " Edit"),
          !role.builtin ? h(Btn, { size: "sm", tone: "danger", onClick: () => setConfirmDel(role) }, h(Trash, { size: 11 })) : null),
        h("div", { className: "flex flex-wrap gap-1 mt-2" }, PERMS.filter((pm) => (role.perms || {})[pm.id]).map((pm) =>
          h("span", { key: pm.id, style: { fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.08em",
            color: role.color || T.muted, border: "1px solid " + (role.color || T.hair) + "55",
            borderRadius: 6, padding: "2px 6px" } }, pm.label.toUpperCase()))));
    })),

    h(Btn, { full: true, tone: "gold", onClick: () => setDraft(blank()) }, h(Plus, { size: 13 }), " New role"),

    h(Modal, { open: !!draft, onClose: () => setDraft(null), wide: true },
      draft ? h("div", { className: "p-6" },
        h("div", { className: "flex items-center justify-between mb-4" },
          h("div", { style: { fontFamily: DISPLAY, fontSize: 20 } },
            draft.builtin ? draft.name + " \u00B7 built in" : draft.isNew ? "New role" : "Edit role"),
          h("button", { onClick: () => setDraft(null), style: { color: T.muted, background: "none", border: "none", cursor: "pointer" } },
            h(X, { size: 19 }))),

        draft.builtin
          ? h("div", { className: "mb-4 text-xs", style: { color: T.muted } },
              "Built-in roles can't be changed \u2014 make a new role if you want a different mix. You can still override powers on individual people.")
          : h("div", { className: "space-y-3 mb-4" },
              h("div", null, h(Label, null, "Name"),
                h("input", { style: input, value: draft.name, autoFocus: true,
                  onChange: (e) => setDraft({ ...draft, name: e.target.value.slice(0, 24) }),
                  placeholder: "e.g. Host, Trial mod, Results team" })),
              h("div", null, h(Label, null, "Colour"),
                h("div", { className: "flex gap-1.5 flex-wrap" }, ROLE_COLORS.map((c) =>
                  h("button", { key: c, onClick: () => setDraft({ ...draft, color: c }),
                    style: { width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer",
                      border: draft.color === c ? "2px solid " + T.text : "2px solid transparent" } }))))),

        h(Label, null, "Powers"),
        h("div", { className: "space-y-1.5" }, PERMS.map((pm) => {
          const on = !!draft.perms[pm.id];
          return h("button", { key: pm.id, disabled: draft.builtin,
            onClick: () => setDraft({ ...draft, perms: { ...draft.perms, [pm.id]: !on } }),
            className: "w-full text-left p-2.5 rounded-lg flex items-center gap-3",
            style: { background: on ? "rgba(180,140,40,.08)" : T.panel,
              border: "1px solid " + (on ? T.gold + "55" : T.hair),
              cursor: draft.builtin ? "default" : "pointer", opacity: draft.builtin && !on ? 0.5 : 1 } },
            h("span", { style: { width: 17, height: 17, borderRadius: 5, flexShrink: 0, display: "grid", placeItems: "center",
              background: on ? T.gold : "transparent", border: "1px solid " + (on ? T.gold : T.hair),
              color: "#04060D" } }, on ? h(Check, { size: 11 }) : null),
            h("div", { className: "flex-1 min-w-0" },
              h("div", { style: { fontSize: 14, color: T.text } }, pm.label),
              h("div", { className: "text-xs", style: { color: T.muted } }, pm.hint)));
        })),

        !draft.builtin ? h("div", { className: "mt-5 flex gap-2" },
          h(Btn, { tone: "solid", full: true, disabled: !draft.name.trim(), onClick: save }, "Save role"),
          h(Btn, { onClick: () => setDraft(null) }, "Cancel"))
          : h("div", { className: "mt-5" }, h(Btn, { full: true, onClick: () => setDraft(null) }, "Close"))) : null),

    h(Modal, { open: !!confirmDel, onClose: () => setConfirmDel(null) },
      h("div", { className: "p-6" },
        h("div", { style: { fontFamily: DISPLAY, fontSize: 19 } }, "Delete this role?"),
        h("p", { className: "mt-2 text-sm", style: { color: T.body } },
          confirmDel ? "Anyone with \u201C" + confirmDel.name + "\u201D becomes a Viewer. Nobody loses access." : ""),
        h("div", { className: "mt-5 flex gap-2" },
          h(Btn, { tone: "danger", full: true, onClick: () => remove(confirmDel) }, "Delete role"),
          h(Btn, { full: true, onClick: () => setConfirmDel(null) }, "Keep it")))));
}
