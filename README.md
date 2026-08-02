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
