import React from "react";
import { AbsoluteFill, Easing, Freeze, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { MANUS_FONT, MANUS_LOGOS, MANUS_SERIF, MRD, MRD_GRID, loadManusFont } from "./theme";
import { STUDIO_ASSETS, STUDIO_HOME, STUDIO_SIDEBAR, STUDIO_VIDEO, STUDIO_WIN, studio, type StudioMode } from "./studio";

loadManusFont();

// ===========================================================================
// MbP2RawClipsFewPrompts: 1080x960 (9:8) @ 30fps, 100 frames (3D, BRIEF-v2-3D)
// VO (never on screen): "All it needs from me is my raw clips and a few prompts."
//
// ONE 3D world: the Manus Studio window (Video mode, light palette) stands
// upright on the Merydian perspective floor (bottom edge 20px above it, contact
// shadow). A look-at camera opens already moving, low and ~31deg off-axis to
// the left, then arcs right, cranes up and pushes in until it is near-frontal
// and tight on the composer for the end hold.
//
//   0-28   the raw clip (real frame, thick rounded tile) is thrown in from past
//          the lens: huge and soft, sharpening as it travels in depth, with a
//          contact shadow sweeping the floor and a cast shadow on the window.
//          The composer grows to make room (rec-t025 -> rec-t070).
//   27-40  the tile drops into the box and collapses into the red video glyph:
//          the real attachment card resolves (C1107.MP4 / Video · 4412.12 MB),
//          send enables (as the app does on attach), caret blinks at the
//          placeholder (raw recording 0:55).
//   42-74  the real brief types verbatim, wrapping exactly as rec-t085 (box
//          grows for line 3) while the camera keeps arcing to frontal.
//   74-100 hold, near-frontal, slow drift, caret blinking. No send click.
//
// Window units = CSS px of the 1289x898 Studio window (STUDIO_WIN). World:
// x right, y down, z toward the camera; window plane z=0 centred on x=0, its
// bottom edge at y=0; floor plane y=+20.
// ===========================================================================

export const MBP2RAWCLIPSFEWPROMPTS_DURATION = 100;

// Palette switch (BRIEF-v2: flip to "dark" for the dark-mode check still only).
const MODE: StudioMode = "light";
const S = studio(MODE);

const DUR = MBP2RAWCLIPSFEWPROMPTS_DURATION;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ENTER = Easing.bezier(0.05, 0.7, 0.1, 1);
const TRAVEL = Easing.bezier(0.65, 0, 0.35, 1);
const DECEL = Easing.bezier(0.2, 0, 0, 1);
const DRIFT = Easing.bezier(0.45, 0, 0.55, 1);
const FLIGHT = Easing.bezier(0.1, 0.45, 0.22, 1); // thrown: fast on f0, soft landing

// ------------------------------------------------------------ 3D helpers
type V3 = { x: number; y: number; z: number };
const v3 = (x: number, y: number, z: number): V3 => ({ x, y, z });
const add = (a: V3, b: V3): V3 => v3(a.x + b.x, a.y + b.y, a.z + b.z);
const sub = (a: V3, b: V3): V3 => v3(a.x - b.x, a.y - b.y, a.z - b.z);
const mul = (a: V3, k: number): V3 => v3(a.x * k, a.y * k, a.z * k);
const dot = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: V3, b: V3): V3 => v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
const norm = (a: V3): V3 => mul(a, 1 / Math.hypot(a.x, a.y, a.z));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const lerp3 = (a: V3, b: V3, u: number): V3 => v3(lerp(a.x, b.x, u), lerp(a.y, b.y, u), lerp(a.z, b.z, u));
const rad = (d: number) => (d * Math.PI) / 180;

const CX = 540;
// Canvas height + perspective centre. 9:8 by default; the 9:16 export below re-centres the same world for a
// full 1080x1920 frame (window in the upper two thirds, floor underneath) before each render pass.
let CY = 480;
let VH = 960;
const FOCAL = 760; // px per unit at depth 1 (= CSS perspective)
const NEAR = 12;
const FLOOR_Y = 20;

type Cam = { C: V3; T: V3; f: V3; r: V3; d: V3; b: V3; focus: number };
const makeCam = (C: V3, T: V3): Cam => {
  const f = norm(sub(T, C));
  const b = mul(f, -1);
  const r = norm(cross(v3(0, 1, 0), b));
  const d = cross(b, r);
  return { C, T, f, r, d, b, focus: dot(sub(T, C), f) };
};
const project = (cam: Cam, p: V3) => {
  const q = sub(p, cam.C);
  const depth = dot(q, cam.f);
  const s = FOCAL / depth;
  return { sx: CX + dot(q, cam.r) * s, sy: CY + dot(q, cam.d) * s, depth, s };
};
// CSS matrix mapping world -> stage so that `perspective: FOCAL` at (CX, CY)
// reproduces `project` exactly (same camera for DOM planes and SVG floor).
const worldMatrix = (cam: Cam) => {
  const { r, d, b, C } = cam;
  const t = v3(CX - dot(r, C), CY - dot(d, C), FOCAL - dot(b, C));
  const n = (x: number) => x.toFixed(6);
  return `matrix3d(${n(r.x)},${n(d.x)},${n(b.x)},0,${n(r.y)},${n(d.y)},${n(b.y)},0,${n(r.z)},${n(d.z)},${n(b.z)},0,${n(t.x)},${n(t.y)},${n(t.z)},1)`;
};

// ------------------------------------------------------------ window geometry
const W = STUDIO_WIN.w; // 1289
const H = STUDIO_WIN.h; // 898
const wx = (x: number) => x - W / 2; // window x -> world x
const wy = (y: number) => y - H; // window y -> world y

