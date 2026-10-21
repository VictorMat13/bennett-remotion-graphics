import React from "react";
import { AbsoluteFill, Easing, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { MRD, MRD_GRADIENT, MRD_GRID } from "./theme";
import { studio } from "./studio";
import { type CK, cursorAt, pressAt } from "./cursor";

const { fontFamily: IG_FONT } = loadInter("normal", { weights: ["400", "600"], subsets: ["latin"] });

// ===========================================================================
// Bennett x Manus 2.0 v2.1, PART C (BRIEF-v3.md): the export moment and the
// payoff. 1080x960 (9:8) @30, 195f, wrapped by withSafeFrame in Root, so this
// file builds in plain 1080x960 coords.
// VO (never on screen): "Even when my agency is slammed, I can still get a
// polished video ready to post."
//
//   0-58    the real Studio Video Editor (rec/p6.mp4) as a flat literal screen
//           recording (MbFlat pattern). The preview is patched with the
//           finished Reel (ig/final-reel.mp4) playing. Camera: whole editor,
//           then eases up to the Export button (f12-32). Plain arrow cursor
//           leaves the play button (f16), arrives on Export (f40), presses at
//           f44: the button darkens (held 2f) and recovers over 8f. Nothing
//           else is drawn on the app.
//   46-104  the camera pulls back off Export (f46-68); the window eases away
//           left and down (f58-104), shrinking and fading out by f104. The
//           Reel lifts out of the preview (f62-96, decel, 9:16 throughout) and
//           grows straight into a full-screen Instagram Reels viewer panel
//           (485x862, radius 40, no bezel); the emptied preview shows the
//           app's black canvas.
//   94-127  the Reels UI assembles over the playing Reel (2-3f stagger, ENTER,
//           8px rises): bottom gradient, tab bar, status bar + header, right
//           rail bottom-up, audio tile, username row, caption, audio row.
//   124-195 settled hold: the Reel keeps playing, the audio tile turns slowly,
//           1.00 -> 1.02 push (end state 495x880, 40px top/bottom margins).
//
// Footage note: p6.mp4 frames 0-150 are the paused editor with the real
// macOS cursor parked in the chat column (window px ~357,462); frames 165+
// park a hand cursor over the pause button. This part plays frames 0-112, and
// the one stray real cursor is covered with the chat column's own flat ground
// (#121414, sampled), so only the drawn cursor is ever on screen.
// ===========================================================================

export const MBP6_DURATION = 195;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ENTER = Easing.bezier(0.05, 0.7, 0.1, 1);
const MOVE = Easing.bezier(0.65, 0, 0.35, 1);
const DECEL = Easing.bezier(0.2, 0, 0, 1);

const S = studio("dark");
const W = 1080;
const H = 960;
const AX = W / 2; // camera anchor (frame px)
const AY = H / 2;

// ---- the Studio window (window CSS px; the footage is 2x) ----
const WIN = { w: 1289, h: 898, bg: "#121414" } as const;
const EXPORT = { x0: 1221, x1: 1278, y0: 55, y1: 83, r: 7 } as const;
const EXPORT_C = { x: 1249, y: 69 } as const;
const PREVIEW = { x0: 633, x1: 918, y0: 108, y1: 614 } as const; // 9:16, square corners in the app
const STRAY_CURSOR = { x0: 349, x1: 372, y0: 451, y1: 479 } as const; // real cursor in the chat column (flat ground there)

const REEL = "manus2/ig/final-reel.mp4";
const REEL_START = 60; // 2s into the finished Reel

// ---- timeline ----
const T_PRESS = 44;
const T_LIFT = 62;
const T_LAND = 96;

// camera: the window point (cx, cy) held at the frame centre, s = frame px per window px
type Key = { f: number; cx: number; cy: number; s: number };
const KEYS: Key[] = [
  { f: 0, cx: 765, cy: 470, s: 1.25 }, // whole editor
  { f: 12, cx: 767, cy: 467, s: 1.265 },
  { f: 32, cx: 1110, cy: 140, s: 2.3 }, // Export large and clear
  { f: 46, cx: 1112, cy: 139, s: 2.33 }, // hold through the click
  { f: 68, cx: 915, cy: 380, s: 1.24 }, // pull back: the preview is back in frame
];
const camAt = (frame: number) => {
  const fs = KEYS.map((k) => k.f);
  const v = (pick: (k: Key) => number) => interpolate(frame, fs, KEYS.map(pick), { ...clamp, easing: MOVE });
  return { cx: v((k) => k.cx), cy: v((k) => k.cy), s: v((k) => k.s) };
};
// the window easing away (beat 2): extra scale about the frame centre + offset
const awayAt = (frame: number) => {
  const t = interpolate(frame, [58, 104], [0, 1], { ...clamp, easing: MOVE });
  return { k: 1 - 0.22 * t, dx: -260 * t, dy: 70 * t, o: interpolate(frame, [62, 104], [1, 0], { ...clamp, easing: MOVE }) };
};

const CUR_KEYS: CK[] = [
  { f: 0, x: 775, y: 653 }, // resting by the play button
  { f: 16, x: 779, y: 648 },
  { f: 40, x: EXPORT_C.x, y: EXPORT_C.y }, // on Export
  { f: MBP6_DURATION, x: EXPORT_C.x, y: EXPORT_C.y },
];

// ---- the Instagram Reels viewer (dark, full-screen 9:16 panel, no bezel) ----
// Final panel rect (frame px, before the 1.00 -> 1.02 hold push): 485x862, centred,
// so the pushed end state is 495x880 with 40px top/bottom margins inside 1080x960.
const PW = 485;
const PH = 862;
const PANEL_R = 40;
// UI is authored on a 390-wide design canvas (390x844 iPhone), scaled uniformly to the
// panel width. The panel is 9:16, so the canvas is DH tall: top UI keeps its design y,
// bottom UI keeps its distance from the bottom edge (yB).
const UI = PW / 390;
const DH = PH / UI; // ~693 design px
const yB = (y: number) => DH - (844 - y);

const IG = { text: "#FFFFFF", dim: "rgba(255,255,255,0.6)", more: "rgba(255,255,255,0.7)", blue: "#0095F6" } as const;
const TEXT_SHADOW = "0 1px 2px rgba(0,0,0,0.35)";
const ICON_SHADOW = "drop-shadow(0 1px 2px rgba(0,0,0,0.35))";
const RAIL_DOTS_VERTICAL = false; // per the v2.1 spec ("…" as vertical dots)

// Caption, truncated the way the app truncates it: 2 lines max at 14px in the 322px
// column left of the rail (line breaks measured with Inter 18pt metrics), "… more" ends
// line 2. "#ManusPartner #ad" does not fit, so it is left out.
const CAPTION = ["My agency got so busy I stopped making", "content. Now I drop my raw clips into the"] as const;

const holdPush = (frame: number) => interpolate(frame, [124, MBP6_DURATION - 1], [1, 1.02], { ...clamp, easing: MOVE });
const panelRect = (frame: number): Rect => {
  const k = holdPush(frame);
  return { x: AX - (PW * k) / 2, y: AY - (PH * k) / 2, w: PW * k, h: PH * k };
};

type Rect = { x: number; y: number; w: number; h: number };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// the preview rect in frame px for this frame (camera + away)
const previewRect = (frame: number): Rect => {
  const c = camAt(frame);
  const a = awayAt(frame);
  const toX = (x: number) => AX + (AX + (x - c.cx) * c.s - AX) * a.k + a.dx;
  const toY = (y: number) => AY + (AY + (y - c.cy) * c.s - AY) * a.k + a.dy;
  const x0 = toX(PREVIEW.x0);
  const y0 = toY(PREVIEW.y0);
  return { x: x0, y: y0, w: toX(PREVIEW.x1) - x0, h: toY(PREVIEW.y1) - y0 };
};

// UI assembly (f94-127): staggered 2-3f apart, ENTER easing, 8px rise + fade
const T_UI = {
  gradBottom: 94,
  tabBar: 96,
  top: 98, // status bar + header (+ top gradient)
  rail: [101, 103, 105, 107], // bottom-up: dots, share, comment, heart
  tile: 109,
  user: 111,
  caption: 113,
  audio: 115,
} as const;
const enter = (frame: number, at: number) => interpolate(frame, [at, at + 12], [0, 1], { ...clamp, easing: ENTER });
const rise = (frame: number, at: number): React.CSSProperties => {
  const t = enter(frame, at);
  return { opacity: t, transform: `translateY(${(1 - t) * 8}px)` };
};

// ------------------------------------------------------------ IG glyphs (2px white line icons)
const Line: React.FC<{ size: number; children: React.ReactNode; shadow?: boolean }> = ({ size, children, shadow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={IG.text}
    strokeWidth={(2 * 24) / size}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: "block", overflow: "visible", filter: shadow ? ICON_SHADOW : undefined }}
  >
    {children}
  </svg>
);
const Heart: React.FC<{ size: number }> = ({ size }) => (
  <Line size={size}>
    <path d="M12 20.4C6.2 15.9 2.6 12.7 2.6 8.8A4.6 4.6 0 0 1 7.2 4.2c2 0 3.6 1.1 4.8 3 1.2-1.9 2.8-3 4.8-3a4.6 4.6 0 0 1 4.6 4.6c0 3.9-3.6 7.1-9.4 11.6Z" />
  </Line>
);
const Comment: React.FC<{ size: number }> = ({ size }) => (
  <Line size={size}>
    <path d="M20.66 17A9.99 9.99 0 1 0 17.07 20.62L22 22Z" />
  </Line>
);
const Share: React.FC<{ size: number }> = ({ size }) => (
  <Line size={size}>
    <path d="M22 3 9.2 10.1" />
    <path d="M11.7 20.3 22 3H2l7.2 7.1Z" />
  </Line>
);
const Dots: React.FC<{ size: number; vertical: boolean }> = ({ size, vertical }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", overflow: "visible", filter: ICON_SHADOW }}>
    {[-6.5, 0, 6.5].map((d) => (
      <circle key={d} cx={vertical ? 12 : 12 + d} cy={vertical ? 12 + d : 12} r={1.9} fill={IG.text} />
    ))}
  </svg>
);
const Plus: React.FC<{ size: number }> = ({ size }) => (
  <Line size={size}>
    <path d="M12 3.5v17M3.5 12h17" />
  </Line>
);
const Sliders: React.FC<{ size: number }> = ({ size }) => (
  <Line size={size}>
    <path d="M3 7.5h9.5M18.5 7.5H21M3 16.5h2.5M11.5 16.5H21" />
    <circle cx={15.5} cy={7.5} r={3} />
    <circle cx={8.5} cy={16.5} r={3} />
  </Line>
);
const Note: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", filter: ICON_SHADOW }}>
    <path d="M10 18V5.2l9-2.2v3.6l-6.6 1.6V18" fill="none" stroke={IG.text} strokeWidth={2} strokeLinejoin="round" />
    <ellipse cx={7.6} cy={18.2} rx={3.4} ry={2.8} fill={IG.text} />
  </svg>
);
// tab bar
const HomeIcon: React.FC<{ size: number }> = ({ size }) => (
  <Line size={size} shadow={false}>
    <path d="M3 10.6 12 3l9 7.6V21h-6v-4.8a3 3 0 0 0-6 0V21H3Z" />
  </Line>
);
const SearchIcon: React.FC<{ size: number }> = ({ size }) => (
  <Line size={size} shadow={false}>
    <circle cx={10.5} cy={10.5} r={7.2} />
    <path d="M16 16 21 21" />
  </Line>
);
const CreateIcon: React.FC<{ size: number }> = ({ size }) => (
  <Line size={size} shadow={false}>
    <rect x={3} y={3} width={18} height={18} rx={5.5} />
    <path d="M12 7.6v8.8M7.6 12h8.8" />
  </Line>
);
const ReelsIconFilled: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
    <rect x={2.6} y={2.6} width={18.8} height={18.8} rx={5.5} fill={IG.text} />
    <path d="M2.6 8.4h18.8M8.2 2.8l2.9 5.6M14.2 2.8l2.9 5.6" stroke="#000" strokeWidth={1.7} strokeLinecap="round" fill="none" />
    <path d="M10 11.6v6.1l5.3-3.05Z" fill="#000" stroke="#000" strokeWidth={0.8} strokeLinejoin="round" />
  </svg>
);
// status bar
const Signal: React.FC<{ h: number }> = ({ h }) => (
  <svg width={(h * 18) / 11} height={h} viewBox="0 0 18 11" style={{ display: "block" }}>
    {[3.6, 5.6, 8, 10.6].map((bh, i) => (
      <rect key={i} x={i * 4.7} y={11 - bh} width={3.1} height={bh} rx={0.9} fill={IG.text} />
    ))}
  </svg>
);
const arc = (r: number) => {
  const a0 = (-135 * Math.PI) / 180;
  const a1 = (-45 * Math.PI) / 180;
  return `M${(8 + r * Math.cos(a0)).toFixed(2)} ${(11 + r * Math.sin(a0)).toFixed(2)}A${r} ${r} 0 0 1 ${(8 + r * Math.cos(a1)).toFixed(2)} ${(11 + r * Math.sin(a1)).toFixed(2)}`;
};
const Wifi: React.FC<{ h: number }> = ({ h }) => (
  <svg width={(h * 16) / 11} height={h} viewBox="0 0 16 11" style={{ display: "block", overflow: "visible" }}>
    <path d={`${arc(4.6)}${arc(8.2)}`} fill="none" stroke={IG.text} strokeWidth={1.9} strokeLinecap="round" />
    <circle cx={8} cy={9.9} r={1.6} fill={IG.text} />
  </svg>
);
const Battery: React.FC<{ h: number }> = ({ h }) => (
  <svg width={(h * 27) / 12} height={h} viewBox="0 0 27 12" style={{ display: "block" }}>
    <rect x={0.6} y={0.6} width={23.2} height={10.8} rx={3.4} fill="none" stroke={IG.text} strokeOpacity={0.4} strokeWidth={1.1} />
    <rect x={2.4} y={2.4} width={19.6} height={7.2} rx={1.9} fill={IG.text} />
    <path d="M25.3 4.1v3.8c.8-.3 1.3-1.1 1.3-1.9s-.5-1.6-1.3-1.9Z" fill={IG.text} fillOpacity={0.45} />
  </svg>
);
// verified badge: blue rounded 8-point seal, white check
const SEAL = (() => {
  const n = 160;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 17.4 * (1 + 0.075 * Math.cos(8 * a));
    pts.push(`${(20 + r * Math.sin(a)).toFixed(2)} ${(20 - r * Math.cos(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
})();
const Verified: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: "block" }}>
    <path d={SEAL} fill={IG.blue} />
    <path d="M13.2 20.4 17.9 25.1 27.2 15.6" fill="none" stroke="#FFFFFF" strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// The Reels UI over the playing Reel, on the 390 x DH design canvas.
const ReelsUI: React.FC<{ frame: number }> = ({ frame }) => {
  const RAIL_X = 390 - 14 - 28; // 28px icons, 14px from the right edge
  const RAIL = [
    { y: 542, el: <Heart size={28} /> },
    { y: 586, el: <Comment size={28} /> },
    { y: 630, el: <Share size={28} /> },
    { y: 674, el: <Dots size={28} vertical={RAIL_DOTS_VERTICAL} /> },
  ];
  const tabIcons = [
    <HomeIcon key="h" size={26} />,
    <SearchIcon key="s" size={26} />,
    <CreateIcon key="c" size={26} />,
    <ReelsIconFilled key="r" size={26} />,
  ];
  const spin = Math.max(0, frame - T_UI.tile) * 1.2; // audio tile: slow constant spin, 36 deg/s
  const text: React.CSSProperties = { color: IG.text, textShadow: TEXT_SHADOW, whiteSpace: "nowrap", fontFamily: IG_FONT };
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 390, height: DH }}>
      {/* legibility gradients, as in the app */}
      <div style={{ position: "absolute", left: 0, top: 0, width: 390, height: 160, background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 100%)", opacity: enter(frame, T_UI.top) }} />
      <div style={{ position: "absolute", left: 0, top: DH - 260, width: 390, height: 260, background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%)", opacity: enter(frame, T_UI.gradBottom) }} />

      {/* tab bar + home indicator */}
      <div style={{ position: "absolute", left: 0, top: DH - 84, width: 390, height: 84, backgroundColor: "#000", ...rise(frame, T_UI.tabBar) }}>
        {tabIcons.map((ic, i) => (
          <div key={i} style={{ position: "absolute", left: 39 + 78 * i - 13, top: 12, width: 26, height: 26 }}>
            {ic}
          </div>
        ))}
        <div style={{ position: "absolute", left: 39 + 78 * 4 - 13, top: 12, width: 26, height: 26, borderRadius: 13, border: "2px solid #FFFFFF", boxSizing: "border-box", overflow: "hidden" }}>
          <Img src={staticFile("manus2/ig/avatar.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
        <div style={{ position: "absolute", left: (390 - 134) / 2, top: 84 - 8 - 5, width: 134, height: 5, borderRadius: 3, backgroundColor: "#FFFFFF" }} />
      </div>

      {/* status bar + header */}
      <div style={{ position: "absolute", left: 0, top: 0, width: 390, height: 100, ...rise(frame, T_UI.top) }}>
        <div style={{ ...text, position: "absolute", left: 38, top: 18, fontSize: 16, fontWeight: 600, lineHeight: "20px", letterSpacing: -0.2 }}>9:41</div>
        <div style={{ position: "absolute", right: 28, top: 22, display: "flex", alignItems: "center", gap: 6, filter: ICON_SHADOW }}>
          <Signal h={11} />
          <Wifi h={11} />
          <Battery h={12} />
        </div>
        <div style={{ position: "absolute", left: 14, top: 77 - 12 }}>
          <Plus size={24} />
        </div>
        <div style={{ position: "absolute", left: 0, width: 390, top: 77 - 11, display: "flex", justifyContent: "center", gap: 18 }}>
          <div style={{ ...text, fontSize: 17, fontWeight: 600, lineHeight: "22px" }}>Reels</div>
          <div style={{ ...text, color: IG.dim, fontSize: 17, fontWeight: 600, lineHeight: "22px" }}>Friends</div>
        </div>
        <div style={{ position: "absolute", left: 390 - 14 - 24, top: 77 - 12 }}>
          <Sliders size={24} />
        </div>
      </div>

      {/* right rail, entering bottom-up; no counts */}
      {RAIL.map((r, i) => (
        <div key={i} style={{ position: "absolute", left: RAIL_X, top: yB(r.y), width: 28, height: 28, ...rise(frame, T_UI.rail[RAIL.length - 1 - i]) }}>
          {r.el}
        </div>
      ))}
      <div style={{ position: "absolute", left: RAIL_X - 1, top: yB(718), width: 30, height: 30, ...rise(frame, T_UI.tile) }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, border: "2px solid #FFFFFF", boxSizing: "border-box", overflow: "hidden", transform: `rotate(${spin}deg)`, boxShadow: "0 1px 3px rgba(0,0,0,0.35)" }}>
          <Img src={staticFile("manus2/ig/avatar.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
      </div>

      {/* bottom-left block: username row, caption (2 lines, truncated), audio row */}
      <div style={{ position: "absolute", left: 14, top: yB(650), height: 32, display: "flex", alignItems: "center", ...rise(frame, T_UI.user) }}>
        <Img src={staticFile("manus2/ig/avatar.jpg")} style={{ width: 32, height: 32, borderRadius: 16, objectFit: "cover", flexShrink: 0 }} />
        <div style={{ ...text, marginLeft: 8, fontSize: 15, fontWeight: 600, lineHeight: "18px" }}>bennett.spooner</div>
        <div style={{ marginLeft: 4, filter: ICON_SHADOW }}>
          <Verified size={13} />
        </div>
        <div style={{ ...text, marginLeft: 10, fontSize: 13, fontWeight: 600, lineHeight: "16px", padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.7)" }}>Follow</div>
      </div>
      <div style={{ position: "absolute", left: 14, top: yB(692), fontSize: 14, lineHeight: "18px", ...rise(frame, T_UI.caption) }}>
        <div style={text}>{CAPTION[0]}</div>
        <div style={text}>
          {CAPTION[1]}… <span style={{ color: IG.more }}>more</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 14, top: yB(732), height: 16, display: "flex", alignItems: "center", ...rise(frame, T_UI.audio) }}>
        <Note size={13} />
        <div style={{ ...text, marginLeft: 5, fontSize: 13, lineHeight: "16px" }}>bennett.spooner · Original audio</div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------ the scene
const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const c = camAt(frame);
  const a = awayAt(frame);
  const s = c.s;
  const left = AX - c.cx * s;
  const top = AY - c.cy * s;
  const lifted = frame >= T_LIFT;

  // cursor (window px -> window plane), press + soft darken on the real button
  const cur = cursorAt(frame, CUR_KEYS);
  const press = pressAt(frame, T_PRESS);
  const darken = interpolate(frame, [T_PRESS - 1, T_PRESS, T_PRESS + 2, T_PRESS + 10], [0, 1, 1, 0], { ...clamp, easing: DECEL });

  // the Reel lifts out of the preview and grows straight into the 9:16 Reels panel (9:16 throughout)
  const u = interpolate(frame, [T_LIFT, T_LAND], [0, 1], { ...clamp, easing: DECEL });
  const from = previewRect(frame);
  const to = panelRect(frame);
  const card: Rect = { x: lerp(from.x, to.x, u), y: lerp(from.y, to.y, u), w: lerp(from.w, to.w, u), h: lerp(from.h, to.h, u) };
  const lift = interpolate(u, [0, 0.3], [0, 1], clamp);
  const ui = card.w / 390; // design canvas -> frame px

  return (
    <AbsoluteFill>
      {/* ---------- the Studio window (flat recording), easing away in beat 2 ---------- */}
      {a.o > 0.001 ? (
        <AbsoluteFill style={{ opacity: a.o, transform: `translate(${a.dx}px, ${a.dy}px) scale(${a.k})`, transformOrigin: `${AX}px ${AY}px` }}>
          <div
            style={{
              position: "absolute",
              left,
              top,
              width: WIN.w * s,
              height: WIN.h * s,
              borderRadius: 12 * s,
              overflow: "hidden",
              backgroundColor: WIN.bg,
              boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px ${MRD.hairline}`,
            }}
          >
            <OffthreadVideo src={staticFile("manus2/rec/p6.mp4")} muted style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }} />
            {/* the stray real cursor in the chat column, covered with the column's own ground */}
            <div
              style={{
                position: "absolute",
                left: STRAY_CURSOR.x0 * s,
                top: STRAY_CURSOR.y0 * s,
                width: (STRAY_CURSOR.x1 - STRAY_CURSOR.x0) * s,
                height: (STRAY_CURSOR.y1 - STRAY_CURSOR.y0) * s,
                backgroundColor: WIN.bg,
              }}
            />
            {/* preview patch: the finished Reel plays in the editor; once it lifts out, the canvas is empty */}
            <div
              style={{
                position: "absolute",
                left: PREVIEW.x0 * s,
                top: PREVIEW.y0 * s,
                width: (PREVIEW.x1 - PREVIEW.x0) * s,
                height: (PREVIEW.y1 - PREVIEW.y0) * s,
                overflow: "hidden",
                backgroundColor: S.previewBg,
              }}
            >
              {!lifted ? (
                <OffthreadVideo src={staticFile(REEL)} trimBefore={REEL_START} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : null}
            </div>
            {/* press: the real Export button darkens softly and recovers */}
            {darken > 0.001 ? (
              <div
                style={{
                  position: "absolute",
                  left: EXPORT.x0 * s,
                  top: EXPORT.y0 * s,
                  width: (EXPORT.x1 - EXPORT.x0) * s,
                  height: (EXPORT.y1 - EXPORT.y0) * s,
                  borderRadius: EXPORT.r * s,
                  backgroundColor: `rgba(0,0,0,${(0.18 * darken).toFixed(3)})`,
                }}
              />
            ) : null}
          </div>
          {/* plain arrow cursor (same drawing as MbP1AgencyGotSoBusy), on the window plane */}
          <svg
            width={26 * s}
            height={31 * s}
            viewBox="0 0 24 28"
            style={{
              position: "absolute",
              left: left + cur.x * s - 3 * s,
              top: top + cur.y * s - 2 * s,
              transform: `scale(${1 - 0.14 * press})`,
              transformOrigin: `${3 * s}px ${2 * s}px`,
              filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.35))",
            }}
          >
            <path d="M3 2.2 3 20.4l4.6-4.4 3.1 7.1 3.6-1.6-3.1-7 6.2-.4z" fill="#111" stroke="#FFFFFF" strokeWidth={1.7} strokeLinejoin="round" />
          </svg>
        </AbsoluteFill>
      ) : null}

      {/* ---------- the Reels viewer: the lifted Reel is the panel ---------- */}
      {lifted ? (
        <div
          style={{
            position: "absolute",
            left: card.x,
            top: card.y,
            width: card.w,
            height: card.h,
            borderRadius: PANEL_R * (card.w / PW) * u,
            overflow: "hidden",
            backgroundColor: S.previewBg,
            boxShadow: `0 ${(24 * lift).toFixed(1)}px ${(60 * lift).toFixed(1)}px rgba(0,0,0,${(0.55 * lift).toFixed(3)}), 0 2px 8px rgba(0,0,0,${(0.4 * lift).toFixed(3)}), 0 0 0 1px rgba(255,255,255,${(0.08 * u).toFixed(3)})`,
          }}
        >
          <OffthreadVideo src={staticFile(REEL)} trimBefore={REEL_START} muted style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          {frame >= T_UI.gradBottom - 1 ? (
            <div style={{ position: "absolute", left: 0, top: 0, width: 390, height: DH, transform: `scale(${ui})`, transformOrigin: "0 0" }}>
              <ReelsUI frame={frame} />
            </div>
          ) : null}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const MbP6SlammedExport: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: MRD.bg, overflow: "hidden" }}>
    <AbsoluteFill style={{ backgroundImage: MRD_GRADIENT.ground }} />
    <AbsoluteFill
      style={{
        backgroundImage: `repeating-linear-gradient(90deg, ${MRD_GRID.color} 0px, ${MRD_GRID.color} 1px, transparent 1px, transparent ${MRD_GRID.spacing}px)`,
      }}
    />
    <CameraMotionBlur shutterAngle={180} samples={8}>
      <Scene />
    </CameraMotionBlur>
  </AbsoluteFill>
);
