import { h, useState, useEffect } from "../react.js";
import { DISPLAY, BODY, MONO } from "../theme.js";
import { useT, useInput, Btn, Label, Field, ThemeCtx } from "../ui/atoms.js";
import { Modal } from "../ui/modal.js";
import { Stars } from "../ui/stars.js";
import { Eye, EyeOff, Sparkles, X, BadgeCheck } from "../icons.js";
import { fingerprint } from "../lib/util.js";
import { Avatar, avatarFor, AV_COLORS, AV_SYMBOLS } from "./avatar.js";

export function PassField(p) {
  const T = useT();
  const input = useInput();
  const [show, setShow] = useState(false);
  return h("div", { className: "relative" },
    h("input", { style: { ...input, paddingRight: 40 }, type: show ? "text" : "password",
      value: p.value, onChange: (e) => p.onChange(e.target.value), placeholder: p.placeholder }),
    h("button", { onClick: () => setShow((s) => !s), type: "button",
      style: { position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
        background: "none", border: "none", color: T.muted, cursor: "pointer", padding: 4 } },
      show ? h(EyeOff, { size: 15 }) : h(Eye, { size: 15 })));
}

export function Gate(p) {
  const T = p.T;
  return h("div", { className: "min-h-screen flex items-center justify-center p-8 relative overflow-hidden",
    style: { background: T.canvas, color: T.text, fontFamily: BODY } },
    h("div", { className: "absolute inset-0 pointer-events-none" }, h(Stars, { width: 1200, height: 860, T, density: 11 })),
    h("div", { className: "w-full max-w-sm relative" }, p.children));
}

export function NameForm(p) {
  const T = p.T;
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const inputStyle = { width: "100%", background: T.field, border: "1px solid " + T.hair, borderRadius: 10,
    padding: "11px 12px", color: T.text, fontFamily: BODY, fontSize: 15, outline: "none", textAlign: "center" };
  return h(Gate, { T },
    h("div", { className: "mb-6 flex justify-center" },
      h("div", { className: "relative", style: { width: 60, height: 60 } },
        h("div", { className: "core absolute", style: { inset: -20, borderRadius: "50%",
          background: "radial-gradient(closest-side, " + T.bloom + ", transparent)" } }),
        h(Sparkles, { size: 22, style: { color: T.current, position: "absolute", left: 19, top: 19 } }))),
    h("div", { className: "text-center", style: { fontFamily: DISPLAY, fontSize: 27, lineHeight: 1.25 } }, p.title),
    h("p", { className: "mt-3 mb-6 text-sm text-center", style: { color: T.body } }, p.blurb),
    h("div", { className: "space-y-2.5" },
      h("input", { value: name, onChange: (e) => setName(e.target.value.slice(0, 32)), placeholder: "Your name",
        onKeyDown: (e) => { if (e.key === "Enter" && name.trim()) p.onDone(name.trim(), pass); }, style: inputStyle }),
      p.withPass ? h("input", { value: pass, type: "password", onChange: (e) => setPass(e.target.value),
        placeholder: "Set a passphrase (so you can sign in anywhere)", style: { ...inputStyle, fontSize: 14 } }) : null,
      h(ThemeCtx.Provider, { value: T },
        h(Btn, { tone: "solid", full: true, disabled: !name.trim() || (p.withPass && pass.length > 0 && pass.length < 6),
          onClick: () => p.onDone(name.trim(), pass) }, p.cta)),
      p.withPass ? h("div", { className: "text-xs text-center", style: { color: T.muted } },
        "Optional but recommended \u2014 without one, clearing your browser locks you out.") : null));
}

export function JoinModal(p) {
  const T = useT();
  const input = useInput();
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  useEffect(() => { if (p.open) { setName(""); setPass(""); } }, [p.open]);
  return h(Modal, { open: p.open, onClose: p.onClose },
    h("div", { className: "p-6 text-center" },
      h("div", { className: "mb-4 flex justify-center" },
        h("div", { className: "relative", style: { width: 52, height: 52 } },
          h("div", { className: "core absolute", style: { inset: -16, borderRadius: "50%",
            background: "radial-gradient(closest-side, " + T.bloom + ", transparent)" } }),
          h(Sparkles, { size: 20, style: { color: T.current, position: "absolute", left: 16, top: 16 } }))),
      h("div", { style: { fontFamily: DISPLAY, fontSize: 23 } }, "Join the team"),
      h("p", { className: "mt-2 mb-5 text-sm", style: { color: T.body } },
        p.denied ? "Your last request was declined, but you can ask again."
                 : "Add the name your team knows you by. An admin approves it \u2014 you can keep browsing while you wait."),
      h("input", { value: name, onChange: (e) => setName(e.target.value.slice(0, 32)), placeholder: "Your name",
        style: { ...input, textAlign: "center", fontSize: 15 } }),
      h("input", { value: pass, type: "password", onChange: (e) => setPass(e.target.value),
        placeholder: "Passphrase (optional, recommended)", className: "mt-2", style: { ...input, textAlign: "center" } }),
      h("div", { className: "mt-2 text-xs", style: { color: T.muted } },
        "A passphrase lets you sign back in after a browser reset or on a new device."),
      h("div", { className: "mt-3 flex gap-2" },
        h(Btn, { tone: "solid", full: true, disabled: !name.trim() || (pass.length > 0 && pass.length < 6),
          onClick: () => p.onDone(name.trim(), pass) }, "Send request"),
        h(Btn, { full: true, onClick: p.onClose }, "Not now"))));
}