// Composer (prompt box), measured on the 2x captures, window coords.
const BOX = { x: 381, w: 768, bottom: 879, scope: 44, r: 22 } as const;
const TEXT_BOTTOM = BOX.bottom - 57; // 2-line minimum text area ends here
const LINE_H = 24;
const CARD = { dx: 11.5, w: 279, h: 53.5, gap: 14 } as const;
const boxLayout = (cardK: number, line3K: number) => {
  const textTop = TEXT_BOTTOM - (2 * LINE_H + LINE_H * line3K);
  const cardTop = textTop - CARD.gap - CARD.h;
  const innerTop = textTop - 12.5 - cardK * (CARD.h + CARD.gap);
  const top = innerTop - BOX.scope;
  return { textTop, cardTop, innerTop, top, h: BOX.bottom - top };
};

// ------------------------------------------------------------ brief + timing
const BRIEF = STUDIO_VIDEO.brief;
// rec-t085 wraps exactly here: "...how my | agency got ... cut out the | pauses and..."
const B1 = BRIEF.indexOf(" agency got") + 1;
const B2 = BRIEF.indexOf(" pauses and") + 1;
const LINES: [number, number][] = [
  [0, B1],
  [B1, B2],
  [B2, BRIEF.length],
];

const FLY_END = 28;
const GROW: [number, number] = [19, 30];
const MORPH: [number, number] = [27, 36];
const CARD_IN = 29;
const SEND_ON = 32;
const FOCUS_AT = 35;
const TYPE: [number, number] = [42, 74];
const TYPE_EASE = Easing.bezier(0.33, 0.05, 0.6, 1);

const typedAt = (frame: number) =>
  Math.round(interpolate(frame, TYPE, [0, BRIEF.length], { easing: TYPE_EASE, ...clamp }));
const LINE3_AT = (() => {
  for (let f = TYPE[0]; f <= TYPE[1]; f++) if (typedAt(f) > B2) return f;
  return TYPE[1];
})();
const LAST_KEY = (() => {
  for (let f = TYPE[0]; f <= TYPE[1] + 2; f++) if (typedAt(f) >= BRIEF.length) return f;
  return TYPE[1];
})();

// ------------------------------------------------------------ camera
const T0 = v3(-150, -172, 0); // the card slot, where the clip lands
const T1 = v3(146, -150, 0); // composer centre
const CAM_ARC = Easing.bezier(0.38, 0.12, 0.5, 1); // moving on f0, arc keeps going through the typing
const CAM_CRANE = Easing.bezier(0.45, 0.06, 0.5, 1);
// Orbit: from 31deg off-axis and low (looking up) across to ~5deg on the
// other side, craning up to a slight look down, pushing in the whole way;
// most of the arc + crane runs under the typing. Then a slow drift.
const camAt = (frame: number): Cam => {
  const p = interpolate(frame, [0, 86], [0, 1], { easing: CAM_ARC, ...clamp });
  const pE = interpolate(frame, [0, 88], [0, 1], { easing: CAM_CRANE, ...clamp });
  const drift = interpolate(frame, [62, DUR], [0, 1], { easing: DRIFT, ...clamp });
  const yaw = rad(-31 + 34.6 * p + 1.4 * drift);
  const elev = rad(-9.5 + 13.1 * pE + 0.4 * drift);
  const dist = 770 - 158 * p - 14 * drift;
  const T = lerp3(T0, T1, interpolate(frame, [0, 84], [0, 1], { easing: CAM_ARC, ...clamp }));
  const toCam = v3(Math.sin(yaw) * Math.cos(elev), -Math.sin(elev), Math.cos(yaw) * Math.cos(elev));
  return makeCam(add(T, mul(toCam, dist)), T);
};

// ------------------------------------------------------------ the raw clip
const CLIP = { w: 200, h: 112, r: 12, layers: 7, step: 1.35 } as const;
const CAM0 = camAt(0);
const CLIP_START = add(add(add(CAM0.C, mul(CAM0.f, 225)), mul(CAM0.r, -150)), mul(CAM0.d, -78));
// landing: centre of the card slot in the card layout (no line 3 yet)
const CARD_L = boxLayout(1, 0);
const CLIP_LAND = v3(wx(BOX.x + CARD.dx + CARD.w / 2), wy(CARD_L.cardTop + CARD.h / 2), 8);
const TILE_C = v3(wx(BOX.x + CARD.dx + 23.5), wy(CARD_L.cardTop + 26.25), 3);
const CLIP_CTRL = add(lerp3(CLIP_START, CLIP_LAND, 0.5), v3(-30, -120, 70));
const bez = (a: V3, c: V3, b: V3, u: number) => add(add(mul(a, (1 - u) * (1 - u)), mul(c, 2 * u * (1 - u))), mul(b, u * u));

const clipState = (frame: number) => {
  const u = interpolate(frame, [0, FLY_END], [0, 1], { easing: FLIGHT, ...clamp });
  const spin = 1 - interpolate(frame, [0, FLY_END - 3], [0, 1], { easing: FLIGHT, ...clamp });
  const m = interpolate(frame, MORPH, [0, 1], { easing: TRAVEL, ...clamp });
  const pos = lerp3(bez(CLIP_START, CLIP_CTRL, CLIP_LAND, u), TILE_C, m);
  return {
    pos,
    rotY: 34 * spin,
    rotX: -18 * spin,
    rotZ: -11 * spin,
    scale: lerp(1, 0.125, m),
    opacity: interpolate(frame, [MORPH[0] + 2, MORPH[1] - 2], [1, 0], clamp),
  };
};

// ------------------------------------------------------------ icons
const Ico: React.FC<{ d: string; x: number; y: number; s?: number; c?: string; w?: number; fill?: string }> = ({
  d,
  x,
  y,
  s = 16,
  c = S.ink2,
  w = 1.6,
  fill = "none",
}) => (
  <svg
    style={{ position: "absolute", left: x - s / 2, top: y - s / 2 }}
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={c}
    strokeWidth={w}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);
