export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
export const newKey = () => uid() + uid() + uid();
export const fingerprint = (t) => (t ? t.slice(-4).toUpperCase() : "????");

export async function hashPass(pass, salt) {
  const data = new TextEncoder().encode((salt || "") + "::" + pass);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function copy(text, ping) {
  try { navigator.clipboard.writeText(text); ping && ping("Copied"); }
  catch (e) { ping && ping("Copy blocked by the browser — select the text instead", true); }
}

export const appLink = () => location.href.split("#")[0];
