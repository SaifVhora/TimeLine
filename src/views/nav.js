import { h } from "../react.js";
import { MONO } from "../theme.js";
import { useT } from "../ui/atoms.js";

export const PAGES = [
  { id: "now", label: "now" },
  { id: "timeline", label: "timeline" },
  { id: "calendar", label: "calendar" },
  { id: "archive", label: "archive" },
  { id: "standings", label: "standings" },
];

export function Nav(p) {
  const T = useT();
  return h("div", { className: "shrink-0 px-4 sm:px-7 pt-2.5 pb-1 overflow-x-auto scroller" },
    h("div", { className: "flex items-center gap-5", style: { width: "max-content", minWidth: "100%" } },
      PAGES.map((pg) => {
        const on = p.page === pg.id;
        const badge = pg.id === "now" ? p.todo : 0;
        return h("button", { key: pg.id, onClick: () => p.onGo(pg.id),
          className: "relative pb-1.5",
          style: { background: "none", border: "none", cursor: "pointer", padding: "0 0 6px",
            fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.16em",
            color: on ? T.text : T.muted, transition: "color .18s ease", whiteSpace: "nowrap" } },
          pg.label,
          badge > 0 ? h("span", { style: { marginLeft: 6, padding: "1px 5px", borderRadius: 8,
            background: "rgba(180,140,40,.16)", color: T.gold, fontSize: 8.5, letterSpacing: "0.06em" } }, badge) : null,
          h("span", { style: { position: "absolute", left: 0, bottom: 0, height: 1,
            width: on ? "100%" : 0, background: T.current, opacity: on ? 0.9 : 0,
            transition: "width .22s cubic-bezier(.2,.8,.25,1), opacity .18s ease" } }));
      })));
}
