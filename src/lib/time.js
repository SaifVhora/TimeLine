export const DAY = 86400000, HOUR = 3600000, MIN = 60000;

export const nowISO = () => new Date().toISOString();
export const newer = (a, b) => new Date(a || 0) > new Date(b || 0);

export const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const sameDay = (a, b) => startOfDay(a) === startOfDay(b);

export const fmtDay  = (t) => new Date(t).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
export const fmtD    = (t) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
export const fmtFull = (t) => new Date(t).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
export const fmtTime = (t) => new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export function fmtDur(min) {
  if (!min) return "";
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
  return [d ? d + "d" : "", h ? h + "h" : "", m ? m + "m" : ""].filter(Boolean).join(" ");
}

export function countdown(iso, now) {
  const diff = new Date(iso).getTime() - now;
  const a = Math.abs(diff), d = Math.floor(a / DAY), h = Math.floor((a % DAY) / HOUR), m = Math.floor((a % HOUR) / MIN);
  const s = d > 0 ? d + "d" : h > 0 ? h + "h " + m + "m" : m + "m";
  return diff >= 0 ? "in " + s : s + " ago";
}

export function ago(t) {
  if (!t) return "never";
  const m = Math.floor((Date.now() - t) / MIN);
  return m < 1 ? "just now" : m < 60 ? m + "m ago" : Math.floor(m / 60) + "h ago";
}

/* split an ISO string into 12-hour clock parts, and put them back together */
export function clockParts(iso) {
  const d = new Date(iso);
  let hr = d.getHours();
  const ampm = hr >= 12 ? "PM" : "AM";
  hr = hr % 12; if (hr === 0) hr = 12;
  return { hour: hr, minute: d.getMinutes(), ampm };
}
export function withClock(iso, parts) {
  const d = new Date(iso);
  let hr = Math.min(12, Math.max(1, parts.hour || 12)) % 12;
  if (parts.ampm === "PM") hr += 12;
  d.setHours(hr, Math.min(59, Math.max(0, parts.minute || 0)), 0, 0);
  return d.toISOString();
}
