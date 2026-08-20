# TimeLine V29 — upload

**8 new files, 13 changed.** The zip unpacks flat — `index.html`, `sw.js`,
`src/`, `tools/` are all at the top level, ready to drop straight in.

## Desktop upload

1. Unzip it.
2. On github.com/SaifVhora/TimeLine → **Add file → Upload files**.
3. Open the unzipped folder, select **everything inside it** (Ctrl+A), and drag
   that into the browser. Don't drag the folder itself — that would nest
   everything one level deep.
4. Commit to `main`. Cloudflare picks it up automatically.
5. Wait a minute, then hard-refresh (Ctrl+Shift+R).

GitHub preserves folder structure on desktop drag, so `src/lib/webhooks.js`
and the rest land in the right place on their own.

## What changed

**New:** `src/lib/templates.js`, `src/lib/chart-points.js`,
`src/lib/webhooks.js`, `src/lib/reminders.js`, `src/events/chart-calc.js`,
`src/events/templates-modal.js`, `src/auth/webhooks-panel.js`,
`src/store/use-reminders.js`

**Also new:** `tools/smoke.mjs` (render test, see below)

**Changed:** `index.html`, `sw.js`, `src/app.js`, `src/config.js`,
`src/store/db.js`, `src/views/server.js`, `src/events/editor.js`,
`src/events/detail.js`, `src/events/break-editor.js`, `src/lib/breaks.js`,
`src/lib/recur.js`, `src/auth/admin.js`, `tools/verify.mjs`

---

## After it deploys

1. **Admin panel → Channels** — connect a webhook, hit Test. You should get a
   message in that Discord channel. Reminders and posting do nothing until
   this is done.
2. Open any event → **When** tab → reminder chips should be there.
3. Open any event → **Results** tab → "Score a chat chart".
4. Tap **Add** on the timeline — the template picker appears once you've saved
   at least one template.

If anything looks off, run `node tools/verify.mjs` from the repo — 71 checks,
faster than clicking around.

There's also `tools/smoke.mjs`, which actually mounts the app in a fake browser
and catches blank-screen crashes that verify can't see (verify only reads code,
it never runs it). It needs three packages that aren't in the repo:

    npm i --no-save jsdom react@18 react-dom@18
    node tools/smoke.mjs

Worth running before any big upload.

## Worth knowing

- **Reminders only fire while a staff tab is open.** There's no server. If
  every staff member closes the app, nothing posts. A reminder missed by more
  than 10 minutes is skipped rather than posted late.
- **Webhook URLs are visible to anyone who can manage servers.** Holding one
  lets you post to that channel — nothing more, no read access. Regenerate in
  Discord if one leaks.
- **@everyone is disabled** on anything TimeLine posts. User pings still work.
- **Templates and webhooks share one record** with the staff list, which is
  last-write-wins. Two people editing those at the same moment can lose one
  change. Events don't have this problem — they merge per-id.
