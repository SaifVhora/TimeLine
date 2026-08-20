/* Posting to Discord.
   A webhook is just a URL Discord gives you per channel. We keep a small named
   list on access.webhooks so staff can pick "announcements" or "events" rather
   than pasting a URL every time.

   The URL is a secret in the sense that anyone holding it can post to that
   channel — it grants nothing else, can't read anything, and Discord lets you
   regenerate it in one click. That's why it's safe to keep here alongside the
   rest of the shared config, but it's also why only people who can manage
   servers get to see or edit the full URL. */

import { uid } from "./util.js";

export const MAX_HOOKS = 8;
export const HOOK_RE = /^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;

export const hookList = (access) => ((access && access.webhooks) || []).filter((w) => w && w.id);

export const validHook = (url) => HOOK_RE.test(String(url || "").trim());

export const blankHook = () => ({ id: uid(), name: "", url: "" });

/* Never show a whole webhook URL in the UI — the tail is the secret half. */
export function maskHook(url) {
  const s = String(url || "");
  const m = s.match(/webhooks\/(\d+)\//);
  if (!m) return "\u2026";
  return "\u2026/" + m[1].slice(0, 6) + "\u2026/" + "\u2022".repeat(8);
}

/* Discord hard-caps a message at 2000 characters. Split on line breaks so a
   long winners list arrives as two readable posts instead of one truncated one. */
export function chunk(text, limit = 1900) {
  const lines = String(text || "").split("\n");
  const out = [];
  let cur = "";
  for (const ln of lines) {
    if ((cur + "\n" + ln).length > limit && cur) { out.push(cur); cur = ln; }
    else cur = cur ? cur + "\n" + ln : ln;
  }
  if (cur) out.push(cur);
  return out.length ? out : [""];
}

/* Post to Discord. Resolves { ok } or { ok:false, error } — never throws, so a
   dead webhook can't take a save down with it. */
export async function postToDiscord(url, text, opts = {}) {
  if (!validHook(url)) return { ok: false, error: "That doesn't look like a Discord webhook URL" };
  const parts = chunk(text);
  try {
    for (const part of parts) {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: part,
          username: opts.username || "TimeLine",
          /* nobody wants an @everyone fired by accident from a schedule tool */
          allowed_mentions: { parse: ["users"] },
        }),
      });
      if (r.status === 429) {
        const j = await r.json().catch(() => ({}));
        const wait = Math.min(5000, Math.round((j.retry_after || 1) * 1000));
        await new Promise((res) => setTimeout(res, wait));
        const again = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: part, username: opts.username || "TimeLine",
            allowed_mentions: { parse: ["users"] } }),
        });
        if (!again.ok) return { ok: false, error: "Discord is rate limiting \u2014 try again in a moment" };
        continue;
      }
      if (r.status === 404) return { ok: false, error: "That webhook no longer exists \u2014 it was probably deleted in Discord" };
      if (r.status === 401 || r.status === 403) return { ok: false, error: "Discord refused that webhook" };
      if (!r.ok) return { ok: false, error: "Discord said no (" + r.status + ")" };
    }
    return { ok: true, parts: parts.length };
  } catch (e) {
    return { ok: false, error: "Couldn't reach Discord \u2014 check your connection" };
  }
}
