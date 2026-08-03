/* Back navigation.

   Everything funnels through the browser's own history: each level you go into
   (a server, a zoomed month, an open sheet) pushes one entry, and every way of
   going back — the phone's edge swipe, the browser button, Escape, our own back
   arrows — ends up as a single popstate that we handle. That keeps the depth
   honest, so you can never be thrown off the site while there's still something
   to go back to. */

let suppress = 0;          /* entries we're removing ourselves, not user navigation */
const consumed = new Set(); /* handlers whose level a real back already used up */

function pushLevel() { try { history.pushState({ et: Date.now() }, ""); } catch (e) {} }

export const BackStack = {
  h: [],
  /* register something closeable — returns a remover for when it closes itself */
  push(fn) {
    this.h.push(fn);
    pushLevel();
    return () => {
      const i = this.h.indexOf(fn);
      if (i >= 0) this.h.splice(i, 1);
      /* If a real back already spent this level, the entry is gone — cleanup
         runs afterwards in React, so we can't rely on a synchronous flag. */
      if (consumed.has(fn)) { consumed.delete(fn); return; }
      if (i < 0) return;
      suppress++;
      try { history.back(); } catch (e) { suppress--; }
    };
  },
  pop() {
    for (let i = this.h.length - 1; i >= 0; i--) {
      const fn = this.h[i];
      try {
        if (fn()) {
          consumed.add(fn);          /* its history entry is spent */
          this.h.splice(i, 1);
          return true;
        }
      } catch (e) {}
    }
    return false;
  },
};

/* the app calls this when moving deeper: home → hub → timeline */
export function enterLevel() { pushLevel(); }

/* every back button in the app calls this — never navigate directly */
export function goBack() { try { history.back(); } catch (e) {} }

export function installGestures(onViewBack) {
  if (window.__etGestures) return;
  window.__etGestures = true;

  try { history.replaceState({ et: "root" }, ""); } catch (e) {}

  window.addEventListener("popstate", () => {
    if (suppress > 0) { suppress--; return; }   /* our own tidy-up, ignore */
    const handled = BackStack.pop();            /* close a sheet or a zoomed month */
    if (!handled) onViewBack();                 /* otherwise move back a screen */
  });

  /* keyboard: Escape, or double-tap Backspace — never while typing */
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

  /* No custom touch handler. Phones already turn an edge swipe into a back
     navigation, which arrives here as popstate — handling it twice was what
     made a swipe from anywhere on the screen appear to go back. */
}
