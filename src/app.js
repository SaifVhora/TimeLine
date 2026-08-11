import React, { h, useState, useEffect, useMemo, useCallback, useRef } from "./react.js";
import { THEME, BODY, DISPLAY, MONO, globalCSS } from "./theme.js";
import { ThemeCtx, useT, Btn } from "./ui/atoms.js";
import { installGestures, enterLevel, goBack } from "./ui/gestures.js";
import { Shield, Sun, Moon, RotateCw, ArrowLeft, LogOut, User, KeyRound, Sparkles, Hourglass, TextSize } from "./icons.js";
import { PASS_SALT } from "./config.js";
import { EMPTY, configured, normalize, mergeDB, readRemote, buildPatch, patchRemote, openStream, cache } from "./store/db.js";
import { maybeSnapshot } from "./store/backup.js";
import { computeAuth, canOpenAdmin } from "./auth/roles.js";
import { Gate, NameForm, JoinModal, SigninModal, ProfileModal } from "./auth/people.js";
import { Admin } from "./auth/admin.js";
import { Home } from "./views/home.js";
import { Hub } from "./views/hub.js";
import { ServerView } from "./views/server.js";
import { hashPass, newKey, uid, appLink } from "./lib/util.js";
import { nowISO, ago } from "./lib/time.js";
import { Setup } from "./views/setup.js";

export const BUILD = 28;



function SyncLine(p) {
  const T = useT();
  const map = {
    synced:  { dot: T.live,    text: (T.nova ? "Live \u00B7 synced " : "Synced ") + ago(p.lastSync) },
    syncing: { dot: T.current, text: "Syncing\u2026" },
    offline: { dot: T.gold,    text: "Offline \u00B7 retrying" },
  }[p.conn];
  return h("div", { className: "flex items-center gap-1.5",
    style: { fontFamily: MONO, fontSize: 9, color: T.muted, letterSpacing: "0.12em" } },
    h("span", { className: p.conn !== "synced" || T.nova ? "breathe" : "",
      style: { width: 5, height: 5, borderRadius: 5, background: map.dot, display: "inline-block",
        boxShadow: T.nova ? "0 0 8px " + map.dot : "none" } }),
    h("span", { style: { color: p.conn === "offline" ? T.gold : T.muted } }, map.text.toUpperCase()),
    h("span", { className: "hidden sm:inline" }, "\u00B7 " + p.count + " " + p.unit),
    h("span", null, "\u00B7 V" + BUILD));
}

