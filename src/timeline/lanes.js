/* keeps cards and bands from ever sitting on top of each other */

/* cards alternate above/below the line, spilling outward when it gets busy */
export function layoutCards(items, xOf, x2Of, cardW) {
  const sides = { top: [], bot: [] };
  const order = [["top", 0], ["bot", 0], ["top", 1], ["bot", 1], ["top", 2], ["bot", 2], ["top", 3], ["bot", 3]];
  return items.map((ev) => {
    const x = xOf(ev), x2 = x2Of(ev);
    let side = "top", lane = 0, placed = false;
    for (const [sd, ln] of order) {
      if ((sides[sd][ln] === undefined ? -1e9 : sides[sd][ln]) <= x - cardW) { side = sd; lane = ln; placed = true; break; }
    }
    if (!placed) { side = sides.top.length <= sides.bot.length ? "top" : "bot"; lane = sides[side].length; }
    sides[side][lane] = x + cardW;
    return { ev, x, x2, side, lane };
  });
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
