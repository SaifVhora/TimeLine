/* Month → PNG. Rewritten: waits for fonts, draws at 2x, lays cards out properly. */
import { DAY, fmtTime } from "../lib/time.js";
import { evStart, evEnd, evShort, evColor, evRange, evHosts, statusOf } from "../lib/events.js";
import { statusColors } from "./lanes.js";

function roundRect(g, x, y, w, hgt, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(hgt) / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.lineTo(x + w - rr, y);
  g.quadraticCurveTo(x + w, y, x + w, y + rr);
  g.lineTo(x + w, y + hgt - rr);
  g.quadraticCurveTo(x + w, y + hgt, x + w - rr, y + hgt);
  g.lineTo(x + rr, y + hgt);
  g.quadraticCurveTo(x, y + hgt, x, y + hgt - rr);
  g.lineTo(x, y + rr);
  g.quadraticCurveTo(x, y, x + rr, y);
  g.closePath();
}

function wrap(g, text, maxW, maxLines) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (g.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; if (lines.length === maxLines) break; }
    else cur = test;
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (g.measureText(last + "\u2026").width > maxW && last.length > 1) last = last.slice(0, -1);
    if (words.join(" ") !== lines.join(" ")) lines[maxLines - 1] = last + "\u2026";
  }
  return lines;
}