const I = {
  newTask: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4M4 4h7",
  computer: "M3.5 5h17v11h-17zM9 20h6M12 16v4",
  library: "M5 4v16M9 4v16M13 5l4 15M17.5 4.5l3 15",
  creations: "M5 5l5 5M14 14l5 5M7 17a2 2 0 1 0 0-.1M17 7a2 2 0 1 0 0-.1M5 19 19 5",
  automations: "M6 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM8 6h5a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h7M16 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  plugins: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  newProject: "M4 6h6l2 2h8v11H4zM15 13h4M17 11v4",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 20 20",
  sidebar: "M4 5h16v14H4zM10 5v14",
  back: "M19 12H5M11 6l-6 6 6 6",
  fwd: "M5 12h14M13 6l6 6-6 6",
  chev: "M7 10l5 5 5-5",
  left: "M14 6l-6 6 6 6",
  right: "M10 6l6 6-6 6",
  sparkle: "M12 3v5M12 16v5M3 12h5M16 12h5M12 8l1.5 2.5L16 12l-2.5 1.5L12 16l-1.5-2.5L8 12l2.5-1.5z",
  devices: "M3 5h14v9H3zM7 18h6M19 9h2v10h-4v-3",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20h4",
  laptop: "M5 6h14v9.5H5zM3 18.5h18",
  archive: "M4 5h16v4H4zM5.5 9v10h13V9M10 13h4",
  folder: "M3.5 6.5h6l2 2h9v10h-17z",
  plus: "M12 5v14M5 12h14",
  video: "M4 5.5h16v13H4zM10.2 9.4v5.2l4.3-2.6z",
  shield: "M12 3.5l7 2.8v5.2c0 4.3-2.9 7.6-7 9-4.1-1.4-7-4.7-7-9V6.3zM9.2 12.2l2 2 3.7-3.9",
  flask: "M9.5 3.5h5M10.5 3.5v5.2L5.4 18.6a1.4 1.4 0 0 0 1.3 2h10.6a1.4 1.4 0 0 0 1.3-2L13.5 8.7V3.5M7.8 14.5h8.4",
  phone: "M8.5 3.5h7a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19V5a1.5 1.5 0 0 1 1.5-1.5z",
  mic: "M12 4a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V7a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v3",
  up: "M12 19V5M6 11l6-6 6 6",
};

// ------------------------------------------------------------ page imagery
// Template + "Made with Alchemy" thumbnails are the app's own images, cropped
// out of the real capture (rec-t085, 1x). Only the image tiles are used; all
// UI around them is rebuilt.
const PAGE_IMG = "manus2/studio/rec-t085.png";
const Thumb: React.FC<{ x: number; y: number; w: number; h: number; cx: number; cy: number; r: string }> = ({
  x,
  y,
  w,
  h,
  cx,
  cy,
  r,
}) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: r, overflow: "hidden", backgroundColor: S.cardAlt }}>
    <Img
      src={staticFile(PAGE_IMG)}
      style={{ position: "absolute", left: -cx, top: -cy, width: 1512, height: 982, maxWidth: "none" }}
    />
  </div>
);

// ------------------------------------------------------------ sidebar
const NAV_Y = [69, 102, 135, 168, 201, 234, 267, 300];
const NAV_I = [I.newTask, I.computer, "", I.library, I.creations, I.automations, I.plugins, I.more];
const SIDE_W = STUDIO_WIN.sidebarW;

const Sidebar: React.FC = () => (
  <div style={{ position: "absolute", left: 0, top: 0, width: SIDE_W, height: H, backgroundColor: S.sidebar, borderRight: `1px solid ${S.border}` }}>
    {/* macOS traffic lights (the only fixed colors in the window) */}
    {["#FF5F57", "#FEBC2E", "#28C840"].map((c, i) => (
      <div key={c} style={{ position: "absolute", left: 16 + i * 23, top: 16, width: 12, height: 12, borderRadius: 6, backgroundColor: c }} />
    ))}
    <Ico d={I.sidebar} x={100} y={22} s={17} />
    <Ico d={I.back} x={132} y={22} s={16} />
    <Ico d={I.fwd} x={164} y={22} s={16} c={S.faint} />
    <Ico d={I.search} x={207} y={22} s={17} />
    {STUDIO_SIDEBAR.items.map((n, i) => (
      <React.Fragment key={n}>
        {i === 2 ? (
          <Img src={staticFile(MANUS_LOGOS.cueIcon)} style={{ position: "absolute", left: 11, top: NAV_Y[i] - 9, width: 18, height: 18 }} />
        ) : (
          <Ico d={NAV_I[i]} x={20} y={NAV_Y[i]} s={i === 7 ? 18 : 17} w={i === 7 ? 2.6 : 1.6} c={S.ink} />
        )}
        <div style={{ position: "absolute", left: 37, top: NAV_Y[i] - 10, fontSize: 14.5, lineHeight: "20px", color: S.ink, whiteSpace: "nowrap" }}>{n}</div>
      </React.Fragment>
    ))}
    <div
      style={{
        position: "absolute",
        left: 89,
        top: NAV_Y[2] - 11,
        height: 22,
        padding: "0 6px",
        borderRadius: 11,
        backgroundColor: S.card,
        border: `1px solid ${S.border}`,
        boxSizing: "border-box",
        fontSize: 12,
        fontWeight: 600,
        color: S.ink,
        display: "flex",
        alignItems: "center",
      }}
    >
      {STUDIO_SIDEBAR.agentsBadge}
    </div>
    <div style={{ position: "absolute", left: 13, top: 337, fontSize: 13.5, color: S.muted }}>{STUDIO_SIDEBAR.projects}</div>
    <Ico d={I.newProject} x={20} y={379} s={17} c={S.ink} />
    <div style={{ position: "absolute", left: 37, top: 369, fontSize: 14.5, lineHeight: "20px", color: S.ink }}>{STUDIO_SIDEBAR.newProject}</div>
    <div style={{ position: "absolute", left: 13, top: 418, fontSize: 13.5, color: S.muted }}>{STUDIO_SIDEBAR.tasks}</div>
    {/* account row */}
    <div style={{ position: "absolute", left: 10, top: 864, width: 26, height: 26, borderRadius: 13, backgroundColor: S.brand, overflow: "hidden" }}>
      <svg width={26} height={26} viewBox="0 0 26 26">
        <circle cx="13" cy="10" r="4.6" fill={S.maxBadgeBg} opacity={0.92} />
        <path d="M4.5 25c0-5 3.8-8 8.5-8s8.5 3 8.5 8z" fill={S.maxBadgeBg} opacity={0.92} />
      </svg>
    </div>
    <div style={{ position: "absolute", left: 45, top: 867, fontSize: 14.5, fontWeight: 500, lineHeight: "20px", color: S.ink }}>{STUDIO_SIDEBAR.user}</div>
    <Ico d={I.devices} x={153} y={877} s={17} />
    <Ico d={I.bell} x={185} y={877} s={17} />
    <div style={{ position: "absolute", left: 190, top: 868, width: 6, height: 6, borderRadius: 3, backgroundColor: S.fileIcon }} />
    <div style={{ position: "absolute", left: 210, top: 870, width: 15, height: 15, borderRadius: 8, backgroundColor: S.brand }}>
      <Ico d={I.up} x={7.5} y={7.5} s={10} c={S.maxBadgeBg} w={2.6} />
    </div>
  </div>
);

