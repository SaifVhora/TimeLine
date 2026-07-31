import { h } from "../react.js";
import { DISPLAY } from "../theme.js";

export const AV_COLORS = ["#8B7BFF", "#35D6C0", "#E8C87A", "#FF9F6B", "#FF7BD5", "#6BE3B8", "#7BC5FF", "#C3CEE3"];
export const AV_SYMBOLS = ["\u2726", "\u2605", "\u2666", "\u26A1", "\u2660", "\u2744", "\u263E", "\u273F", "\u266B", "\u2615"];

export function avatarFor(name, avatar) {
  const seed = (name || "?").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    color: (avatar && avatar.color) || AV_COLORS[seed % AV_COLORS.length],
    emoji: (avatar && avatar.emoji) || (name || "?").trim().charAt(0).toUpperCase() || "?",
  };
}

export function Avatar(p) {
  const a = avatarFor(p.name, p.avatar);
  const s = p.size || 34;
  return h("div", { style: { width: s, height: s, borderRadius: "50%", background: a.color + "22",
    border: "1px solid " + a.color + "66", color: a.color, display: "grid", placeItems: "center",
    fontFamily: DISPLAY, fontSize: s * 0.42, flexShrink: 0 } }, a.emoji);
}
