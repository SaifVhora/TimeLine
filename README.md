# Events Timeline — file map

Every file does one job. To change a feature, open the one file that owns it.

## Deploying
Upload `index.html`, `sw.js` and the whole `src/` folder to the repo root.
When you change **any** file, bump the version number at the top of `sw.js`
(`events-timeline-v6` → `v7`) so browsers pick up the new copy.

## Where things live

| I want to change… | Open this |
|---|---|
| Firebase URL, event types, colour palette, roles | `src/config.js` |
| Colours, fonts, animations | `src/theme.js` |
| Icons | `src/icons.js` |
| Landing page (first screen) | `src/views/home.js` |
| Server picker (the star hub) | `src/views/hub.js` |
| Page nav (now/timeline/calendar/…) | `src/views/nav.js` |
| Server container, editor/detail wiring | `src/views/server.js` |
| Timeline toolbar, search, filter, zoom | `src/views/timeline.js` |
| "Now" page — what needs doing | `src/views/now.js` + `src/lib/todo.js` |
| Calendar month grid | `src/views/calendar.js` |
| Archive (searchable list) | `src/views/archive.js` |
| Standings / leaderboard | `src/views/standings.js` + `src/lib/standings.js` |
| The line itself, month zoom | `src/timeline/line.js` |
| A single event on the line | `src/timeline/node.js` |
| Overlap rules + status colours | `src/timeline/lanes.js` |
| PNG export | `src/timeline/export.js` |
| New/edit event form | `src/events/editor.js` |
| Date picker, time input, host tags | `src/events/pickers.js` |
| Event details popup | `src/events/detail.js` |
| Discord copy text | `src/events/announce.js` |
| Admin panel, invites | `src/auth/admin.js` |
| Backups, restore, trash | `src/auth/data-tab.js` |
| Snapshot + backup file logic | `src/store/backup.js` |
| Join / sign in / profile | `src/auth/people.js` |
| Who can do what | `src/auth/roles.js` |
| Create/edit roles | `src/auth/roles-tab.js` |
| The list of powers | `src/config.js` (PERMS) |
| Avatars | `src/auth/avatar.js` |
| Saving + syncing | `src/store/db.js` |
| Buttons, fields, toggles | `src/ui/atoms.js` |
| Popups | `src/ui/modal.js` |
| Back gestures (Esc, swipe) | `src/ui/gestures.js` |
| Starfield | `src/ui/stars.js` |
| Dates & times maths | `src/lib/time.js` |
| Reading an event record | `src/lib/events.js` |
| App shell, header, footer, routing | `src/app.js` |