// ------------------------------------------------------------ the Video page (above the composer)
const VideoPage: React.FC = () => (
  <>
    {/* top bar */}
    <div style={{ position: "absolute", left: 263, top: 12, fontSize: 16.5, fontWeight: 500, lineHeight: "22px", color: S.ink }}>{STUDIO_VIDEO.model}</div>
    <Ico d={I.chev} x={387} y={23} s={14} c={S.ink2} />
    <div style={{ position: "absolute", left: 1154, top: 8, width: 82, height: 30, borderRadius: 9, border: `1px solid ${S.border}`, backgroundColor: S.card, boxSizing: "border-box" }}>
      <Ico d={I.sparkle} x={17} y={14} s={15} c={S.ink} />
      <div style={{ position: "absolute", left: 30, top: 5, fontSize: 14.5, fontWeight: 500, lineHeight: "18px", color: S.ink }}>{STUDIO_SIDEBAR.credits}</div>
    </div>
    <Ico d={I.sidebar} x={1258} y={23} s={17} />
    {/* headline */}
    <div
      style={{
        position: "absolute",
        left: SIDE_W,
        width: W - SIDE_W,
        top: 74,
        textAlign: "center",
        fontFamily: MANUS_SERIF,
        fontSize: 49,
        lineHeight: "64px",
        color: S.ink,
        letterSpacing: "-0.4px",
        whiteSpace: "nowrap",
      }}
    >
      {STUDIO_VIDEO.headline}
    </div>
    {/* Template row */}
    <div style={{ position: "absolute", left: 287, top: 202, fontSize: 15.5, fontWeight: 600, lineHeight: "22px", color: S.ink }}>{STUDIO_VIDEO.templateTitle}</div>
    <div style={{ position: "absolute", left: 363, top: 205, fontSize: 12.5, lineHeight: "18px", color: S.muted }}>{STUDIO_VIDEO.templateSub}</div>
    <Ico d={I.left} x={1192} y={212} s={14} c={S.faint} />
    <Ico d={I.right} x={1228} y={212} s={14} c={S.ink2} />
    {STUDIO_VIDEO.templates.map((t, i) => (
      <Thumb key={t} x={288 + 118 * i} y={246} w={106} h={159} cx={492 + 118 * i} cy={280} r="8px" />
    ))}
    {/* Made with Alchemy row (clipped by the page scroller above the composer, as in rec-t085) */}
    <div style={{ position: "absolute", left: 287, top: 441, fontSize: 15.5, fontWeight: 500, lineHeight: "22px", color: S.ink }}>{STUDIO_VIDEO.madeWith}</div>
    <Ico d={I.flask} x={438} y={452} s={15} c={S.brand} />
    <Ico d={I.left} x={1194} y={452} s={14} c={S.faint} />
    <Ico d={I.right} x={1228} y={452} s={14} c={S.ink2} />
    {[0, 1, 2, 3].map((i) => (
      <Thumb key={i} x={288 + 241.5 * i} y={479} w={229} h={88} cx={492 + 241.5 * i} cy={513} r="8px 8px 0 0" />
    ))}
  </>
);

// ------------------------------------------------------------ attachment card + composer
const FileGlyph: React.FC<{ size?: number }> = ({ size = 25 }) => (
  <svg width={size} height={size * 1.1} viewBox="0 0 25 27.5">
    <path d="M3 0h13.5L25 8.5V24.5a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3V3a3 3 0 0 1 3-3z" fill={S.fileIcon} />
    <path d="M16.5 0 25 8.5h-6a2.5 2.5 0 0 1-2.5-2.5z" fill={S.fileIconBg} opacity={0.35} />
    <rect x="6.2" y="12.2" width="12.6" height="9.4" rx="1.4" fill={S.fileIconBg} />
    <path d="M10.6 14.6v4.6l3.9-2.3z" fill={S.fileIcon} />
  </svg>
);

type ComposerProps = {
  frame: number;
  cardK: number;
  line3K: number;
  typed: number;
  caretOn: boolean;
  sendK: number;
};

