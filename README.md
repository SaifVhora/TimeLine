# Events Timeline — file map

Every file does one job. To change a feature, open the one file that owns it.

## Deploying
Upload `index.html`, `sw.js` and the whole `src/` folder to the repo root.
Change a file, upload that one file, reload — that's it. The service worker is
network-first for our own files, so you no longer need to bump a version number.

## Before you upload
Run `node tools/verify.mjs`. It loads every module against a stubbed browser and
checks the things that cause a white screen — missing imports, an icon that
doesn't exist, JSX that nothing compiles — plus the rules that matter (green only
ever means live, 12 AM stays midnight, cards never overlap, permissions hold).
Green means safe to upload. `tools/` is never served to the site.

## Where things live

| I want to change… | Open this |
|---|---|
| Firebase URL, event types, colour palette, roles | `src/config.js` |
| Colours, fonts, animations | `src/theme.js` |
| Icons | `src/icons.js` |
| Landing page (first screen) | `src/views/home.js` |
| Server picker (the star hub) | `src/views/hub.js` |
| Toolbar, search, filter, zoom | `src/views/timeline.js` |
| The line itself, month zoom | `src/timeline/line.js` |
| A single event on the line | `src/timeline/node.js` |
| Overlap rules + status colours | `src/timeline/lanes.js` |
| PNG export | `src/timeline/export.js` |
| New/edit event form | `src/events/editor.js` |
| Date picker, time input, host tags | `src/events/pickers.js` |
| Event details popup | `src/events/detail.js` |
| Discord copy text | `src/events/announce.js` |
| Admin panel, invites | `src/auth/admin.js` |
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
- **Green means "happening right now" and nothing else.** The type colours and
  the colour picker in `config.js` deliberately contain no greens, so a green
  glow on the line is always unambiguous.
- Old event types (lltvc, karaoke, gtac, chart, auction) map onto the new
  VC/Channel/Server set via `LEGACY_TYPE` in `config.js`. Nothing is lost.
