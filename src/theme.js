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
  light: {
    canvas: "radial-gradient(1300px 700px at 50% 34%, #FFFFFF 0%, #F1F3FB 72%), #F1F3FB",
    text: "#0D1424", body: "#414A63", muted: "#79839C",
    hair: "rgba(14,20,40,0.11)", panel: "rgba(14,20,40,0.035)", field: "#FFFFFF",
    sheet: "#FFFFFF", bar: "rgba(247,248,252,0.85)",
    current: "#4B58FF", currentSoft: "rgba(120,140,255,.85)", bloom: "rgba(90,110,255,.32)",
    silver: "#9AA4BD", gold: "#B0821A", live: "#0E9C74", soon: "#B07C10", danger: "#D2384A",
    star: "91,107,255", nebulaA: "rgba(120,140,255,.13)", nebulaB: "rgba(200,140,255,.10)",
    solidBtn: "#0D1424", solidInk: "#FFFFFF", isDark: false,
    inkA: "#FFFFFF", inkB: "#EEF1FA",
  },
};

export const DISPLAY = "'Marcellus', ui-serif, Georgia, serif";
export const BODY = "'Instrument Sans', ui-sans-serif, system-ui";
export const MONO = "'JetBrains Mono', ui-monospace, monospace";

export const globalCSS = (T) => `
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
  .flame { background-image: linear-gradient(90deg, transparent 0%, ${T.current}22 20%, ${T.current} 45%, ${T.currentSoft} 55%, ${T.current}22 80%, transparent 100%);
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
  .scroller::-webkit-scrollbar { height: 6px; }
  .scroller::-webkit-scrollbar-thumb { background: ${T.hair}; border-radius: 6px; }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; } }
`;
