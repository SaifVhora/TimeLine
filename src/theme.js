export const THEME = {
  dark: {
    canvas: "radial-gradient(1300px 700px at 50% 38%, #0B1224 0%, #04060D 72%), #04060D",
    text: "#E9EFFF", body: "#B3BDD6", muted: "#78849F",
    hair: "rgba(255,255,255,0.11)", panel: "rgba(255,255,255,0.05)", field: "rgba(255,255,255,0.05)",
    sheet: "linear-gradient(180deg,#111A2E,#080D1A)", bar: "rgba(4,6,13,0.78)",
    current: "#FFFFFF", currentSoft: "rgba(198,222,255,.9)", bloom: "rgba(160,200,255,.45)",
    silver: "#C3CEE3", gold: "#E8C87A", live: "#6BE3B8", soon: "#F2C55C", danger: "#FF7285",
    star: "255,255,255", nebulaA: "rgba(90,120,255,.16)", nebulaB: "rgba(190,120,255,.12)",
    solidBtn: "rgba(255,255,255,0.93)", solidInk: "#04060D", isDark: true,
    inkA: "#0B1224", inkB: "#04060D",
  },
  /* Nova — the v2 look: deeper ink, aurora accents, comet on the line */
  nova: {
    canvas: "radial-gradient(1300px 760px at 50% 30%, #0A1122 0%, #05070F 70%), #05070F",
    text: "#EAF0FF", body: "#AFB9D4", muted: "#6F7C99",
    hair: "rgba(160,180,255,0.13)", panel: "rgba(120,150,255,0.055)", field: "rgba(120,150,255,0.055)",
    sheet: "linear-gradient(180deg,#101A32,#070B16)", bar: "rgba(5,7,15,0.78)",
    current: "#E8C87A", currentSoft: "rgba(232,200,122,.9)", bloom: "rgba(232,200,122,.4)",
    silver: "#C3CEE3", gold: "#E8C87A", live: "#5FE6B0", soon: "#F2C55C", danger: "#FF7285",
    star: "220,230,255", nebulaA: "rgba(139,123,255,.18)", nebulaB: "rgba(53,214,192,.10)",
    solidBtn: "linear-gradient(92deg,#8B7BFF,#35D6C0)", solidInk: "#05070F", isDark: true,
    inkA: "#0A1122", inkB: "#05070F", comet: true,
  },
  light: {
    canvas: "radial-gradient(1200px 640px at 50% 30%, #FFFFFF 0%, #EEF0F8 70%), #EAEDF6",
    text: "#0A1020", body: "#39415A", muted: "#6B7590",
    hair: "rgba(16,22,44,0.14)", panel: "rgba(16,22,44,0.045)", field: "#FFFFFF",
    sheet: "#FFFFFF", bar: "rgba(255,255,255,0.9)",
    current: "#2A21B8", currentSoft: "#4B3FE0", bloom: "rgba(70,58,190,.16)",
    silver: "#8B94AD", gold: "#946A00", live: "#097A57", soon: "#A85F00", danger: "#C42B3C",
    star: "88,98,150", nebulaA: "rgba(110,120,230,.10)", nebulaB: "rgba(190,130,230,.08)",
    solidBtn: "#0A1020", solidInk: "#FFFFFF", isDark: false,
    inkA: "#FFFFFF", inkB: "#E8EBF5",
  }
};

export const DISPLAY = "'Marcellus', ui-serif, Georgia, serif";
export const BODY = "'Instrument Sans', ui-sans-serif, system-ui";
export const MONO = "'JetBrains Mono', ui-monospace, monospace";

export const globalCSS = (T) => `
  /* Keep sideways overscroll inside the app. Without this the browser reads a
     horizontal scroll that runs past the end as a back gesture and leaves the
     site — which is why scrolling around felt like it triggered "back". */
  html, body { overscroll-behavior-x: none; overscroll-behavior-y: auto; }
  .scroller, [class*="overflow-x"], [class*="overflow-y"] { overscroll-behavior-x: none; }
  input::placeholder, textarea::placeholder { color: ${T.muted}; }
  input:focus, textarea:focus, select:focus { border-color: ${T.current} !important; }
  button:focus-visible, input:focus-visible { outline: 1px solid ${T.gold}; outline-offset: 2px; }
  select option { background: ${T.isDark ? "#0E1526" : "#fff"}; color: ${T.text}; }
  @keyframes flow { from { background-position: 0 0; } to { background-position: 900px 0; } }
  @keyframes emberA { 0% { transform: translateX(0); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateX(460px); opacity: 0; } }
  @keyframes twinkle { 0%,100% { opacity: .18; } 50% { opacity: .85; } }
  @keyframes breathe { 0%,100% { opacity: .45; } 50% { opacity: 1; } }
  @keyframes pulseRing { 0% { transform: scale(.7); opacity: .8; } 100% { transform: scale(2.4); opacity: 0; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  @keyframes coreGlow { 0%,100% { transform: scale(1); opacity: .55; } 50% { transform: scale(1.12); opacity: .95; } }
  @keyframes dashFlow { to { stroke-dashoffset: -60; } }
  @keyframes drawLine { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes sheetIn { from { opacity: 0; transform: translateY(20px) scale(.98); } to { opacity: 1; transform: none; } }
  @keyframes zoomStage { from { opacity: 0; transform: scale(1.06); } to { opacity: 1; transform: none; } }
  @keyframes zoomOutStage { from { opacity: 0; transform: scale(.95); } to { opacity: 1; transform: none; } }
  @keyframes swipeHint { from { opacity: .9; transform: translateX(0); } to { opacity: 0; transform: translateX(26px); } }
  @keyframes floatUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
  .flame { background-image: linear-gradient(90deg, transparent 0%, ${T.current}55 15%, ${T.current} 45%, ${T.currentSoft} 55%, ${T.current}55 85%, transparent 100%);
           background-size: 900px 100%; animation: flow 6s linear infinite; }
  .ember { animation: emberA 7s linear infinite; }
  .twinkle { animation: twinkle 4s ease-in-out infinite; }
  .breathe { animation: breathe 2.6s ease-in-out infinite; }
  .spin { animation: spin 1s linear infinite; }
  .rise { animation: rise .3s ease both; }
  .core { animation: coreGlow 4.5s ease-in-out infinite; }
  .ray { stroke-dasharray: 4 8; animation: dashFlow 3s linear infinite; }
  .draw { transform-origin: center; animation: drawLine .8s cubic-bezier(.2,.8,.2,1) both; }
  .fadein { animation: fadeIn .6s ease both; }
  @keyframes cometRun { from { background-position: -240px 0; } to { background-position: calc(100% + 240px) 0; } }
  .comet { position: relative; }
  .comet::after { content: ""; position: absolute; inset: -1px 0;
    background: linear-gradient(90deg, transparent, ${T.currentSoft}, transparent);
    background-size: 240px 100%; background-repeat: no-repeat;
    animation: cometRun 5.5s linear infinite; opacity: .65; pointer-events: none; }
  .lift { transition: transform .28s cubic-bezier(.2,.8,.3,1.1), border-color .28s ease, box-shadow .28s ease; will-change: transform; }
  .lift:hover { transform: translateY(-3px); }
  .scroller::-webkit-scrollbar { height: 6px; }
  .scroller::-webkit-scrollbar-thumb { background: ${T.hair}; border-radius: 6px; }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; } }
`;
