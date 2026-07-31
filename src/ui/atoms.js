import { h, createContext, useContext } from "../react.js";
import { THEME, BODY, MONO } from "../theme.js";

export const ThemeCtx = createContext(THEME.dark);
export const useT = () => useContext(ThemeCtx);

export function useInput() {
  const T = useT();
  return { width: "100%", background: T.field, border: "1px solid " + T.hair, borderRadius: 10,
    padding: "10px 12px", color: T.text, fontFamily: BODY, fontSize: 14, outline: "none" };
}

export function Btn(p) {
  const T = useT();
  const tones = {
    solid:  { background: T.solidBtn, color: T.solidInk, borderColor: "transparent" },
    gold:   { background: "rgba(180,140,40,.13)", color: T.gold, borderColor: "rgba(180,140,40,.38)" },
    quiet:  { background: "transparent", color: T.text, borderColor: T.hair },
    danger: { background: "rgba(210,60,80,.1)", color: T.danger, borderColor: "rgba(210,60,80,.32)" },
  };
  const sizes = { sm: "px-2.5 py-1.5 text-xs", md: "px-3.5 py-2 text-sm", lg: "px-5 py-3 text-base" };
  const tone = p.tone || "quiet", size = p.size || "md";
  return h("button", {
    onClick: p.onClick, disabled: p.disabled, title: p.title,
    className: sizes[size] + " " + (p.full ? "w-full " : "") + "inline-flex items-center justify-center gap-2 select-none active:scale-95",
    style: { fontFamily: BODY, fontWeight: 500, borderRadius: 10, border: "1px solid", transition: "all .15s ease",
      opacity: p.disabled ? 0.35 : 1, cursor: p.disabled ? "not-allowed" : "pointer", whiteSpace: "nowrap", ...tones[tone], ...(p.style || {}) },
  }, p.children);
}

export function Label(p) {
  const T = useT();
  return h("div", { className: "mb-1.5 uppercase",
    style: { fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.18em", color: T.muted } }, p.children);
}

export function Field(p) {
  const T = useT();
  return h("label", { className: "block" },
    h(Label, null, p.label),
    p.children,
    p.hint ? h("div", { className: "mt-1.5 text-xs", style: { color: T.muted } }, p.hint) : null);
}

export function Toggle(p) {
  const T = useT();
  return h("button", {
    onClick: () => p.onChange(!p.on),
    className: "flex items-center gap-2.5",
    style: { background: "none", border: "none", cursor: "pointer", padding: 0 },
  },
    h("span", { style: { width: 34, height: 20, borderRadius: 20, position: "relative", flexShrink: 0,
      transition: "background .2s", background: p.on ? T.gold : T.hair, display: "inline-block" } },
      h("span", { style: { position: "absolute", top: 2, left: p.on ? 16 : 2, width: 16, height: 16,
        borderRadius: 16, background: p.on ? "#04060D" : T.muted, transition: "left .2s" } })),
    h("span", { className: "text-sm", style: { color: T.text, fontFamily: BODY, textAlign: "left" } }, p.label));
}

export function Chip(p) {
  const T = useT();
  const col = p.color || T.gold;
  return h("button", {
    onClick: p.onClick,
    className: "px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1.5",
    style: { fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.08em", cursor: "pointer",
      border: "1px solid " + (p.on ? col + "88" : T.hair),
      background: p.on ? col + "1a" : "transparent", color: p.on ? col : T.muted },
  }, p.children);
}