const Composer: React.FC<ComposerProps> = ({ frame, cardK, line3K, typed, caretOn, sendK }) => {
  const L = boxLayout(cardK, line3K);
  const top = L.top;
  const rel = (y: number) => y - top;
  const chipY = L.h - 29;
  const cardA = interpolate(frame, [CARD_IN, CARD_IN + 8], [0, 1], { easing: ENTER, ...clamp });
  const tileA = interpolate(frame, [CARD_IN + 2, CARD_IN + 5], [0, 1], clamp);
  const nameA = interpolate(frame, [CARD_IN + 4, CARD_IN + 10], [0, 1], { easing: ENTER, ...clamp });
  const metaA = interpolate(frame, [CARD_IN + 6, CARD_IN + 12], [0, 1], { easing: ENTER, ...clamp });
  const active = typed >= LINES[2][0] ? 2 : typed >= LINES[1][0] ? 1 : 0;
  const caret = (
    <span
      style={{
        display: "inline-block",
        width: 1.6,
        height: 19,
        marginLeft: 0.5,
        verticalAlign: "-4px",
        backgroundColor: S.ink,
        opacity: caretOn ? 1 : 0,
      }}
    />
  );
  return (
    <div style={{ position: "absolute", left: BOX.x, top, width: BOX.w, height: L.h }}>
      {/* outer shell + scope strip */}
      <div style={{ position: "absolute", inset: 0, borderRadius: BOX.r, backgroundColor: S.fieldHead, border: `1px solid ${S.border}`, boxSizing: "border-box" }} />
      {[
        { d: I.laptop, cx: 25.5, x: 40.5, t: STUDIO_HOME.scope[0] },
        { d: I.archive, cx: 124.5, x: 139, t: STUDIO_HOME.scope[1] },
        { d: I.folder, cx: 263, x: 277.5, t: STUDIO_HOME.scope[2] },
      ].map((s) => (
        <React.Fragment key={s.t}>
          <Ico d={s.d} x={s.cx} y={22} s={16} c={S.ink2} />
          <div style={{ position: "absolute", left: s.x, top: 12, fontSize: 14.5, lineHeight: "20px", color: S.ink2, whiteSpace: "nowrap" }}>{s.t}</div>
        </React.Fragment>
      ))}
      {/* inner field */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: L.innerTop - top,
          bottom: 0,
          borderRadius: `20px 20px ${BOX.r}px ${BOX.r}px`,
          backgroundColor: S.field,
          border: `1px solid ${S.border}`,
          boxSizing: "border-box",
        }}
      />
      {/* attachment card */}
      {cardK > 0.001 ? (
        <div
          style={{
            position: "absolute",
            left: CARD.dx,
            top: rel(L.cardTop),
            width: CARD.w,
            height: CARD.h,
            opacity: interpolate(cardK, [0.6, 1], [0, 1], clamp),
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 10,
              backgroundColor: S.card,
              border: `1px solid ${S.borderStrong}`,
              boxSizing: "border-box",
              opacity: cardA,
              clipPath: `inset(0 ${((1 - cardA) * 82).toFixed(2)}% 0 0 round 10px)`,
            }}
          />
          <div style={{ position: "absolute", left: 11, top: 12.5, opacity: tileA, transform: `scale(${0.7 + 0.3 * tileA})`, transformOrigin: "50% 50%" }}>
            <FileGlyph />
          </div>
          <div style={{ position: "absolute", left: 46.5, top: 9, fontSize: 15, lineHeight: "20px", color: S.ink, opacity: nameA, transform: `translateY(${(1 - nameA) * 5}px)`, whiteSpace: "nowrap" }}>
            {STUDIO_VIDEO.file.name}
          </div>
          <div style={{ position: "absolute", left: 46.5, top: 28, fontSize: 12.5, lineHeight: "17px", color: S.muted, opacity: metaA, transform: `translateY(${(1 - metaA) * 5}px)`, whiteSpace: "nowrap" }}>
            {STUDIO_VIDEO.file.meta}
          </div>
        </div>
      ) : null}
      {/* text area (clipped so a new line slides in as the box grows) */}
      <div style={{ position: "absolute", left: 0, right: 0, top: rel(L.textTop), height: TEXT_BOTTOM - L.textTop, overflow: "hidden" }}>
        {typed === 0 ? (
          <div style={{ position: "absolute", left: 17.5, top: 0, height: LINE_H, fontSize: 16, lineHeight: `${LINE_H}px`, whiteSpace: "pre", color: S.faint }}>
            <span style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: -1, top: 0 }}>{caret}</span>
            </span>
            {STUDIO_VIDEO.placeholder}
          </div>
        ) : (
          LINES.map(([a, b], i) => {
            const shown = BRIEF.slice(a, Math.max(a, Math.min(b, typed)));
            if (i > active) return null;
            return (
              <div key={`l${i}`} style={{ position: "absolute", left: 17.5, top: i * LINE_H, height: LINE_H, fontSize: 16, lineHeight: `${LINE_H}px`, whiteSpace: "pre", color: S.ink }}>
                {shown}
                {i === active ? caret : null}
              </div>
            );
          })
        )}
      </div>
      {/* chip row */}
      {[29, 69].map((cx, i) => (
        <div key={cx} style={{ position: "absolute", left: cx - 15.5, top: chipY - 15.5, width: 31, height: 31, borderRadius: 16, border: `1px solid ${S.borderStrong}`, boxSizing: "border-box" }}>
          <Ico d={i === 0 ? I.plus : I.video} x={15} y={15} s={i === 0 ? 15 : 16} c={S.ink2} />
        </div>
      ))}
      <Ico d={I.shield} x={109.5} y={chipY} s={16} c={S.muted} />
      <div style={{ position: "absolute", left: 123.5, top: chipY - 10, fontSize: 14.5, lineHeight: "20px", color: S.muted, whiteSpace: "nowrap" }}>{STUDIO_HOME.approve}</div>
      <div
        style={{
          position: "absolute",
          left: 232,
          top: chipY - 15.75,
          width: 77.5,
          height: 31.5,
          borderRadius: 16,
          backgroundColor: S.brandSoft,
          border: `1px solid ${S.brandSoft}`,
          boxSizing: "border-box",
        }}
      >
        <Ico d={I.video} x={15.5} y={15} s={15} c={S.brand} />
        <div style={{ position: "absolute", left: 30.5, top: 5.5, fontSize: 15, fontWeight: 500, lineHeight: "19px", color: S.brand }}>{STUDIO_VIDEO.chipVideo}</div>
      </div>
      <div style={{ position: "absolute", left: 318, top: chipY - 15.75, width: 162.5, height: 31.5, borderRadius: 16, backgroundColor: S.brand }}>
        <Ico d={I.flask} x={16} y={15.75} s={15} c={S.maxBadgeBg} />
        <div style={{ position: "absolute", left: 31, top: 5.5, fontSize: 15, fontWeight: 600, lineHeight: "19px", color: S.maxBadgeBg }}>{STUDIO_VIDEO.chipAlchemy}</div>
        <div
          style={{
            position: "absolute",
            left: 95,
            top: 6.5,
            width: 38.5,
            height: 18.5,
            borderRadius: 5,
            backgroundColor: S.maxBadgeBg,
            color: S.maxBadgeInk,
            fontFamily: MANUS_SERIF,
            fontWeight: 700,
            fontSize: 12.5,
            lineHeight: "18.5px",
            textAlign: "center",
          }}
        >
          {STUDIO_VIDEO.chipMax}
        </div>
        <Ico d={I.chev} x={147.5} y={15.75} s={13} c={S.maxBadgeBg} w={1.9} />
      </div>
      <div style={{ position: "absolute", left: 489, top: chipY - 15.75, width: 91, height: 31.5, borderRadius: 16, border: `1px solid ${S.borderStrong}`, boxSizing: "border-box" }}>
        <Ico d={I.phone} x={16.5} y={15} s={16} c={S.ink2} />
        <div style={{ position: "absolute", left: 30, top: 5.5, fontSize: 15, lineHeight: "19px", color: S.ink }}>{STUDIO_VIDEO.chipRatio}</div>
        <Ico d={I.chev} x={74} y={15} s={13} c={S.ink2} w={1.9} />
      </div>
      <div style={{ position: "absolute", left: 626.5, top: chipY - 10, fontSize: 15, lineHeight: "20px", color: S.ink2 }}>{STUDIO_VIDEO.chipQuality}</div>
      <Ico d={I.chev} x={667} y={chipY} s={13} c={S.ink2} w={1.9} />
      <Ico d={I.mic} x={699} y={chipY} s={17} c={S.ink2} />
      {/* send: disabled until the clip is attached (as in the raw recording) */}
      <div style={{ position: "absolute", left: 723, top: chipY - 16, width: 32, height: 32, borderRadius: 16, backgroundColor: S.borderStrong }}>
        <Ico d={I.up} x={16} y={16} s={16} c={S.faint} w={2.2} />
      </div>
      <div style={{ position: "absolute", left: 723, top: chipY - 16, width: 32, height: 32, borderRadius: 16, backgroundColor: S.sendBg, opacity: sendK }}>
        <Ico d={I.up} x={16} y={16} s={16} c={S.sendInk} w={2.2} />
      </div>
    </div>
  );
};