## Notes
- No build step. Files are served as-is; edit one, upload one.
- `src/lib/events.js` decides live / soon / past. `statusColors` in
  `src/timeline/lanes.js` turns that into colours (green live, yellow soon,
  dull with a white star once it's over).
- Old event types (lltvc, karaoke, gtac, chart, auction) map onto the new
  VC/Channel/Server set via `LEGACY_TYPE` in `config.js`. Nothing is lost.


## Data safety (added in round 1)

Admin panel → **Data** tab.

- **Save a copy** downloads the whole timeline as a `.json` file. Keep one
  somewhere safe — it's the only copy that survives the database being wiped.
- **Snapshots** are taken automatically after syncs (max 12, at most one every
  20 minutes) and live in *your browser*, not the database. They survive a wipe
  but not clearing browser data.
- **Restore** always shows a before/after count and warns if the backup has
  fewer events than the live timeline. A snapshot of the current state is taken
  automatically before any restore, so a restore can itself be undone.
- **Recently deleted** lists deleted events and servers with a Restore button.
  Deletes were already soft — this just surfaces them. "Empty the trash" is the
  only truly permanent action in the app.


## Pages (added in round 2)

Inside a server, a thin nav row switches between five views of the same data:

- **now** — what's live, what's on today and this week, plus finished events with
  no results logged and upcoming events with no host. The number beside "now" is
  how many things need attention. `buildTodo` in `src/lib/todo.js` decides that;
  it stops nagging about missing results after 60 days.
- **timeline** — the original horizontal line, unchanged.
- **calendar** — month grid. A dot per event, a yellow marker on days with more
  than one (clash warning), tap a day to see it or add an event on it.
- **archive** — search across titles, hosts, winners, notes and channels;
  filter by type and finished/upcoming; grouped by month.
- **standings** — aggregated from placements, hosting and participation.
  Points: win 5, second 3, third 2, other placement 1, hosting 2. Names are
  matched case-insensitively and `@name` is treated as `name`.

The editor and detail popups live in `src/views/server.js`, so every page can
open and edit events.


## Roles and powers (round 3)

Eight powers, defined in `PERMS` in `src/config.js`: add events, edit any event,
edit own events, delete events, manage servers, approve people, manage roles,
backups & restore.

Three built-in roles (Admin / Editor / Viewer) can't be edited or deleted.
Admin panel → **Roles** creates your own: name, colour, and any mix of powers.
Deleting a custom role drops its holders to Viewer — nobody ever loses access.

Per-person overrides still work and now sit *on top of* the role, storing only
the differences. Change someone's role and their overrides reset.

`canEditEvent(auth, ev, me)` handles "edit own events" — events record
`createdBy` (device key) when first saved.

## The back-gesture fix

A phone's edge-swipe triggers the browser's own back navigation, which unloaded
the page — and a reload always lands on the home screen. `installHistoryTrap`
in `src/ui/gestures.js` keeps a spare history entry so the browser's back is
caught, handled by the app's own back chain, and the entry pushed straight back.
Only on the home screen is the browser allowed to actually leave.


## Pinning an event above or below the line

Editor → What → **Where it sits on the line**: Auto / Above / Below.

Auto is the default and does what it always did — alternates sides so nothing
overlaps. Pin an event and it always renders on that side; `layoutCards` in
`src/timeline/lanes.js` places pinned events first so they claim the lane
nearest the line, and auto events fill in around them. Pinned events that clash
stack outward on their own side rather than jumping across. The PNG export uses
the same rule, so an exported month matches what you see.

## Round 2 — the big overhaul (v24)

**Speed**
- Tailwind is now compiled into `src/tw.css` — the in-browser compiler is gone.
  If you add a brand-new Tailwind class the file doesn't know, either add the
  style inline or re-run: `npx tailwindcss -i tw-in.css -o src/tw.css --minify`
  (plain CSS edits never need this).
- `index.html` preloads every module in parallel — no more waterfall.
- The starfield is one canvas instead of ~240 animated elements, pauses when
  the tab is hidden, and respects reduced-motion.

**Realtime (free)**
- The app now listens to Firebase over a live stream (`openStream` in
  `src/store/db.js`). Changes appear on everyone's screen the moment they're
  saved. Polling remains only as a slow safety net.
- Saves send ONLY the records that changed (`buildPatch` + `patchRemote`) —
  never the whole database. Two people editing different events can't wipe
  each other any more, and it uses far less of the free-plan bandwidth.

**Themes**
- Three now: classic dark → **Nova** (the new sky: aurora accents, comet on
  the line) → light. The header button cycles through them.

**Security**
- Paste `firebase-rules.json` into Firebase console → Realtime Database →
  Rules. It blocks writes outside the app's shape and stops the whole tree
  being overwritten in one shot. For a full lock-down you'd add Firebase
  Auth later — happy to wire that when you want it.

**Housekeeping**
- 31 dead imports removed across 15 files.
- The hub → server zoom is a smoother, GPU-friendly scale instead of the old
  scale(7) jump. Service worker bumped to v24 and now refreshes CSS too.

## Round 3 — Nova is now a full look, not just colours
In the Nova theme: the hub becomes a grid of glass cards with orb glows and a
live badge per server, timeline events render as lifting glass cards (live
ones get a glowing border and a progress shimmer), the NOW beacon pulses an
expanding ring, the home title gets the aurora gradient, and the sync dot
glows "LIVE · SYNCED". Classic dark and light are untouched — cycle themes
with the header button. (sw bumped to v25.)

## Round 4 — cursor displacement fix (v27)
Text size uses CSS zoom, and browsers disagree on whether
`getBoundingClientRect()` is reported in zoomed or unzoomed pixels. The
timeline's crosshair mixed the two, so at Large/XL text the marker sat up to
~84px away from the actual cursor (and drag-panning ran at the wrong speed).
`src/timeline/line.js` now measures the real scale from painted width vs
layout width and converts pointer coords into the scroller's own space — self-
correcting on every browser, at any text size or browser zoom. The hub's
zoom-in origin is now measured from the pressed card for the same reason.
