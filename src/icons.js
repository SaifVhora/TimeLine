import { h } from "./react.js";

const ic = (inner) => (p) => {
  const s = (p && p.size) || 14;
  return h("svg", {
    width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
    strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round",
    className: (p && p.className) || "", style: (p && p.style) || {},
    dangerouslySetInnerHTML: { __html: inner },
  });
};

export const Plus = ic('<path d="M12 5v14M5 12h14"/>');
export const Search = ic('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>');
export const X = ic('<path d="M18 6 6 18M6 6l12 12"/>');
export const Pencil = ic('<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>');
export const Trash = ic('<path d="M3 6h18M8 6V4h8v2m1 0v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6"/>');
export const Copy = ic('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>');
export const Shield = ic('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>');
export const LogOut = ic('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>');
export const ChevronDown = ic('<path d="m6 9 6 6 6-6"/>');
export const ChevronLeft = ic('<path d="m15 18-6-6 6-6"/>');
export const ChevronRight = ic('<path d="m9 18 6-6-6-6"/>');
export const RotateCw = ic('<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>');
export const AlertCircle = ic('<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>');
export const ZoomIn = ic('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/>');
export const ZoomOut = ic('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3M8 11h6"/>');
export const Crosshair = ic('<circle cx="12" cy="12" r="10"/><path d="M22 12h-4M6 12H2M12 6V2M12 22v-4"/>');
export const Sun = ic('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>');
export const Moon = ic('<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>');
export const Link2 = ic('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>');
export const Check = ic('<path d="M20 6 9 17l-5-5"/>');
export const Clock = ic('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>');
export const CalendarDays = ic('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>');
export const Trophy = ic('<path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4z"/><path d="M7 4H4v2a3 3 0 0 0 3 3M17 4h3v2a3 3 0 0 1-3 3"/>');
export const Users = ic('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>');
export const FileText = ic('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/>');
export const Paperclip = ic('<path d="m21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>');
export const BadgeCheck = ic('<circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/>');
export const ArrowLeft = ic('<path d="m12 19-7-7 7-7M19 12H5"/>');
export const ArrowRight = ic('<path d="m12 5 7 7-7 7M5 12h14"/>');
export const Sparkles = ic('<path d="M12 3l1.9 5.9 5.9 2.1-5.9 2.1L12 19l-1.9-5.9L4.2 11l5.9-2.1z"/>');
export const Lock = ic('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>');
export const Hourglass = ic('<path d="M5 22h14M5 2h14M17 22v-4.2a2 2 0 0 0-.6-1.4L12 12l-4.4 4.4a2 2 0 0 0-.6 1.4V22M7 2v4.2a2 2 0 0 0 .6 1.4L12 12l4.4-4.4A2 2 0 0 0 17 6.2V2"/>');
export const Smartphone = ic('<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>');
export const Share2 = ic('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>');
export const Volume2 = ic('<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>');
export const Hash = ic('<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>');
export const Mic2 = ic('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3"/>');
export const MapPin = ic('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>');
export const User = ic('<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>');
export const KeyRound = ic('<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8.7-8.7M17 5l2 2M15 7l2 2"/>');
export const Eye = ic('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>');
export const EyeOff = ic('<path d="M9.9 5A9.7 9.7 0 0 1 12 5c6 0 10 7 10 7a13 13 0 0 1-2.3 2.9M6.6 6.6A13 13 0 0 0 2 12s4 7 10 7a9.5 9.5 0 0 0 4.7-1.2M2 2l20 20"/>');
export const Download = ic('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>');
export const TextSize = ic('<path d="M4 20V7M4 7h9M8.5 7v13"/><path d="M14 20v-8M14 12h6M17 12v8"/>');

export const Upload = ic('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>');
export const History = ic('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>');
export const Undo = ic('<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>');
export const Database = ic('<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>');
export const ShieldAlert = ic('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4M12 16h.01"/>');

export const PLACES = [
  { id: "voice", label: "Voice channel", icon: Volume2, emoji: "🔊" },
  { id: "text",  label: "Text channel",  icon: Hash,    emoji: "💬" },
  { id: "stage", label: "Stage",         icon: Mic2,    emoji: "🎤" },
  { id: "other", label: "Somewhere else",icon: MapPin,  emoji: "📍" },
];
export const placeOf = (id) => PLACES.find((p) => p.id === id) || PLACES[0];