export function SigninModal(p) {
  const T = useT();
  const input = useInput();
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (p.open) { setName(""); setPass(""); setErr(""); } }, [p.open]);
  const go = async () => {
    setBusy(true); setErr("");
    const ok = await p.onSignin(name, pass);
    setBusy(false);
    if (ok) p.onClose(); else setErr("No match. Check your name and passphrase, or ask an admin to re-add you.");
  };
  return h(Modal, { open: p.open, onClose: p.onClose },
    h("div", { className: "p-6" },
      h("div", { className: "flex items-center justify-between mb-1" },
        h("div", { style: { fontFamily: DISPLAY, fontSize: 21 } }, "Sign in"),
        h("button", { onClick: p.onClose, style: { color: T.muted, background: "none", border: "none", cursor: "pointer" } }, h(X, { size: 19 }))),
      h("p", { className: "text-sm mb-5", style: { color: T.body } },
        "Already set a passphrase? Enter your name and passphrase to pick your account back up on this device."),
      h("div", { className: "space-y-2.5" },
        h("input", { style: input, value: name, onChange: (e) => setName(e.target.value), placeholder: "Your name" }),
        h(PassField, { value: pass, onChange: setPass, placeholder: "Passphrase" })),
      err ? h("div", { className: "mt-2 text-xs", style: { color: T.danger } }, err) : null,
      h("div", { className: "mt-5 flex gap-2" },
        h(Btn, { tone: "solid", full: true, disabled: busy || !name.trim() || !pass, onClick: go }, busy ? "Checking\u2026" : "Sign in"),
        h(Btn, { onClick: p.onClose }, "Cancel"))));
}

export function ProfileModal(p) {
  const T = useT();
  const input = useInput();
  const mine = p.role === "owner"
    ? { name: p.access.ownerName, avatar: p.access.ownerAvatar, passHash: p.access.ownerPassHash }
    : (p.access.members || []).find((x) => x.key === p.me.key) || { name: p.me.name };
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!p.open) return;
    setName(mine.name || p.me.name || "");
    setAvatar(mine.avatar || avatarFor(mine.name || p.me.name));
    setP1(""); setP2("");
  }, [p.open]);
  if (!p.open) return null;
  const hasPass = !!mine.passHash;
  const passErr = p1 && p1 !== p2 ? "Passphrases don't match" : p1 && p1.length < 6 ? "Use at least 6 characters" : "";
  const cur = avatar || avatarFor(name);
  const save = async () => {
    if (passErr) return;
    setBusy(true);
    await p.onSave({ name, avatar, pass: p1 || undefined });
    setBusy(false); p.onClose();
  };
  return h(Modal, { open: p.open, onClose: p.onClose },
    h("div", { className: "p-6" },
      h("div", { className: "flex items-center justify-between mb-4" },
        h("div", { style: { fontFamily: DISPLAY, fontSize: 21 } }, "Your profile"),
        h("button", { onClick: p.onClose, style: { color: T.muted, background: "none", border: "none", cursor: "pointer" } }, h(X, { size: 19 }))),
      h("div", { className: "flex items-center gap-3 mb-5" },
        h(Avatar, { name, avatar: cur, size: 54 }),
        h("div", null,
          h("div", { style: { fontFamily: DISPLAY, fontSize: 18 } }, name || "Unnamed"),
          h("div", { style: { fontFamily: MONO, fontSize: 9.5, color: T.muted, letterSpacing: "0.12em" } },
            String(p.role).toUpperCase() + " \u00B7 DEVICE " + fingerprint(p.me.key)))),
      h(Field, { label: "Display name" },
        h("input", { style: input, value: name, onChange: (e) => setName(e.target.value.slice(0, 32)), placeholder: "Your name" })),
      h("div", { className: "mt-4" }, h(Label, null, "Avatar colour"),
        h("div", { className: "flex gap-1.5 flex-wrap" },
          AV_COLORS.map((c) => h("button", { key: c, onClick: () => setAvatar((a) => ({ ...avatarFor(name, a), color: c })),
            style: { width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer",
              border: cur.color === c ? "2px solid " + T.text : "2px solid transparent" } })))),
      h("div", { className: "mt-4" }, h(Label, null, "Avatar symbol"),
        h("div", { className: "flex gap-1.5 flex-wrap" },
          [((name || "?").trim().charAt(0).toUpperCase() || "?")].concat(AV_SYMBOLS).map((em, i) =>
            h("button", { key: i, onClick: () => setAvatar((a) => ({ ...avatarFor(name, a), emoji: em })),
              style: { width: 30, height: 30, borderRadius: 8, cursor: "pointer", fontFamily: DISPLAY, fontSize: 14,
                background: cur.emoji === em ? T.panel : "transparent", color: T.text,
                border: "1px solid " + (cur.emoji === em ? T.gold + "66" : T.hair) } }, em)))),
      h("div", { className: "mt-5 pt-4", style: { borderTop: "1px solid " + T.hair } },
        h(Label, null, hasPass ? "Change passphrase" : "Set a passphrase (optional)"),
        h("div", { className: "text-xs mb-2", style: { color: T.muted } },
          hasPass ? "Leave blank to keep your current one."
                  : "Without one, clearing your browser loses this device's identity. Set one and you can always sign back in."),
        h("div", { className: "space-y-2" },
          h(PassField, { value: p1, onChange: setP1, placeholder: hasPass ? "New passphrase" : "Passphrase" }),
          p1 ? h(PassField, { value: p2, onChange: setP2, placeholder: "Repeat it" }) : null),
        passErr ? h("div", { className: "mt-1.5 text-xs", style: { color: T.danger } }, passErr) : null),
      h("div", { className: "mt-6 flex gap-2" },
        h(Btn, { tone: "solid", full: true, disabled: busy || !!passErr || !name.trim(), onClick: save }, busy ? "Saving\u2026" : "Save profile"),
        h(Btn, { onClick: p.onClose }, "Cancel"))));
}