// ------------------------------------------------------------ the Studio window plane
type CastShadow = { x: number; y: number; w: number; h: number; blur: number; a: number } | null;
const StudioWindow: React.FC<ComposerProps & { shadow: CastShadow; pageBlur: number }> = ({ shadow, pageBlur, ...props }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      width: W,
      height: H,
      borderRadius: STUDIO_WIN.radius,
      backgroundColor: S.win,
      boxShadow: S.shadow,
      overflow: "hidden",
      fontFamily: MANUS_FONT,
      WebkitFontSmoothing: "antialiased",
    }}
  >
    {/* rack focus: the page is soft while the camera is off-axis, the composer is the sharp hero */}
    <div style={{ position: "absolute", inset: 0, filter: pageBlur > 0.2 ? `blur(${pageBlur}px)` : undefined }}>
      <Sidebar />
      <VideoPage />
    </div>
    {shadow && shadow.a > 0.004 ? (
      <div
        style={{
          position: "absolute",
          left: shadow.x - shadow.w / 2,
          top: shadow.y - shadow.h / 2,
          width: shadow.w,
          height: shadow.h,
          borderRadius: 18,
          backgroundColor: `rgba(0,0,0,${shadow.a.toFixed(3)})`,
          filter: `blur(${shadow.blur.toFixed(1)}px)`,
        }}
      />
    ) : null}
    <Composer {...props} />
  </div>
);

// ------------------------------------------------------------ floor (projected by hand)
const GRID = MRD_GRID.spacing;
const floorSegs = (cam: Cam) => {
  const out: string[] = [];
  const seg = (a: V3, b: V3) => {
    const da = dot(sub(a, cam.C), cam.f);
    const db = dot(sub(b, cam.C), cam.f);
    if (da < NEAR && db < NEAR) return;
    let p = a;
    let q = b;
    if (da < NEAR) p = lerp3(a, b, (NEAR - da) / (db - da));
    if (db < NEAR) q = lerp3(a, b, (NEAR - da) / (db - da));
    const P = project(cam, p);
    const Q = project(cam, q);
    out.push(`M${P.sx.toFixed(1)} ${P.sy.toFixed(1)}L${Q.sx.toFixed(1)} ${Q.sy.toFixed(1)}`);
  };
  const X0 = -40 * GRID;
  const X1 = 40 * GRID;
  const Z0 = -44 * GRID;
  const Z1 = 14 * GRID;
  for (let i = -40; i <= 40; i++) seg(v3(i * GRID + GRID / 2, FLOOR_Y, Z0), v3(i * GRID + GRID / 2, FLOOR_Y, Z1));
  for (let k = -44; k <= 14; k++) seg(v3(X0, FLOOR_Y, k * GRID), v3(X1, FLOOR_Y, k * GRID));
  return out.join("");
};
// project a floor polygon, clipped against the near plane (Sutherland-Hodgman)
const floorPoly = (cam: Cam, pts: V3[]) => {
  const dep = (p: V3) => dot(sub(p, cam.C), cam.f);
  const kept: V3[] = [];
  pts.forEach((a, i) => {
    const b = pts[(i + 1) % pts.length];
    const da = dep(a);
    const db = dep(b);
    if (da >= NEAR) kept.push(a);
    if ((da >= NEAR) !== (db >= NEAR)) kept.push(lerp3(a, b, (NEAR - da) / (db - da)));
  });
  return kept
    .map((p) => project(cam, p))
    .map((p) => `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`)
    .join(" ");
};
const ellipseOnFloor = (cx: number, cz: number, rx: number, rz: number, n = 40) =>
  Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return v3(cx + Math.cos(t) * rx, FLOOR_Y, cz + Math.sin(t) * rz);
  });

