/* one shared "back" chain: open sheet → zoomed month → timeline → hub → home */
export const BackStack = {
  h: [],
  push(fn) { this.h.push(fn); return () => { const i = this.h.indexOf(fn); if (i >= 0) this.h.splice(i, 1); }; },
  pop() { for (let i = this.h.length - 1; i >= 0; i--) { try { if (this.h[i]()) return true; } catch (e) {} } return false; },
};
let lastBack = 0;
/* A single swipe can reach us twice — once from our own touch handler and once
   from the browser's popstate. Collapse anything within 400ms into one step. */
export function goBack() {
  const now = Date.now();
  if (now - lastBack < 400) return;
  lastBack = now;
  if (!BackStack.pop()) window.dispatchEvent(new Event("et-back"));
}

/* The phone's own edge-swipe fires the browser's back navigation, which used to
   unload the page — and a reload always lands on the home screen. So we keep a
   spare history entry: the browser's back pops it, we handle it ourselves, and
   push it straight back. Only when there's nothing left to go back to do we let
   the browser actually leave. */
export function installHistoryTrap(isAtRoot) {
  if (window.__etHistory) return;
  window.__etHistory = true;
  try { history.replaceState({ et: "root" }, ""); history.pushState({ et: "trap" }, ""); } catch (e) { return; }
  window.addEventListener("popstate", () => {
    if (isAtRoot && isAtRoot()) return;              /* home screen — let them leave */
    try { history.pushState({ et: "trap" }, ""); } catch (e) {}
    goBack();
  });
}

export function installGestures() {
  if (window.__etGestures) return;
  window.__etGestures = true;

  /* keyboard — Escape, or double-tap Backspace, never while typing */
  let lastBS = 0;
  window.addEventListener("keydown", (e) => {
    const t = e.target;
    const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
    if (e.key === "Escape") { e.preventDefault(); goBack(); return; }
    if (e.key === "Backspace" && !typing) {
      const n = Date.now();
      if (n - lastBS < 450) { lastBS = 0; e.preventDefault(); goBack(); } else lastBS = n;
    }
  });

  /* touch — swipe in from the left edge, with a chevron that follows your thumb */
  let sw = null, hintEl = null;
  const hint = (y) => {
    hintEl = document.createElement("div");
    hintEl.textContent = "\u2039";
    hintEl.style.cssText = "position:fixed;left:6px;top:" + (y - 22) + "px;z-index:9999;font:300 44px Georgia,serif;color:#E8C87A;pointer-events:none;text-shadow:0 0 14px rgba(232,200,122,.6);";
    document.body.appendChild(hintEl);
  };
  const clearHint = (fire) => {
    if (!hintEl) return;
    if (fire) hintEl.style.animation = "swipeHint .25s ease both";
    const el = hintEl; hintEl = null;
    setTimeout(() => { try { el.remove(); } catch (e) {} }, fire ? 260 : 0);
  };
  window.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    if (t.clientX < 44) { sw = { x: t.clientX, y: t.clientY, t: Date.now() }; hint(t.clientY); } else sw = null;
  }, { passive: true });
  window.addEventListener("touchmove", (e) => {
    if (!sw || !hintEl) return;
    const t = e.touches[0];
    hintEl.style.left = Math.min(6 + (t.clientX - sw.x) * 0.4, 46) + "px";
  }, { passive: true });
  window.addEventListener("touchend", (e) => {
    if (!sw) { clearHint(false); return; }
    const t = e.changedTouches[0];
    const dx = t.clientX - sw.x, dy = Math.abs(t.clientY - sw.y);
    const fire = dx > 60 && dy < 80 && Date.now() - sw.t < 900;
    clearHint(fire);
    if (fire) goBack();
    sw = null;
  }, { passive: true });
  window.addEventListener("touchcancel", () => { sw = null; clearHint(false); }, { passive: true });
}
