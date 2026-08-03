/* The calendar month as an image — grid, event names, colours. */
import { DAY, MIN, startOfDay, sameDay, fmtTime } from "../lib/time.js";
import { evStart, evEnd, evColor, evShort, evHosts, isMultiDay, statusOf } from "../lib/events.js";
import { fmtD, fmtDay } from "../lib/time.js";

function roundRect(g, x, y, w, hgt, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(hgt) / 2);
  g.beginPath();
  g.moveTo(x + rr, y); g.lineTo(x + w - rr, y);
  g.quadraticCurveTo(x + w, y, x + w, y + rr);
  g.lineTo(x + w, y + hgt - rr);
  g.quadraticCurveTo(x + w, y + hgt, x + w - rr, y + hgt);
  g.lineTo(x + rr, y + hgt);
  g.quadraticCurveTo(x, y + hgt, x, y + hgt - rr);
  g.lineTo(x, y + rr);
  g.quadraticCurveTo(x, y, x + rr, y);
  g.closePath();
}
const clip = (g, text, maxW) => {
  let t = String(text || "");
  if (g.measureText(t).width <= maxW) return t;
  while (t.length > 1 && g.measureText(t + "\u2026").width > maxW) t = t.slice(0, -1);
  return t + "\u2026";
};

export async function exportCalendarPNG(opts) {
  const { serverName, monthStart, events, T, now } = opts;
  const showList = opts.showList !== false;      /* event names down the side */
  const showPast = opts.showPast !== false;      /* include finished events */
  const caption = (opts.caption || "").trim();
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) {}

  const SERIF = "Marcellus, Georgia, serif";
  const MONOF = "'JetBrains Mono', ui-monospace, Menlo, monospace";

  const cur = new Date(monthStart);
  const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 1).getTime();
  const daysIn = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
  const pad = (new Date(cur.getFullYear(), cur.getMonth(), 1).getDay() + 6) % 7;
  const rows = Math.ceil((pad + daysIn) / 7);

  const byDay = {};
  const forGrid = events.filter((ev) => showPast || statusOf(ev, now) !== "past");
  forGrid.forEach((ev) => {
    const s = startOfDay(evStart(ev)), e = evEnd(ev) - MIN;
    for (let t = s; t <= e; t += DAY) {
      if (t < monthStart || t >= monthEnd) continue;
      (byDay[startOfDay(t)] = byDay[startOfDay(t)] || []).push(ev);
    }
  });
  const inMonth = events
    .filter((ev) => evEnd(ev) > monthStart && evStart(ev) < monthEnd)
    .filter((ev) => showPast || statusOf(ev, now) !== "past")
    .sort((a, b) => evStart(a) - evStart(b));
  const total = inMonth.length;

  const CW = 190, CH = 132, GAP = 8, PADL = 56, HEAD = 168;
  const LISTW = showList ? 380 : 0;
  const gridW = CW * 7 + GAP * 6;
  const W = PADL * 2 + gridW + (showList ? LISTW + 34 : 0);
  const gridH = rows * (CH + GAP);
  const listH = showList ? 70 + inMonth.length * 74 : 0;
  const H = HEAD + Math.max(gridH, listH) + 84 + (caption ? 40 : 0);

  const S = 2;
  const c = document.createElement("canvas");
  c.width = W * S; c.height = H * S;
  const g = c.getContext("2d");
  g.scale(S, S);
  g.textBaseline = "top";

  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, T.inkA); bg.addColorStop(1, T.inkB);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);

  let seed = 424242;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  for (let i = 0; i < 500; i++) {
    g.globalAlpha = rnd() * 0.5 + 0.08;
    g.fillStyle = T.isDark ? "#fff" : "#5B6BFF";
    g.beginPath(); g.arc(rnd() * W, rnd() * H, rnd() * 1.4 + 0.3, 0, 7); g.fill();
  }
  g.globalAlpha = 1;

  const monthName = cur.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  g.fillStyle = T.text; g.font = "60px " + SERIF;
  g.fillText(monthName, PADL, 52);
  g.fillStyle = T.muted; g.font = "16px " + MONOF;
  g.fillText((serverName || "EVENTS").toUpperCase() + "  \u00B7  " + total + " EVENT" + (total === 1 ? "" : "S")
    + (showPast ? "" : "  \u00B7  UPCOMING ONLY"), PADL + 2, 124);
  if (caption) {
    g.fillStyle = T.body; g.font = "19px " + SERIF;
    g.fillText(caption, PADL + 2, 146);
  }

  const names = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  g.font = "13px " + MONOF; g.fillStyle = T.muted;
  names.forEach((n, i) => g.fillText(n, PADL + i * (CW + GAP) + 6, HEAD - 26));

  for (let d = 1; d <= daysIn; d++) {
    const idx = pad + d - 1;
    const col = idx % 7, row = Math.floor(idx / 7);
    const x = PADL + col * (CW + GAP);
    const y = HEAD + row * (CH + GAP);
    const date = new Date(cur.getFullYear(), cur.getMonth(), d);
    const key = startOfDay(date);
    const list = byDay[key] || [];
    const isToday = sameDay(date, now);

    g.fillStyle = list.length ? T.panel : "transparent";
    g.strokeStyle = isToday ? T.gold : T.hair;
    g.lineWidth = isToday ? 1.6 : 1;
    roundRect(g, x, y, CW, CH, 10);
    if (list.length) g.fill();
    g.stroke();

    g.fillStyle = isToday ? T.gold : T.body;
    g.font = "14px " + MONOF;
    g.fillText(String(d), x + 10, y + 9);

    let ty = y + 32;
    list.slice(0, 3).forEach((ev) => {
      const st = statusOf(ev, now);
      const color = st === "past" ? T.silver : evColor(ev);
      g.fillStyle = color; g.globalAlpha = st === "past" ? 0.55 : 1;
      roundRect(g, x + 9, ty + 3, 5, 5, 2); g.fill();
      g.globalAlpha = 1;
      g.fillStyle = st === "past" ? T.muted : T.text;
      g.font = "13px " + SERIF;
      g.fillText(clip(g, ev.title, CW - 34), x + 21, ty);
      ty += 18;
      if (!ev.allDay && list.length <= 2) {
        g.fillStyle = T.muted; g.font = "10px " + MONOF;
        g.fillText(fmtTime(ev.start), x + 21, ty);
        ty += 14;
      }
    });
    if (list.length > 3) {
      g.fillStyle = T.muted; g.font = "11px " + MONOF;
      g.fillText("+" + (list.length - 3) + " more", x + 10, y + CH - 22);
    }
  }

  /* ── event names down the side ── */
  if (showList) {
    const lx = PADL + gridW + 34;
    let ly = HEAD - 26;
    g.fillStyle = T.text; g.font = "24px " + SERIF;
    g.fillText("All of " + cur.toLocaleDateString(undefined, { month: "long" }), lx, ly);
    ly += 40;

    if (!inMonth.length) {
      g.fillStyle = T.muted; g.font = "15px " + MONOF;
      g.fillText("NOTHING THIS MONTH", lx, ly);
    }

    inMonth.forEach((ev) => {
      const st = statusOf(ev, now);
      const color = st === "past" ? T.silver : evColor(ev);
      const range = isMultiDay(ev) ? fmtD(evStart(ev)) + " \u2192 " + fmtD(evEnd(ev)) : fmtDay(evStart(ev));

      g.fillStyle = T.muted; g.font = "12px " + MONOF;
      g.fillText(range.toUpperCase(), lx, ly);
      ly += 18;

      g.fillStyle = color; g.globalAlpha = st === "past" ? 0.55 : 1;
      g.beginPath(); g.arc(lx + 4, ly + 9, 4.5, 0, 7); g.fill();
      g.globalAlpha = 1;

      g.fillStyle = st === "past" ? T.muted : T.text; g.font = "20px " + SERIF;
      g.fillText(clip(g, ev.title, LISTW - 26), lx + 18, ly);
      ly += 24;

      const hosts = evHosts(ev);
      const meta = evShort(ev) + (ev.allDay ? " \u00B7 ALL DAY" : " \u00B7 " + fmtTime(ev.start))
        + (hosts.length ? " \u00B7 " + hosts.join(", ") : "");
      g.fillStyle = T.muted; g.font = "12.5px " + MONOF;
      g.fillText(clip(g, meta, LISTW - 26), lx + 18, ly);
      ly += 32;
    });
  }

  g.fillStyle = T.muted; g.font = "13px " + MONOF;
  g.textAlign = "right";
  g.fillText("EVENTS TIMELINE \u2726", W - PADL, H - 46);
  g.textAlign = "left";

  const slug = (monthName + "-" + (serverName || "calendar")).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
