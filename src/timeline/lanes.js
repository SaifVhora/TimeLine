/* keeps cards and bands from ever sitting on top of each other */

/* Cards alternate above/below the line, spilling outward when it gets busy.
   An event can pin itself with ev.side = "top" | "bot"; anything else is auto. */
export function layoutCards(items, xOf, x2Of, cardW) {
  const sides = { top: [], bot: [] };
  const autoOrder = [["top", 0], ["bot", 0], ["top", 1], ["bot", 1], ["top", 2], ["bot", 2], ["top", 3], ["bot", 3]];
  const free = (sd, ln, x) => (sides[sd][ln] === undefined ? -1e9 : sides[sd][ln]) <= x - cardW;

  /* pinned events claim their lane first so they always land where they were told */
  const order = items.map((ev, i) => ({ ev, i }))
    .sort((a, b) => {
      const pa = a.ev.side === "top" || a.ev.side === "bot" ? 0 : 1;
      const pb = b.ev.side === "top" || b.ev.side === "bot" ? 0 : 1;
      return pa - pb || a.i - b.i;
    });

  const out = new Array(items.length);
  order.forEach(({ ev, i }) => {
    const x = xOf(ev), x2 = x2Of(ev);
    const pinned = ev.side === "top" || ev.side === "bot" ? ev.side : null;
    let side, lane, placed = false;

    if (pinned) {
      for (let ln = 0; ln < 8; ln++) if (free(pinned, ln, x)) { side = pinned; lane = ln; placed = true; break; }
      if (!placed) { side = pinned; lane = sides[pinned].length; }
    } else {
      for (const [sd, ln] of autoOrder) if (free(sd, ln, x)) { side = sd; lane = ln; placed = true; break; }
      if (!placed) { side = sides.top.length <= sides.bot.length ? "top" : "bot"; lane = sides[side].length; }
    }

    sides[side][lane] = x + cardW;
    out[i] = { ev, x, x2, side, lane, pinned: !!pinned };
  });
  return out;
}

/* multi-day bands stack outward from the line, alternating sides */
export function layoutBands(nodes, minWidth) {
  const laneEnds = [];
  const OFF = [-11, 11, -19, 19, -27, 27, -35, 35];
  return nodes.filter((n) => n.x2 - n.x >= (minWidth || 16)).map((n) => {
    let lane = laneEnds.findIndex((e) => e <= n.x - 6);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
    laneEnds[lane] = n.x2;
    return { ...n, off: OFF[lane % OFF.length] };
  });
}

/* one place that decides what colour a status is */
export function statusColors(status, T, baseColor) {
  if (status === "live") return { stroke: T.live, head: T.live, star: T.live, glow: true, dim: 1 };
  if (status === "soon") return { stroke: T.soon, head: T.soon, star: T.soon, glow: true, dim: 1 };
  if (status === "past") return { stroke: T.silver, head: T.muted, star: T.current, glow: false, dim: 0.5 };
  return { stroke: baseColor, head: baseColor, star: baseColor, glow: true, dim: 0.95 };
}
