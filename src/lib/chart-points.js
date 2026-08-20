/* Chat chart scoring.
   You set the points. A scheme is an ordered list of point values — the first
   number is what 1st place earns, the second is 2nd, and so on. Anyone charting
   below the end of the list earns the tail value (0 by default).

   The scheme lives on the event, so two chart events can score differently and
   an old event always keeps the rules it was actually judged under. */

export const DEFAULT_SCHEME = {
  points: [10, 7, 5, 3, 2],
  tail: 0,          /* what everyone past the list gets */
  minMessages: 0,   /* chart below this and you score nothing at all */
};

export const blankScheme = () => ({ ...DEFAULT_SCHEME, points: [...DEFAULT_SCHEME.points] });

export const schemeOf = (ev) => {
  const s = (ev && ev.chartScheme) || {};
  return {
    points: Array.isArray(s.points) && s.points.length ? s.points.map(num) : [...DEFAULT_SCHEME.points],
    tail: num(s.tail),
    minMessages: num(s.minMessages),
  };
};

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

/* points for a given placement, 1-indexed */
export function pointsForRank(scheme, rank) {
  const s = scheme || DEFAULT_SCHEME;
  if (rank < 1) return 0;
  return rank <= s.points.length ? num(s.points[rank - 1]) : num(s.tail);
}

/* Turn a pasted chart into scored rows.
   Accepts the shapes people actually paste:
     "1. Saif — 412"      "Saif: 412"      "Saif 412"      "412 Saif"
   Ties on message count share the better rank and both get its points. */
export function parseChart(text) {
  const rows = [];
  (text || "").split(/\r?\n/).forEach((raw) => {
    const line = raw.trim();
    if (!line) return;
    /* Drop a leading rank marker — we recompute rank ourselves. Only strip when
       it's unambiguous: "1." / "2)" / "3 -" carry punctuation, and "#4" carries
       a hash. A bare leading number is left alone, because "95 Meera" is a
       message count, not a placing. */
    const body = line
      .replace(/^#\s*\d+\s*[.)\]:\u2014\u2013-]?\s+/, "")
      .replace(/^\d+\s*[.)\]:]\s+/, "")
      .trim();
    /* the message count is the last standalone number on the line */
    const m = body.match(/^(.*?)[\s:\u2014\u2013,-]+([\d,]+)\s*(?:messages?|msgs?|msg)?$/i)
           || body.match(/^([\d,]+)[\s:\u2014\u2013,-]+(.*)$/);
    if (!m) return;
    let name, count;
    if (/^[\d,]+$/.test(m[1])) { count = m[1]; name = m[2]; } else { name = m[1]; count = m[2]; }
    name = (name || "").replace(/[\u2014\u2013:,\s-]+$/, "").trim();
    const n = Number(String(count).replace(/,/g, ""));
    if (!name || !Number.isFinite(n)) return;
    rows.push({ name, messages: n });
  });
  return rows;
}

export function scoreChart(rows, scheme) {
  const s = scheme || DEFAULT_SCHEME;
  const sorted = [...(rows || [])].sort((a, b) => b.messages - a.messages);

  let rank = 0;
  let lastCount = null;
  let seen = 0;

  return sorted.map((r) => {
    seen++;
    /* standard competition ranking: ties share a rank, the next one skips */
    if (lastCount === null || r.messages !== lastCount) { rank = seen; lastCount = r.messages; }
    const eligible = r.messages >= num(s.minMessages);
    return {
      ...r,
      rank,
      eligible,
      points: eligible ? pointsForRank(s, rank) : 0,
    };
  });
}

/* what the winners list on the event should become */
export const toWinners = (scored) =>
  scored.filter((r) => r.points > 0).map((r) => ({
    place: r.rank, name: r.name, uid: "", points: String(r.points), prize: "",
  }));

export function schemeSummary(scheme) {
  const s = scheme || DEFAULT_SCHEME;
  const head = s.points.map((n, i) => ordinal(i + 1) + " " + n).join(" \u00B7 ");
  const tail = s.tail ? " \u00B7 everyone else " + s.tail : "";
  const min = s.minMessages ? " \u00B7 min " + s.minMessages + " msgs" : "";
  return head + tail + min;
}

export function ordinal(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return n + "th";
  return n + (["th", "st", "nd", "rd"][n % 10] || "th");
}
