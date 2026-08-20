import { h, useState } from "../react.js";
import { DISPLAY, MONO } from "../theme.js";
import { useT, useInput, Btn, Label, Field } from "../ui/atoms.js";
import { Plus, Trash, Check, AlertCircle } from "../icons.js";
import { hookList, validHook, blankHook, maskHook, postToDiscord, MAX_HOOKS } from "../lib/webhooks.js";

/* Lives in the admin panel. Only people who can manage servers get here. */
export function Webhooks(p) {
  const T = useT();
  const input = useInput();
  const [draft, setDraft] = useState(null);
  const [testing, setTesting] = useState(null);
  const list = hookList(p.access);

  const add = () => {
    const name = (draft.name || "").trim() || "Untitled channel";
    p.onSave([...list, { ...draft, name, url: draft.url.trim() }]);
    setDraft(null);
  };

  const test = async (hook) => {
    setTesting(hook.id);
    const r = await postToDiscord(hook.url,
      "\u2705 **TimeLine is connected.** Reminders and announcements will arrive in this channel.");
    setTesting(null);
    p.ping(r.ok ? "Posted \u2014 check " + hook.name : r.error, !r.ok);
  };

  return h("div", { className: "space-y-4" },
    h("div", null,
      h("div", { style: { fontFamily: DISPLAY, fontSize: 17 } }, "Discord channels"),
      h("p", { className: "mt-1 text-sm", style: { color: T.muted } },
        "In Discord: Channel settings \u2192 Integrations \u2192 Webhooks \u2192 New Webhook \u2192 Copy URL. Anyone holding that URL can post to the channel, so treat it like a key \u2014 you can regenerate it in Discord at any time.")),

    list.length
      ? h("div", { className: "space-y-2" }, list.map((w) =>
          h("div", { key: w.id, className: "rounded-xl p-3",
            style: { background: T.field, border: "1px solid " + T.hair } },
            h("div", { className: "flex items-center gap-2" },
              h("div", { className: "flex-1 min-w-0" },
                h("div", { className: "truncate", style: { fontFamily: DISPLAY, fontSize: 15 } }, w.name),
                h("div", { style: { fontFamily: MONO, fontSize: 9.5, color: T.muted } }, maskHook(w.url))),
              h(Btn, { size: "sm", disabled: testing === w.id, onClick: () => test(w) },
                testing === w.id ? "\u2026" : "Test"),
              h(Btn, { size: "sm", tone: "danger",
                onClick: () => p.onSave(list.filter((x) => x.id !== w.id)) }, h(Trash, { size: 12 }))))))
      : h("div", { className: "text-sm px-3 py-4 rounded-xl text-center",
          style: { color: T.muted, border: "1px dashed " + T.hair } },
          "No channels connected yet."),

    draft
      ? h("div", { className: "rounded-xl p-3 space-y-3", style: { border: "1px solid " + T.hair } },
          h(Field, { label: "What to call it", hint: "Just for you \u2014 e.g. announcements" },
            h("input", { style: input, value: draft.name, maxLength: 30, autoFocus: true,
              onChange: (e) => setDraft({ ...draft, name: e.target.value }) })),
          h(Field, { label: "Webhook URL" },
            h("input", { style: input, value: draft.url, placeholder: "https://discord.com/api/webhooks/\u2026",
              onChange: (e) => setDraft({ ...draft, url: e.target.value }) })),
          draft.url && !validHook(draft.url)
            ? h("div", { className: "inline-flex items-center gap-1.5 text-xs", style: { color: T.danger } },
                h(AlertCircle, { size: 12 }), "That isn't a Discord webhook URL")
            : null,
          h("div", { className: "flex gap-2" },
            h(Btn, { tone: "solid", full: true, disabled: !validHook(draft.url), onClick: add },
              h(Check, { size: 13 }), " Add channel"),
            h(Btn, { onClick: () => setDraft(null) }, "Cancel")))
      : list.length < MAX_HOOKS
        ? h(Btn, { full: true, onClick: () => setDraft(blankHook()) }, h(Plus, { size: 13 }), " Connect a channel")
        : h("div", { className: "text-xs", style: { color: T.muted } },
            "That's the maximum of " + MAX_HOOKS + " channels."));
}