function App() {
  const local = useRef(normalize(null));
  const dirty = useRef(false);
  const [db, setDb] = useState(() => cache.db() || normalize(null));
  const [me, setMe] = useState(null);
  /* Nova is the default look now; old saved prefs migrate to it once */
  const [mode, setMode] = useState(() => { const pf = cache.pref() || {}; return pf.v2 ? (pf.mode || "nova") : "nova"; });
  const [textSize, setTextSize] = useState(() => (cache.pref() || {}).textSize || 1);
  const [booted, setBooted] = useState(false);
  const [conn, setConn] = useState("syncing");
  const [lastSync, setLastSync] = useState(null);
  const [toast, setToast] = useState(null);
  const [now, setNow] = useState(Date.now());

  const [view, setView] = useState("home");
  const [serverId, setServerId] = useState(null);
  const [origin, setOrigin] = useState("50% 50%");
  const [showAdmin, setShowAdmin] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSignin, setShowSignin] = useState(false);

  const T = THEME[mode] || THEME.dark;

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  const ping = (msg, bad) => { setToast({ msg, bad }); setTimeout(() => setToast(null), 3200); };

  const sync = useCallback(async (announce) => {
    setConn("syncing");
    try {
      const remote = await readRemote();
      const merged = mergeDB(local.current, remote);
      local.current = merged; setDb(merged); cache.saveDb(merged);
      /* only the records that differ leave the device — never the whole DB */
      const patch = buildPatch(remote, merged);
      if (Object.keys(patch).length) await patchRemote(patch);
      dirty.current = false; setConn("synced"); setLastSync(Date.now());
      try { maybeSnapshot(merged); } catch (e) {}
      if (announce) ping("Everything is up to date");
      return true;
    } catch (e) {
      setConn("offline");
      if (announce) ping("Still offline \u2014 changes are saved here and go out on reconnect", true);
      return false;
    }
  }, []);

  /* realtime: the server pushes every change the moment it lands */
  useEffect(() => {
    if (!booted) return;
    const stream = openStream(
      (remote) => {
        const merged = mergeDB(local.current, remote);
        if (JSON.stringify(merged) !== JSON.stringify(local.current)) {
          local.current = merged; setDb(merged); cache.saveDb(merged);
        }
        setConn("synced"); setLastSync(Date.now());
      },
      (state) => { if (state === "down") sync(false); }
    );
    return () => stream && stream.close();
  }, [booted, sync]);

  useEffect(() => {
    const pf = cache.pref() || {};
    if (!pf.v2) cache.savePref({ v2: true, mode: "nova", textSize: pf.textSize || 1 });
    let mine = cache.me();
    if (!mine || !mine.key) mine = { name: (mine && mine.name) || "", key: newKey() };
    setMe(mine); cache.saveMe(mine);
    const cached = cache.db();
    if (cached) { local.current = cached; setDb(cached); }
    sync(false).finally(() => setBooted(true));
  }, [sync]);

  const auth = useMemo(() => computeAuth(db, me), [db, me]);

  /* the stream does the heavy lifting; this is just a safety-net reconcile */
  useEffect(() => {
    if (!booted) return;
    const gap = conn === "offline" ? 10000 : auth.state === "waiting" ? 15000 : 60000;
    const t = setInterval(() => sync(false), gap);
    return () => clearInterval(t);
  }, [booted, conn, auth.state, sync]);

  useEffect(() => {
    const back = () => sync(false);
    window.addEventListener("online", back);
    return () => window.removeEventListener("online", back);
  }, [sync]);

  const apply = async (fn, msg) => {
    const next = fn(JSON.parse(JSON.stringify(local.current)));
    local.current = next; setDb(next); cache.saveDb(next); dirty.current = true;
    const ok = await sync(false);
    if (msg) ping(ok ? msg : msg + " \u2014 saved here, waiting to sync", !ok);
  };
  const saveMe = (v) => { cache.saveMe(v); setMe(v); };

  const servers = useMemo(() => Object.values(db.servers).filter((s) => !s.deleted).sort((a, b) => a.name.localeCompare(b.name)), [db]);
  const allEvents = useMemo(() => Object.values(db.events).filter((e) => !e.deleted), [db]);
  const server = servers.find((s) => s.id === serverId);
  const pendingCount = db.access.pending.length;

  const enterServer = (s, pos) => {
    enterLevel();
    setOrigin(pos); setServerId(s.id); setView("zooming");
    setTimeout(() => setView("timeline"), 500);
  };
  const backToHub = () => { setView("leaving"); setTimeout(() => { setView("hub"); setServerId(null); }, 380); };
  const backToHome = () => setView("home");
  const openHub = () => { enterLevel(); setView("hub"); };

  /* back chain: timeline → hub → home, then the browser is free to leave */
  const viewRef = useRef(view);
  viewRef.current = view;
  useEffect(() => {
    installGestures(() => {
      const v = viewRef.current;
      if (v === "timeline" || v === "zooming") backToHub();
      else if (v === "hub") backToHome();
    });
  }, []);

  const signInWithPass = async (name, pass) => {
    await sync(false);
    const a = local.current.access;
    const hash = await hashPass(pass, PASS_SALT);
    const wanted = name.trim().toLowerCase();
    let hit = null, isOwner = false;
    if (a.ownerName && a.ownerName.toLowerCase() === wanted && a.ownerPassHash && a.ownerPassHash === hash) { hit = { owner: true }; isOwner = true; }
    if (!hit) {
      const mm = a.members.find((x) => x.passHash && x.passHash === hash && (x.name || "").toLowerCase() === wanted);
      if (mm) hit = mm;
    }
    if (!hit) return false;
    await apply((d) => {
      if (isOwner) d.access.ownerKey = me.key;
      else d.access.members = d.access.members.map((x) => (x.key === hit.key ? { ...x, key: me.key } : x));
      d.access.updatedAt = nowISO();
      return d;
    }, null);
    saveMe({ name: isOwner ? a.ownerName : hit.name, key: me.key, hasPass: true });
    ping("Welcome back");
    return true;
  };

  const saveProfile = async ({ name, pass, avatar }) => {
    const hash = pass ? await hashPass(pass, PASS_SALT) : undefined;
    await apply((d) => {
      if (auth.role === "owner") {
        if (name) d.access.ownerName = name.trim();
        if (typeof avatar !== "undefined") d.access.ownerAvatar = avatar;
        if (hash) d.access.ownerPassHash = hash;
      } else {
        d.access.members = d.access.members.map((x) => x.key === me.key
          ? { ...x, ...(name ? { name: name.trim() } : {}), ...(typeof avatar !== "undefined" ? { avatar } : {}), ...(hash ? { passHash: hash } : {}) }
          : x);
      }
      d.access.updatedAt = nowISO();
      return d;
    }, "Profile saved");
    saveMe({ ...me, ...(name ? { name: name.trim() } : {}), ...(hash ? { hasPass: true } : {}) });
  };

  const savePref = (patch) => cache.savePref({ v2: true, mode, textSize, ...patch });
  /* three looks now: classic dark → nova (the v2 sky) → light */
  const flip = () => {
    const order = ["dark", "nova", "light"];
    const next = order[(order.indexOf(mode) + 1) % order.length];
    setMode(next); savePref({ mode: next });
    ping(next === "nova" ? "Nova theme \u2014 the new sky" : next === "dark" ? "Classic dark" : "Light theme");
  };

  /* three text sizes — scales the whole interface, not just body copy */
  const STEPS = [1, 1.12, 1.28];
  const bumpText = () => {
    const next = STEPS[(STEPS.indexOf(textSize) + 1) % STEPS.length] || 1;
    setTextSize(next); savePref({ textSize: next });
    ping(next === 1 ? "Text size: normal" : next === 1.12 ? "Text size: large" : "Text size: largest");
  };
  useEffect(() => {
    try { document.documentElement.style.zoom = textSize === 1 ? "" : String(textSize); } catch (e) {}
  }, [textSize]);

  if (!booted || auth.state === "loading")
    return h(ThemeCtx.Provider, { value: T }, h(Gate, { T },
      h("div", { className: "text-center uppercase", style: { fontFamily: MONO, fontSize: 10, letterSpacing: "0.24em", color: T.muted } },
        "Charting the sky\u2026")));

  if (!db.access.ownerKey)
    return h(ThemeCtx.Provider, { value: T }, h(NameForm, {
      T, title: "Claim the constellation",
      blurb: "Nobody has opened this space before. Put your name down and it's yours \u2014 everyone after you needs your approval to get in.",
      cta: "Claim as owner", withPass: true,
      onDone: async (name, pass) => {
        const hash = pass ? await hashPass(pass, PASS_SALT) : "";
        apply((d) => {
          d.access = { ...EMPTY.access, ownerKey: me.key, ownerName: name, ownerPassHash: hash, link: appLink(), updatedAt: nowISO() };
          return d;
        }, "Constellation claimed");
        saveMe({ ...me, name, hasPass: !!pass });
      },
    }));

  const footerLeft = auth.registered
    ? h("span", { style: { fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em" } },
        String(me.name || "").toUpperCase() + " \u00B7 " + String(auth.roleName || auth.role).toUpperCase())
    : auth.state === "waiting"
      ? h("span", { className: "inline-flex items-center gap-1.5 breathe",
          style: { fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em", color: T.gold } },
          h(Hourglass, { size: 10 }), " WAITING FOR APPROVAL \u00B7 " + String(me.name || "").toUpperCase())
      : auth.state === "denied"
        ? h("span", { style: { fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em" } }, "REQUEST DECLINED \u00B7 VIEWING AS GUEST")
        : h("span", { style: { fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em" } }, "VIEWING AS GUEST \u00B7 READ ONLY");

  return h(ThemeCtx.Provider, { value: T },
    h("div", { className: "flex flex-col", style: { height: "100dvh", color: T.text, fontFamily: BODY, background: T.canvas, overflow: "hidden" } },
      h("style", null, globalCSS(T)),

      h("header", { className: "shrink-0 z-30 px-4 sm:px-7 py-3 flex items-center gap-2.5",
        style: { background: T.bar, backdropFilter: "blur(12px)", borderBottom: "1px solid " + T.hair } },
        view === "timeline" ? h(Btn, { size: "sm", onClick: goBack, title: "Back to the hub" }, h(ArrowLeft, { size: 13 })) : null,
        view === "hub" ? h(Btn, { size: "sm", onClick: goBack, title: "Back to the start" }, h(ArrowLeft, { size: 13 })) : null,
        h("div", { className: "flex-1 min-w-0" },
          h("div", { className: "truncate", style: { fontFamily: DISPLAY, fontSize: 18, letterSpacing: "0.03em" } },
            view === "timeline" && server ? server.name : "Events Timeline"),
          h(SyncLine, { conn, lastSync,
            count: view === "timeline" ? allEvents.filter((e) => e.serverId === serverId).length : servers.length,
            unit: view === "timeline" ? "EVENTS" : "SERVERS" })),
        h(Btn, { size: "sm", onClick: bumpText, title: "Text size" },
          h(TextSize, { size: 13 }),
          textSize !== 1 ? h("span", { style: { fontFamily: MONO, fontSize: 8, marginLeft: 2 } },
            textSize === 1.12 ? "L" : "XL") : null),
        h(Btn, { size: "sm", onClick: flip, title: "Switch theme" }, mode === "dark" ? h(Sparkles, { size: 13 }) : mode === "nova" ? h(Sun, { size: 13 }) : h(Moon, { size: 13 })),
        h(Btn, { size: "sm", onClick: () => sync(true), title: "Sync" }, h(RotateCw, { size: 13, className: conn === "syncing" ? "spin" : "" })),
        canOpenAdmin(auth) ? h("div", { className: "relative" },
          h(Btn, { size: "sm", onClick: () => setShowAdmin(true), title: "Admin" }, h(Shield, { size: 13 })),
          pendingCount > 0 && auth.members ? h("span", { className: "absolute -top-1 -right-1 flex items-center justify-center breathe",
            style: { background: T.gold, color: "#04060D", borderRadius: 9, minWidth: 15, height: 15, fontSize: 9, fontFamily: MONO } },
            pendingCount) : null) : null),

      h("main", { className: "flex-1 min-h-0 relative" },
        view === "home" ? h("div", { className: "absolute inset-0 fadein" },
          h(Home, { servers, events: allEvents, now, registered: auth.registered, myName: me.name,
            onEnter: openHub })) : null,

        view === "hub" || view === "zooming" ? h("div", { className: "absolute inset-0",
          style: { transform: view === "zooming" ? "scale(2.1)" : "scale(1)", opacity: view === "zooming" ? 0 : 1,
            transformOrigin: origin, transition: "transform .5s cubic-bezier(.3,.7,.3,1), opacity .5s ease", willChange: "transform, opacity" } },
          h(Hub, { servers, events: allEvents, onEnter: enterServer, canManage: auth.servers,
            onCreate: (name) => apply((d) => { const id = uid();
              d.servers[id] = { id, name, createdAt: nowISO(), updatedAt: nowISO() }; return d; }, "Server added to the constellation"),
            onRemove: (id) => apply((d) => {
              if (d.servers[id]) d.servers[id] = { ...d.servers[id], deleted: true, updatedAt: nowISO() }; return d; }, "Server removed") })) : null,

        (view === "timeline" || view === "leaving") && server
          ? h("div", { className: "absolute inset-0 flex flex-col " + (view === "leaving" ? "" : "fadein"),
              style: { opacity: view === "leaving" ? 0 : 1, transition: "opacity .35s ease" } },
              h(ServerView, { server, db, apply, now, auth, me, ping }))
          : null),

      h("footer", { className: "shrink-0 px-4 sm:px-7 py-2 flex items-center gap-2 text-xs flex-wrap",
        style: { color: T.muted, borderTop: "1px solid " + T.hair } },
        footerLeft,
        !auth.registered && auth.state !== "waiting"
          ? h(Btn, { size: "sm", tone: "gold", onClick: () => setShowJoin(true) }, h(Sparkles, { size: 11 }), " Join the team") : null,
        !auth.registered
          ? h(Btn, { size: "sm", onClick: () => setShowSignin(true) }, h(KeyRound, { size: 11 }), " Sign in") : null,
        auth.state === "waiting"
          ? h(Btn, { size: "sm", onClick: () => sync(true) }, h(RotateCw, { size: 11, className: conn === "syncing" ? "spin" : "" }), " Check") : null,
        auth.registered ? h(Btn, { size: "sm", onClick: () => setShowProfile(true) }, h(User, { size: 11 }), " Profile") : null,
        auth.registered ? h("button", { className: "ml-auto inline-flex items-center gap-1",
          style: { color: T.muted, background: "none", border: "none", cursor: "pointer" },
          onClick: () => saveMe({ name: "", key: newKey() }) }, h(LogOut, { size: 11 }), " Sign out") : null),

      toast ? h("div", { className: "fixed bottom-12 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rise text-sm",
        style: { background: T.solidBtn, color: T.solidInk, borderRadius: 10, maxWidth: "90vw", boxShadow: "0 10px 40px rgba(0,0,0,.4)" } },
        toast.msg) : null,

      h(Admin, { open: showAdmin, onClose: () => setShowAdmin(false), access: db.access, db, apply, ping, auth }),

      h(JoinModal, { open: showJoin, onClose: () => setShowJoin(false), denied: auth.state === "denied",
        onDone: async (name, pass) => {
          const hash = pass ? await hashPass(pass, PASS_SALT) : "";
          apply((d) => {
            d.access.pending = [...d.access.pending.filter((x) => x.key !== me.key), { key: me.key, name, passHash: hash, at: nowISO() }];
            d.access.denied = d.access.denied.filter((k) => k !== me.key);
            d.access.updatedAt = nowISO(); return d;
          }, "Request sent \u2014 you can keep browsing while you wait");
          saveMe({ ...me, name, hasPass: !!pass });
          setShowJoin(false);
        } }),

      h(SigninModal, { open: showSignin, onClose: () => setShowSignin(false), onSignin: signInWithPass }),

      h(ProfileModal, { open: showProfile, onClose: () => setShowProfile(false), me, access: db.access, role: auth.role, onSave: saveProfile })));
}

const root = window.ReactDOM.createRoot(document.getElementById("root"));
root.render(h(configured ? App : Setup, { T: THEME.dark }));
const boot = document.getElementById("boot-msg");
if (boot) boot.remove();
