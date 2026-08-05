/* Winner announcement graphic — a square-ish card built for posting in Discord. */
import { fmtDay, fmtTime } from "../lib/time.js";
import { evColor, evShort, evHosts, evWinners, evResultText } from "../lib/events.js";

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
function wrap(g, text, maxW, maxLines) {
  const words = String(text || "").split(/\s+/);
  const out = []; let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (g.measureText(test).width > maxW && cur) { out.push(cur); cur = w; if (out.length === maxLines) break; }
    else cur = test;
  }
  if (out.length < maxLines && cur) out.push(cur);
  return out;
}

export async function exportWinnerPNG(opts) {
  const { ev, T, serverName } = opts;
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) {}

  const SERIF = "Marcellus, Georgia, serif";
  const MONOF = "'JetBrains Mono', ui-monospace, Menlo, monospace";
  const accent = opts.color || evColor(ev);
  const heading = (opts.heading || "WINNERS").toUpperCase();
  const note = (opts.note || "").trim();
  const showHosts = opts.showHosts !== false;
  const showDate = opts.showDate !== false;

  const places = evWinners(ev);
  const text = evResultText(ev);
  const rows = places.length ? places.slice(0, 6) : [];

  const W = 1000;
  const bodyH = rows.length ? rows.length * 104 : (text ? 150 : 90);
  const H = 300 + bodyH + (note ? 80 : 0) + 90;

  const S = 2;
  const c = document.createElement("canvas");
  c.width = W * S; c.height = H * S;
  const g = c.getContext("2d");
  g.scale(S, S);
  g.textBaseline = "top";

  /* backdrop */
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, T.inkA); bg.addColorStop(1, T.inkB);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);

  const glow = g.createRadialGradient(W / 2, 150, 0, W / 2, 150, 620);
  glow.addColorStop(0, accent + (T.isDark ? "33" : "22"));
  glow.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = glow; g.fillRect(0, 0, W, H);

  let seed = 99991;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  for (let i = 0; i < 420; i++) {
    g.globalAlpha = rnd() * 0.5 + 0.08;
    g.fillStyle = T.isDark ? "#fff" : "#5B6BFF";
    g.beginPath(); g.arc(rnd() * W, rnd() * H, rnd() * 1.5 + 0.3, 0, 7); g.fill();
  }
  g.globalAlpha = 1;

  /* header */
  g.textAlign = "center";
  g.fillStyle = accent; g.font = "18px " + MONOF;
  g.fillText(heading.split("").join(" "), W / 2, 62);

  g.fillStyle = T.text; g.font = "58px " + SERIF;
  const titleLines = wrap(g, ev.title || "Event", W - 160, 2);
  let y = 104;
  titleLines.forEach((ln) => { g.fillText(ln, W / 2, y); y += 62; });

  g.fillStyle = T.muted; g.font = "16px " + MONOF;
  const bits = [evShort(ev)];
  if (showDate) bits.push(fmtDay(ev.start).toUpperCase() + (ev.allDay ? "" : " \u00B7 " + fmtTime(ev.start).toUpperCase()));
  if (showHosts && evHosts(ev).length) bits.push("HOSTED BY " + evHosts(ev).join(", "));
  g.fillText(clip(g, bits.join("  \u00B7  "), W - 120), W / 2, y + 6);
  y += 46;

  /* divider */
  g.strokeStyle = accent; g.globalAlpha = 0.5; g.lineWidth = 1;
  g.beginPath(); g.moveTo(W / 2 - 90, y + 12); g.lineTo(W / 2 + 90, y + 12); g.stroke();
  g.globalAlpha = 1;
  y += 44;

  g.textAlign = "left";
  const MEDAL = ["\uD83E\uDD47", "\uD83E\uDD48", "\uD83E\uDD49"];

  if (rows.length) {
    rows.forEach((w, i) => {
      const place = Number(w.place || i + 1);
      const top = place <= 3;
      const x = 110, cw = W - 220;

      g.fillStyle = top ? accent + "1f" : T.panel;
      g.strokeStyle = top ? accent + "66" : T.hair;
      g.lineWidth = 1;
      roundRect(g, x, y, cw, 86, 14); g.fill(); g.stroke();

      g.textAlign = "center";
      if (top) { g.font = "34px " + SERIF; g.fillText(MEDAL[place - 1], x + 46, y + 24); }
      else { g.fillStyle = T.muted; g.font = "20px " + MONOF; g.fillText(String(place).padStart(2, "0"), x + 46, y + 32); }

      g.textAlign = "left";
      g.fillStyle = T.text; g.font = (top ? "34px " : "28px ") + SERIF;
      g.fillText(clip(g, w.name, cw - 260), x + 86, y + (w.score || w.prize ? 16 : 26));

      if (w.score || w.prize) {
        g.fillStyle = T.muted; g.font = "15px " + MONOF;
        g.fillText(clip(g, [w.score, w.prize].filter(Boolean).join("  \u00B7  "), cw - 260), x + 88, y + 54);
      }
      y += 104;
    });
  } else if (text) {
    g.textAlign = "center";
    g.fillStyle = T.text; g.font = "30px " + SERIF;
    wrap(g, text, W - 220, 3).forEach((ln) => { g.fillText(ln, W / 2, y); y += 42; });
    g.textAlign = "left";
    y += 20;
  } else {
    g.textAlign = "center";
    g.fillStyle = T.muted; g.font = "22px " + SERIF;
    g.fillText("No results recorded yet", W / 2, y + 20);
    g.textAlign = "left";
    y += 80;
  }

  if (note) {
    g.textAlign = "center";
    g.fillStyle = T.body; g.font = "22px " + SERIF;
    g.fillText(clip(g, note, W - 180), W / 2, y + 14);
    g.textAlign = "left";
    y += 70;
  }

  g.textAlign = "center";
  g.fillStyle = T.muted; g.font = "14px " + MONOF;
  g.fillText((serverName || "EVENTS TIMELINE").toUpperCase() + "  \u2726", W / 2, H - 52);
  g.textAlign = "left";

  const slug = ((ev.title || "winners") + "-winners").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
