/* one shared "back" chain: open sheet → zoomed month → timeline → hub → home */
export const BackStack = {
  h: [],
  push(fn) { this.h.push(fn); return () => { const i = this.h.indexOf(fn); if (i >= 0) this.h.splice(i, 1); }; },
  pop() { for (let i = this.h.length - 1; i >= 0; i--) { try { if (this.h[i]()) return true; } catch (e) {} } return false; },
};
export function goBack() { if (!BackStack.pop()) window.dispatchEvent(new Event("et-back")); }

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
    if (t.clientX < 30) { sw = { x: t.clientX, y: t.clientY, t: Date.now() }; hint(t.clientY); } else sw = null;
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
    const fire = dx > 70 && dy < 70 && Date.now() - sw.t < 700;
    clearHint(fire);
    if (fire) goBack();
    sw = null;
  }, { passive: true });
  window.addEventListener("touchcancel", () => { sw = null; clearHint(false); }, { passive: true });
}
