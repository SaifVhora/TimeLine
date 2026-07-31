import { h, useEffect, useRef } from "../react.js";
import { useT } from "./atoms.js";
import { BackStack } from "./gestures.js";

export function Modal(p) {
  const T = useT();
  const closeRef = useRef(p.onClose);
  closeRef.current = p.onClose;
  useEffect(() => {
    if (!p.open) return;
    return BackStack.push(() => { if (closeRef.current) closeRef.current(); return true; });
  }, [p.open]);
  if (!p.open) return null;
  return h("div", {
    className: "fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6",
    style: { background: "rgba(2,4,10,0.6)", backdropFilter: "blur(6px)", animation: "fadeIn .18s ease both" },
    onClick: p.onClose,
  }, h("div", {
    onClick: (e) => e.stopPropagation(),
    className: "w-full " + (p.wide ? "sm:max-w-2xl" : "sm:max-w-md") + " max-h-[92vh] overflow-y-auto",
    style: { background: T.sheet, border: "1px solid " + T.hair, borderRadius: 16,
      boxShadow: "0 30px 90px rgba(0,0,0,.45)", animation: "sheetIn .3s cubic-bezier(.2,.8,.25,1) both" },
  }, p.children));
}