export async function exportMonthPNG(opts) {
  const { serverName, monthStart, monthEnd, events, T, now } = opts;
  const showPast = opts.showPast !== false;
  const caption = (opts.caption || "").trim();
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) {}

  const SERIF = "Marcellus, Georgia, 'Times New Roman', serif";
  const MONOF = "'JetBrains Mono', ui-monospace, Menlo, monospace";

  const items = events
    .filter((e) => evEnd(e) > monthStart && evStart(e) < monthEnd)
    .filter((e) => showPast || statusOf(e, now) !== "past")
    .sort((a, b) => evStart(a) - evStart(b));

  const days = Math.max(1, Math.round((monthEnd - monthStart) / DAY));
  const PPD = Math.max(74, Math.min(150, Math.round(1500 / days)));
  const PADL = 120;
  const CARDW = 210, CARDH = 128, GAP = 16;

  const xOf = (t) => PADL + ((Math.min(Math.max(t, monthStart), monthEnd) - monthStart) / DAY) * PPD;
  const W = PADL * 2 + days * PPD;

  /* lay cards out first so we know how tall the image must be */
  const sides = { top: [], bot: [] };
  const order = [["top", 0], ["bot", 0], ["top", 1], ["bot", 1], ["top", 2], ["bot", 2], ["top", 3], ["bot", 3]];
  const free = (sd, ln, x) => (sides[sd][ln] === undefined ? -1e9 : sides[sd][ln]) <= x - (CARDW + 10);
  const seq = items.map((ev, i) => ({ ev, i })).sort((a, b) => {
    const pa = a.ev.side === "top" || a.ev.side === "bot" ? 0 : 1;
    const pb = b.ev.side === "top" || b.ev.side === "bot" ? 0 : 1;
    return pa - pb || a.i - b.i;
  });
  const placed = new Array(items.length);
  seq.forEach((entry) => {
    const ev = entry.ev, x = xOf(evStart(ev));
    const pin = ev.side === "top" || ev.side === "bot" ? ev.side : null;
    let side, lane, ok = false;
    if (pin) {
      for (let ln = 0; ln < 8; ln++) if (free(pin, ln, x)) { side = pin; lane = ln; ok = true; break; }
      if (!ok) { side = pin; lane = sides[pin].length; }
    } else {
      for (const pair of order) if (free(pair[0], pair[1], x)) { side = pair[0]; lane = pair[1]; ok = true; break; }
      if (!ok) { side = sides.top.length <= sides.bot.length ? "top" : "bot"; lane = sides[side].length; }
    }
    sides[side][lane] = x + CARDW + 10;
    placed[entry.i] = { ev, x, side, lane };
  });
  const topLanes = Math.max(1, sides.top.length), botLanes = Math.max(1, sides.bot.length);
  const ARM0 = 74;
  const topH = ARM0 + topLanes * (CARDH + GAP) + 150;
  const botH = ARM0 + botLanes * (CARDH + GAP) + 110;
  const H = Math.max(720, topH + botH);
  const LY = topH;

  const S = 2;                                  /* draw at 2x for a crisp image */
  const c = document.createElement("canvas");
  c.width = W * S; c.height = H * S;
  const g = c.getContext("2d");
  g.scale(S, S);
  g.textBaseline = "top";

  /* background */
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, T.inkA); bg.addColorStop(1, T.inkB);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const halo = g.createRadialGradient(W / 2, LY, 0, W / 2, LY, Math.max(W, H) * 0.55);
  halo.addColorStop(0, T.isDark ? "rgba(90,120,255,.16)" : "rgba(120,140,255,.12)");
  halo.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = halo; g.fillRect(0, 0, W, H);

  let seed = 20260727;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  for (let i = 0; i < Math.min(900, Math.round(W / 3)); i++) {
    g.globalAlpha = rnd() * 0.55 + 0.08;
    g.fillStyle = T.isDark ? "#fff" : "#5B6BFF";
    g.beginPath(); g.arc(rnd() * W, rnd() * H, rnd() * 1.5 + 0.35, 0, 7); g.fill();
  }
  g.globalAlpha = 1;

  /* heading */
  const monthName = new Date(monthStart).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  g.fillStyle = T.text; g.font = "62px " + SERIF;
  g.fillText(monthName, 62, 52);
  g.fillStyle = T.muted; g.font = "16px " + MONOF;
  g.fillText((serverName || "EVENTS").toUpperCase() + "  \u00B7  " + items.length + " EVENT" + (items.length === 1 ? "" : "S")
    + (showPast ? "" : "  \u00B7  UPCOMING ONLY"), 64, 128);
  if (caption) {
    g.fillStyle = T.body; g.font = "19px " + SERIF;
    g.fillText(caption, 64, 150);
  }

  /* day ticks */
  for (let i = 0; i <= days; i++) {
    const x = PADL + i * PPD;
    const monday = new Date(monthStart + i * DAY).getDay() === 1;
    g.strokeStyle = T.silver; g.globalAlpha = monday ? 0.5 : 0.22; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, LY - (monday ? 18 : 10)); g.lineTo(x, LY + (monday ? 18 : 10)); g.stroke();
    g.globalAlpha = 1;
    if (i < days) {
      g.fillStyle = T.muted; g.font = "13px " + MONOF; g.textAlign = "center";
      g.fillText(String(i + 1).padStart(2, "0"), x + PPD / 2, LY + 24);
      g.textAlign = "left";
    }
  }

  /* the glowing line */
  g.save();
  g.shadowColor = T.current; g.shadowBlur = 30;
  g.strokeStyle = T.current; g.lineWidth = 3; g.globalAlpha = 0.95;
  g.beginPath(); g.moveTo(40, LY); g.lineTo(W - 40, LY); g.stroke();
  g.restore(); g.globalAlpha = 1;

  /* multi-day bands */
  const bandLanes = []; const OFFS = [-14, 14, -24, 24, -34, 34];
  items.forEach((ev) => {
    const x1 = xOf(evStart(ev)), x2 = xOf(evEnd(ev));
    if (x2 - x1 < 20) return;
    let lane = bandLanes.findIndex((e) => e <= x1 - 8);
    if (lane === -1) { lane = bandLanes.length; bandLanes.push(0); }
    bandLanes[lane] = x2;
    const off = OFFS[lane % OFFS.length];
    const st = statusOf(ev, now);
    const col = st === "past" ? T.silver : evColor(ev);
    g.save();
    if (st !== "past") { g.shadowColor = col; g.shadowBlur = 16; }
    g.globalAlpha = st === "past" ? 0.4 : 0.9;
    const grad = g.createLinearGradient(x1, 0, x2, 0);
    grad.addColorStop(0, col); grad.addColorStop(1, col + "44");
    g.fillStyle = grad;
    roundRect(g, x1, LY + off - 4, x2 - x1, 8, 4); g.fill();
    g.restore(); g.globalAlpha = 1;
    g.fillStyle = col; g.globalAlpha = 0.85;
    g.fillRect(x2 - 1.5, LY + off - 8, 2, 16);
    g.globalAlpha = 1;
  });

  /* cards */
  placed.forEach(({ ev, x, side, lane }) => {
    const up = side === "top";
    const arm = ARM0 + lane * (CARDH + GAP);
    const st = statusOf(ev, now);
    const cols = statusColors(st, T, evColor(ev));
    const col = cols.stroke;

    g.strokeStyle = col; g.globalAlpha = st === "past" ? 0.4 : 0.75; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(x, LY); g.lineTo(x, up ? LY - arm : LY + arm); g.stroke();
    g.globalAlpha = 1;

    g.save(); g.translate(x, LY); g.rotate(Math.PI / 4);
    if (cols.glow) { g.shadowColor = cols.star; g.shadowBlur = 18; }
    g.fillStyle = cols.star; g.fillRect(-6, -6, 12, 12);
    g.restore();

    const cx = x + 14;
    let ty = up ? LY - arm - CARDH + 6 : LY + arm + 10;

    g.save();
    g.globalAlpha = st === "past" ? 0.5 : 1;

    g.fillStyle = T.panel; g.strokeStyle = T.hair; g.lineWidth = 1;
    roundRect(g, cx - 10, ty - 10, CARDW, CARDH, 12); g.fill(); g.stroke();

    g.fillStyle = cols.head; g.font = "13px " + MONOF;
    g.fillText((evShort(ev) + (ev.allDay ? " \u00B7 ALL DAY" : " \u00B7 " + fmtTime(ev.start)) + (st === "live" ? " \u00B7 LIVE" : "")).slice(0, 30), cx, ty);
    ty += 22;

    g.fillStyle = T.text; g.font = "22px " + SERIF;
    wrap(g, ev.title || "Untitled", CARDW - 26, 2).forEach((ln) => { g.fillText(ln, cx, ty); ty += 26; });

    ty += 2;
    g.fillStyle = T.muted; g.font = "12.5px " + MONOF;
    g.fillText(evRange(ev), cx, ty); ty += 18;

    const hosts = evHosts(ev);
    if (hosts.length) { g.fillText(wrap(g, "BY " + hosts.join(", "), CARDW - 26, 1)[0] || "", cx, ty); ty += 18; }

    const win = (ev.winners || []).find((w) => w.name);
    if (win) { g.fillStyle = T.gold; g.fillText(("01  " + win.name).slice(0, 26), cx, ty); }

    g.restore();
  });

  /* now marker */
  if (now >= monthStart && now <= monthEnd) {
    const x = xOf(now);
    g.save(); g.shadowColor = T.gold; g.shadowBlur = 14;
    g.strokeStyle = T.gold; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(x, LY - 60); g.lineTo(x, LY + 60); g.stroke();
    g.fillStyle = T.gold; g.beginPath(); g.arc(x, LY, 5.5, 0, 7); g.fill();
    g.restore();
    g.fillStyle = T.gold; g.font = "13px " + MONOF;
    g.fillText("NOW", x + 10, LY - 78);
  }

  if (!items.length) {
    g.fillStyle = T.muted; g.font = "26px " + SERIF; g.textAlign = "center";
    g.fillText("Nothing on the line this month", W / 2, LY + 70);
    g.textAlign = "left";
  }

  g.fillStyle = T.muted; g.font = "13px " + MONOF; g.textAlign = "right";
  g.fillText("EVENTS TIMELINE \u2726", W - 46, H - 48);
  g.textAlign = "left";

  const slug = (monthName + "-" + (serverName || "timeline")).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return new Promise((resolve) => {
    c.toBlob((blob) => {
      if (!blob) { resolve(false); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = slug + ".png";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      resolve(true);
    }, "image/png");
  });
}