// ------------------------------------------------------------ scene
const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (n: string) => `${n}${uid}`;
  const cam = camAt(frame);
  const M = worldMatrix(cam);
  const pageBlur = Math.round(interpolate(frame, [0, 62], [2.6, 0], { easing: DECEL, ...clamp }) * 4) / 4;

  // horizon (floor points at infinity)
  const hz = norm(v3(cam.f.x, 0, cam.f.z));
  const horizonY = CY + (FOCAL * dot(cam.d, hz)) / dot(cam.f, hz);

  // composer state
  const cardK = interpolate(frame, GROW, [0, 1], { easing: DECEL, ...clamp });
  const line3K = interpolate(frame, [LINE3_AT, LINE3_AT + 5], [0, 1], { easing: DECEL, ...clamp });
  const typed = typedAt(frame);
  const typing = frame >= TYPE[0] && frame <= LAST_KEY;
  const idleFrom = frame < TYPE[0] ? FOCUS_AT : LAST_KEY;
  const caretOn = frame >= FOCUS_AT && (typing || Math.floor((frame - idleFrom) / 15) % 2 === 0);
  const sendK = interpolate(frame, [SEND_ON, SEND_ON + 4], [0, 1], clamp);

  // the raw clip
  const clip = clipState(frame);
  const cp = project(cam, clip.pos);
  const clipVisible = clip.opacity > 0.005 && cp.depth > NEAR;
  // depth of field: circle of confusion (screen px), applied in the tile's local space
  const landK = interpolate(frame, [FLY_END - 9, FLY_END - 1], [1, 0], clamp);
  const coc = landK * Math.min(26, 8 * FOCAL * Math.abs(1 / cp.depth - 1 / cam.focus));
  const localBlur = Math.round(((coc / Math.max(0.3, cp.s * clip.scale)) * 2)) / 2;
  // cast shadow on the window plane (key light from above-front-left)
  const zc = clip.pos.z;
  const castA = clipVisible ? 0.3 * interpolate(zc, [8, 260], [1, 0], clamp) * clip.opacity : 0;
  const shadow: CastShadow =
    castA > 0.004
      ? {
          x: clip.pos.x + 0.16 * zc + W / 2,
          y: clip.pos.y + 0.32 * zc + H + 6,
          w: CLIP.w * clip.scale * (1 + zc / 500),
          h: CLIP.h * clip.scale * (1 + zc / 500),
          blur: 5 + zc * 0.09,
          a: castA,
        }
      : null;
  // contact shadow on the floor while it flies
  const lift = FLOOR_Y - clip.pos.y;
  const floorShadowA = clipVisible ? 0.78 * interpolate(lift, [80, 420], [1, 0.45], clamp) * interpolate(zc, [20, 90], [0, 1], clamp) : 0;
  const floorShadowR = (CLIP.w / 2) * clip.scale * (1 + lift / 520);

  // world light + window contact shadow
  const pool = floorPoly(cam, ellipseOnFloor(40, 300, 1250, 620));
  const poolCore = floorPoly(cam, ellipseOnFloor(-60, 230, 620, 300));
  const baseY = project(cam, v3(cam.T.x, FLOOR_Y, 0)).sy; // window base on screen
  const contact = floorPoly(cam, [v3(-672, FLOOR_Y, -30), v3(672, FLOOR_Y, -30), v3(686, FLOOR_Y, 78), v3(-686, FLOOR_Y, 78)]);
  const contactTight = floorPoly(cam, [v3(-650, FLOOR_Y, -6), v3(650, FLOOR_Y, -6), v3(654, FLOOR_Y, 20), v3(-654, FLOOR_Y, 20)]);
  const clipFloor = floorShadowA > 0.01 ? floorPoly(cam, ellipseOnFloor(clip.pos.x + 10, clip.pos.z + 6, floorShadowR, floorShadowR * 0.62, 28)) : "";
  const floorBlur = Math.max(4, 7 + lift * 0.035) * Math.min(2.2, project(cam, v3(clip.pos.x, FLOOR_Y, clip.pos.z)).s);

  const hzC = Math.max(-400, Math.min(1400, horizonY));
  const grid = floorSegs(cam);

  return (
    <AbsoluteFill style={{ backgroundColor: MRD.bg, overflow: "hidden" }}>
      {/* sky + floor tone */}
      <AbsoluteFill style={{ background: `radial-gradient(110% 60% at 50% ${hzC}px, #141716 0%, #0E100F 42%, ${MRD.bg} 100%)` }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: Math.max(0, hzC), bottom: 0, background: `linear-gradient(180deg, #151817 0%, #0F1110 40%, #0A0A0A 100%)` }} />

      <svg width={1080} height={VH} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id={id("fog")} gradientUnits="userSpaceOnUse" x1="0" y1={hzC} x2="0" y2={hzC + 240}>
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#fff" stopOpacity="1" />
          </linearGradient>
          <linearGradient id={id("far")} gradientUnits="userSpaceOnUse" x1="0" y1={baseY + 110} x2="0" y2={baseY + 250}>
            <stop offset="0" stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={id("near")} gradientUnits="userSpaceOnUse" x1="0" y1={baseY + 110} x2="0" y2={baseY + 250}>
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#fff" stopOpacity="1" />
          </linearGradient>
          <mask id={id("fogM")} maskUnits="userSpaceOnUse" x="0" y="0" width="1080" height={VH}>
            <rect x="0" y="0" width="1080" height={VH} fill={`url(#${id("fog")})`} />
          </mask>
          <mask id={id("farM")} maskUnits="userSpaceOnUse" x="0" y="0" width="1080" height={VH}>
            <rect x="0" y="0" width="1080" height={VH} fill={`url(#${id("far")})`} />
          </mask>
          <mask id={id("nearM")} maskUnits="userSpaceOnUse" x="0" y="0" width="1080" height={VH}>
            <rect x="0" y="0" width="1080" height={VH} fill={`url(#${id("near")})`} />
          </mask>
          <filter id={id("b40")} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="46" />
          </filter>
          <filter id={id("b14")} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter id={id("b5")} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <filter id={id("b2")} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
          <filter id={id("bclip")} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation={floorBlur.toFixed(1)} />
          </filter>
        </defs>
        {/* world light pooled on the floor (green only as light, never on UI) */}
        <polygon points={pool} fill="#FFFFFF" opacity={0.05} filter={`url(#${id("b40")})`} />
        <polygon points={pool} fill={MRD.green} opacity={0.05} filter={`url(#${id("b40")})`} />
        <polygon points={poolCore} fill="#FFFFFF" opacity={0.085} filter={`url(#${id("b40")})`} />
        {/* grid: sharp in the focus band, soft near the lens, dissolving at the horizon */}
        <g mask={`url(#${id("fogM")})`}>
          <g mask={`url(#${id("farM")})`}>
            <path d={grid} stroke="#FFFFFF" strokeOpacity={0.11} strokeWidth={1} fill="none" />
          </g>
        </g>
        <g mask={`url(#${id("nearM")})`}>
          <path d={grid} stroke="#FFFFFF" strokeOpacity={0.09} strokeWidth={1.6} fill="none" filter={`url(#${id("b2")})`} />
        </g>
        <polygon points={contact} fill="#000" opacity={0.75} filter={`url(#${id("b14")})`} />
        <polygon points={contactTight} fill="#000" opacity={0.8} filter={`url(#${id("b5")})`} />
        {clipFloor ? <polygon points={clipFloor} fill="#000" opacity={floorShadowA} filter={`url(#${id("bclip")})`} /> : null}
      </svg>

      {/* horizon haze: the far floor dissolves instead of ending in a line */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(18,21,20,0) ${hzC - 150}px, rgba(22,26,24,0.9) ${hzC + 6}px, rgba(18,21,20,0.5) ${hzC + 70}px, rgba(18,21,20,0) ${hzC + 200}px)`,
        }}
      />

      {/* the Studio window, upright on the floor */}
      <div style={{ position: "absolute", inset: 0, perspective: `${FOCAL}px`, perspectiveOrigin: `${CX}px ${CY}px` }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, transformStyle: "preserve-3d", transformOrigin: "0 0 0", transform: M }}>
          <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0 0", transform: `translate3d(${-W / 2}px, ${-H}px, 0px)` }}>
            <StudioWindow frame={frame} cardK={cardK} line3K={line3K} typed={typed} caretOn={caretOn} sendK={sendK} shadow={shadow} pageBlur={pageBlur} />
          </div>
        </div>
      </div>

      {/* the raw clip, always in front of the window */}
      {clipVisible ? (
        <div style={{ position: "absolute", inset: 0, perspective: `${FOCAL}px`, perspectiveOrigin: `${CX}px ${CY}px` }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, transformStyle: "preserve-3d", transformOrigin: "0 0 0", transform: M }}>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                transformStyle: "preserve-3d",
                transformOrigin: "0 0 0",
                transform: `translate3d(${clip.pos.x.toFixed(2)}px, ${clip.pos.y.toFixed(2)}px, ${clip.pos.z.toFixed(2)}px) rotateY(${clip.rotY.toFixed(3)}deg) rotateX(${clip.rotX.toFixed(3)}deg) rotateZ(${clip.rotZ.toFixed(3)}deg) scale(${clip.scale.toFixed(4)})`,
              }}
            >
              {Array.from({ length: CLIP.layers }, (_, k) => CLIP.layers - 1 - k).map((i) => (
                <div
                  key={`cl${i}`}
                  style={{
                    position: "absolute",
                    left: -CLIP.w / 2,
                    top: -CLIP.h / 2,
                    width: CLIP.w,
                    height: CLIP.h,
                    borderRadius: CLIP.r,
                    overflow: "hidden",
                    transform: `translateZ(${(-i * CLIP.step).toFixed(2)}px)`,
                    backgroundColor: i === 0 ? MRD.card : i < 3 ? MRD.card : MRD.cardSoft,
                    opacity: clip.opacity,
                    filter: localBlur > 0.25 ? `blur(${localBlur}px)` : undefined,
                    boxShadow: i === CLIP.layers - 1 ? "0 18px 34px rgba(0,0,0,0.45)" : undefined,
                  }}
                >
                  {i === 0 ? (
                    <>
                      <Img src={staticFile(STUDIO_ASSETS.clipFrame)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <div style={{ position: "absolute", inset: 0, borderRadius: CLIP.r, boxShadow: `inset 0 0 0 1px ${MRD.hairline}` }} />
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* lens vignette */}
      <AbsoluteFill style={{ background: "radial-gradient(125% 100% at 50% 50%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.34) 100%)" }} />
    </AbsoluteFill>
  );
};

// `real` = delivered length; the scene's own 100-frame clock is played evenly slower to fill it.
const makeComp = (cy: number, vh: number, real: number = DUR): React.FC => {
  const Layout: React.FC = () => {
    const f = useCurrentFrame();
    CY = cy;
    VH = vh;
    return (
      <Freeze frame={(f * (DUR - 1)) / (real - 1)}>
        <Scene />
      </Freeze>
    );
  };
  const Comp: React.FC = () => (
    <AbsoluteFill style={{ backgroundColor: MRD.bg }}>
      <CameraMotionBlur shutterAngle={180} samples={5}>
        <Layout />
      </CameraMotionBlur>
    </AbsoluteFill>
  );
  return Comp;
};

export const MbP2RawClipsFewPrompts = makeComp(480, 960);
// 1080x1920: the prompt box (the camera's look-at target) sits at y 1250, clear of the Reels UI zones.
export const MBP2_916_DURATION = 150; // 5.0s, covers the spoken line
export const MbP2RawClipsFewPrompts916 = makeComp(1250, 1920, MBP2_916_DURATION);
