import React from "react";
import { AbsoluteFill, Easing, Freeze, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { MANUS, MANUS_FONT, MANUS_LOGOS, MRD, MRD_GRADIENT, loadManusFont } from "./theme";
import {
  STUDIO_ASSETS,
  STUDIO_EDITOR,
  STUDIO_HOME,
  STUDIO_SIDEBAR,
  STUDIO_VIDEO,
  STUDIO_WIN,
  studio,
} from "./studio";

loadManusFont();

// ===========================================================================
// MbP4PartThatTookHours: 1080x960 (9:8) @ 30fps (wrapped by withSafeFrame)
// VO (never on screen): "Then I do the part that used to take me hours."
//
// 3D world (BRIEF-v2-3D.md): Bennett's Manus Studio window (chat + Video
// Editor split view, light palette, rebuilt from raw-latest / raw-t660 /
// rec-t560 / t850 frames) stands upright on the Merydian perspective floor.
// The finished first cut is ALSO laid out as a long physical timeline strip
// on the floor (ruler, 13 C1107.MP4 take segments, bgm_reel.mp3 lane) running
// into the window base under the editor's real timeline. One keyed camera
// (position + look-at), CSS 3D planes for the UI, hand-projected floor.
//
//   0-48   already moving: low dolly along the strip toward the window, the
//          playhead scrubbing back with it (take boundaries + ruler seconds
//          stream past, near pieces large and soft). Camera rises and racks
//          focus onto the editor timeline; playhead lands on 00:00.
//   48-74  lift + arc left across the window to the chat column's message
//          box (preview + timeline seen at an angle on the way), near-frontal.
//   76     the plain arrow cursor clicks into the empty "Message Manus" box.
//   78-end focus ring + blinking caret, nothing typed, slow drift. End hold.
// ===========================================================================

// Delivered length 135 frames (4.5s) to cover the spoken line; the scene is authored on a 102-frame clock and
// played evenly slower (no early freeze).
export const MBP4PARTTHATTOOKHOURS_DURATION = 135;
const DUR = 102;

const S = studio();

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const TRAVEL = Easing.bezier(0.65, 0, 0.35, 1);
const DECEL = Easing.bezier(0.2, 0, 0, 1);
const DOLLY = Easing.bezier(0.3, 0.25, 0.5, 1); // moving on frame 0, long soft landing
const DRIFT = Easing.bezier(0.3, 0, 0.7, 1);

// ------------------------------------------------------------------ 3D math
type V3 = { x: number; y: number; z: number };
const v3 = (x: number, y: number, z: number): V3 => ({ x, y, z });
const sub = (a: V3, b: V3): V3 => v3(a.x - b.x, a.y - b.y, a.z - b.z);
const dot = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: V3, b: V3): V3 => v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
const norm = (a: V3): V3 => {
  const l = Math.hypot(a.x, a.y, a.z) || 1;
  return v3(a.x / l, a.y / l, a.z / l);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: V3, b: V3, t: number): V3 => v3(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t));
const quad3 = (a: V3, c: V3, b: V3, t: number): V3 => lerp3(lerp3(a, c, t), lerp3(c, b, t), t);
const UP: V3 = v3(0, -1, 0); // CSS world: x right, y DOWN, z toward the viewer; floor at y = 0

const PERSP = 760; // focal length in px (CSS perspective)
const CX = 540;
const CY = 480;
const NEAR = 30;

type Cam = { pos: V3; fwd: V3; right: V3; down: V3; focus: number };
const makeCam = (pos: V3, tgt: V3, focusPt: V3): Cam => {
  const fwd = norm(sub(tgt, pos));
  const right = norm(cross(UP, fwd));
  const down = cross(right, fwd);
  return { pos, fwd, right, down, focus: Math.max(60, dot(sub(focusPt, pos), fwd)) };
};
const project = (c: Cam, p: V3) => {
  const d = sub(p, c.pos);
  const depth = dot(d, c.fwd);
  const s = PERSP / Math.max(0.001, depth);
  return { depth, s, sx: CX + dot(d, c.right) * s, sy: CY + dot(d, c.down) * s };
};
// world -> camera space, then pushed out by PERSP so the CSS perspective eye sits at the camera
const viewMatrix = (c: Cam) => {
  const { right: r, down: d, fwd: f, pos: p } = c;
  const m = [r.x, d.x, -f.x, 0, r.y, d.y, -f.y, 0, r.z, d.z, -f.z, 0, -dot(r, p), -dot(d, p), dot(f, p) + PERSP, 1];
  return `matrix3d(${m.map((n) => n.toFixed(6)).join(",")})`;
};
// depth of field: screen-space blur from the focus plane
const dofPx = (depth: number, focus: number, amount = 1) =>
  Math.min(16, 4.5 * PERSP * Math.abs(1 / depth - 1 / focus)) * amount;
const q = (b: number) => Math.round(b * 2) / 2;

// deterministic noise
const rnd = (i: number, s = 0) => {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ------------------------------------------------------------------ world
// Studio window (1289 x 898 CSS px, real geometry) stands at z = 0 facing +z,
// bottom edge hovering 20px above the floor.
const WIN = { w: STUDIO_WIN.w, h: STUDIO_WIN.h, x0: -644, y0: -(20 + STUDIO_WIN.h), r: STUDIO_WIN.radius } as const;
const wx = (u: number) => WIN.x0 + u;
const wy = (v: number) => WIN.y0 + v;

// The cut: 13 selected takes, 42.2 s (the editor shows 00:42:2).
const TAKES = [2.4, 3.6, 2.9, 4.1, 3.3, 2.7, 3.8, 3.1, 4.4, 2.6, 3.5, 2.9, 2.9];
const TAKE_T0 = TAKES.map((_, i) => TAKES.slice(0, i).reduce((s, v) => s + v, 0));
const TOTAL = TAKES.reduce((s, v) => s + v, 0);
const takeAt = (t: number) => {
  let i = 0;
  while (i < TAKES.length - 1 && t >= TAKE_T0[i + 1]) i++;
  return i;
};
// preview punch-in per take (take 1 = the real reframed fill seen at t=850s)
const FRAMING = [
  { s: 1, dx: 0, dy: 0 },
  { s: 1.12, dx: -10, dy: 8 },
  { s: 1.05, dx: 8, dy: 2 },
  { s: 1.16, dx: -4, dy: 12 },
  { s: 1.08, dx: 12, dy: 4 },
  { s: 1.03, dx: -8, dy: 0 },
  { s: 1.14, dx: 6, dy: 10 },
  { s: 1.07, dx: -12, dy: 4 },
  { s: 1.18, dx: 2, dy: 14 },
  { s: 1.04, dx: 10, dy: 0 },
  { s: 1.11, dx: -6, dy: 6 },
  { s: 1.06, dx: 4, dy: 2 },
  { s: 1.13, dx: -2, dy: 8 },
];

// Timeline geometry in window px (raw-latest-2x.png): 100 px per second, time 0 at u 875.5.
const TL = { t0u: 875.5, pps: 100, rulerTop: 707.5, mainTop: 746, mainH: 75, musicTop: 822, musicH: 48 } as const;
// Floor strip = the same timeline scaled K, time running toward the camera (+z),
// ruler on the +x side, music lane on the -x side.
const K = 2.2;
const TS = TL.pps * K; // floor px per second
const STRIP_Z0 = 40; // time 0 sits just in front of the window base
const STRIP_X0 = 640; // world x of the ruler's outer edge
const SV = {
  ruler: 0,
  main: (TL.mainTop - TL.rulerTop) * K,
  music: (TL.musicTop - TL.rulerTop) * K,
  end: (TL.musicTop + TL.musicH - TL.rulerTop) * K,
} as const;
const STRIP_PRE = 0.15; // bed starts a little before 00:00
const tz = (t: number) => STRIP_Z0 + t * TS;

// ------------------------------------------------------------------ camera
const PLAY_T0 = 14.6;
const A_END = 48;
const B_END = 74;
const CLICK = 77;
const MSG = { x: wx(256), y: wy(783), w: 491, h: 94 } as const; // message box (world)
const END_TGT = v3(wx(503), -150, 0);
const END_POS = v3(wx(503), -176, 382);

const dollyA = (f: number) => {
  const a = interpolate(f, [0, A_END], [0, 1], { ...clamp, easing: DOLLY });
  const playT = PLAY_T0 * (1 - a);
  const zP = tz(playT);
  const rise = Easing.bezier(0.45, 0, 0.55, 1)(a);
  const pos = v3(lerp(366, 372, rise), -lerp(150, 262, rise), zP + lerp(520, 560, a));
  // look down the strip toward the window, focus on the playhead; then rack onto the editor timeline
  const look = v3(lerp(330, 372, a), 10, zP - 1150);
  const tWin = v3(372, -150, 0);
  const w = interpolate(a, [0.45, 1], [0, 1], { ...clamp, easing: TRAVEL });
  const focusPt = lerp3(v3(STRIP_X0 - SV.end / 2, 0, zP), tWin, w);
  return { pos, tgt: lerp3(look, tWin, w), focusPt, playT };
};

const cameraAt = (f: number) => {
  const A = dollyA(Math.min(f, A_END));
  if (f <= A_END) return A;
  if (f <= B_END) {
    const s = interpolate(f, [A_END, B_END], [0, 1], { ...clamp, easing: TRAVEL });
    const st = interpolate(f, [A_END, B_END - 4], [0, 1], { ...clamp, easing: Easing.bezier(0.55, 0, 0.3, 1) });
    const ctrl = v3(260, -250, 780);
    const tgt = lerp3(A.tgt, END_TGT, st);
    return { pos: quad3(A.pos, ctrl, END_POS, s), tgt, focusPt: tgt, playT: 0 };
  }
  const d = interpolate(f, [B_END, DUR], [0, 1], { ...clamp, easing: DRIFT });
  const tgt = v3(END_TGT.x + 2 * d, END_TGT.y, END_TGT.z);
  return { pos: v3(END_POS.x + 3 * d, END_POS.y - 2 * d, END_POS.z - 10 * d), tgt, focusPt: tgt, playT: 0 };
};

// ------------------------------------------------------------------ icons
const Ico: React.FC<{ d: string; x: number; y: number; s?: number; c?: string; w?: number; fill?: string }> = ({
  d,
  x,
  y,
  s = 18,
  c = S.ink,
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
const RR = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1-${r} ${r}h-${w - 2 * r}a${r} ${r} 0 0 1-${r}-${r}v-${h - 2 * r}a${r} ${r} 0 0 1 ${r}-${r}z`;
const I = {
  panelL: `${RR(3.5, 4.5, 17, 15, 2.5)}M9.5 4.5v15`,
  panelR: `${RR(3.5, 4.5, 17, 15, 2.5)}M14.5 4.5v15`,
  back: "M19 12H5M11 6l-6 6 6 6",
  fwd: "M5 12h14M13 6l6 6-6 6",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 20 20",
  newTask: "M11 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V13M17.5 3.5l3 3-8.5 8.5H9v-3z",
  computer: `${RR(3.5, 4.5, 17, 11.5, 1.5)}M9 20h6M12 16v4`,
  library: "M5 4v16M9 4v16M13 5.2l4.6 14.6",
  creations: "M5 19 19 5M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  automations: `${RR(4, 4, 6, 6, 1.5)}${RR(14, 14, 6, 6, 1.5)}M7 10v3.5a3.5 3.5 0 0 0 3.5 3.5H14`,
  plugins:
    "M7.5 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM16.5 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM7.5 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM16.5 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  newProject: "M20 11V8.5a1 1 0 0 0-1-1h-7.5l-2-2.5H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8M17 14.5v6M14 17.5h6",
  chevD: "M7 10l5 5 5-5",
  chevL: "M14 6l-6 6 6 6",
  chevR: "M10 6l6 6-6 6",
  share: "M14 5l6 6-6 6M20 11h-8.5A6.5 6.5 0 0 0 5 17.5V19",
  doc: `${RR(4.5, 4, 15, 16, 2)}M8 9h8M8 12.5h8M8 16h5`,
  dots: "M5 12h.01M12 12h.01M19 12h.01",
  videoSq: `${RR(3.5, 4.5, 17, 15, 2.5)}M10 9.2v5.6l4.8-2.8z`,
  close: "M6.5 6.5l11 11M17.5 6.5l-11 11",
  plus: "M12 5v14M5 12h14",
  expand: "M14 4h6v6M20 4l-6.5 6.5M10 20H4v-6M4 20l6.5-6.5",
  upload: "M12 15V4.5M7.5 9 12 4.5 16.5 9M4.5 14.5V18a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3.5",
  play: "M8 5.5v13l10.5-6.5z",
  fullscreen: "M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5",
  pointer: "M5.5 3.5l5.2 15.5 2.4-6.4 6.4-2.4z",
  crop: "M6.5 2.5v15h15M2.5 6.5h15v15",
  undo: "M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11",
  redo: "M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13",
  split: "M12 4v16M8.5 8.5 5 12l3.5 3.5M15.5 8.5 19 12l-3.5 3.5",
  zoomOut: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 20 20M8 10.5h5",
  zoomIn: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 20 20M8 10.5h5M10.5 8v5",
  film: `${RR(4, 9, 16, 11, 1.8)}M4.6 9 5.4 6a1.5 1.5 0 0 1 1.8-1.1l11.4 3M9.4 5.6 8.6 8.8M14.2 6.9l-.8 2.1`,
  eye: "M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  speaker: "M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11",
  note: "M9 17.5V6l10-2v11.5M9 17.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM19 15.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z",
  shield: "M12 3.5l7 2.6v5.4c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6.1zM9 12l2 2 4-4",
  laptop: `${RR(5, 5.5, 14, 9.5, 1.2)}M3 18.5h18`,
  mic: "M12 4a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V7a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v3",
  up: "M12 19V5M6 11l6-6 6 6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  devices: `${RR(3, 4.5, 14, 10, 1.2)}M7 18.5h6M10 14.5v4M17.5 9.5h3v10h-5`,
  bell: "M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5h4",
  task: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
};

// text with a vertical CENTER at y
const Tx: React.FC<{
  x: number;
  y: number;
  size: number;
  color: string;
  weight?: number;
  w?: number;
  align?: "left" | "center" | "right";
  children: React.ReactNode;
}> = ({ x, y, size, color, weight = 400, w, align = "left", children }) => {
  const lh = Math.round(size * 1.35);
  const left = align === "left" ? x : align === "center" ? x - (w ?? 0) / 2 : x - (w ?? 0);
  return (
    <div
      style={{
        position: "absolute",
        left,
        top: y - lh / 2,
        width: w,
        height: lh,
        lineHeight: `${lh}px`,
        fontSize: size,
        fontWeight: weight,
        color,
        whiteSpace: "nowrap",
        textAlign: align,
        overflow: w ? "hidden" : undefined,
      }}
    >
      {children}
    </div>
  );
};

// ------------------------------------------------------------------ clip language (real timeline clip)
const env = (i: number, seed: number, music: boolean) => {
  if (music) return 0.58 + 0.2 * Math.abs(Math.sin(i * 0.55 + seed)) + 0.1 * rnd(i, seed + 3);
  if (i < 2) return 0.12 + 0.2 * i;
  const dip = rnd(i, seed + 7) < 0.07 ? 0.3 : rnd(i, seed + 9) < 0.18 ? 0.12 : 0;
  return 0.84 + 0.1 * rnd(i, seed) - dip;
};
const Wave: React.FC<{ w: number; h: number; top: number; seed: number; k: number; music?: boolean; offset?: number }> = ({
  w,
  h,
  top,
  seed,
  k,
  music = false,
  offset = 0,
}) => {
  const step = 3 * k;
  const i0 = Math.floor(offset / step);
  const n = Math.ceil(w / step) + 1;
  const pts: string[] = [`M0 ${h}`];
  for (let j = 0; j <= n; j++) {
    const i = i0 + j;
    const x = i * step - offset;
    const a = env(i, seed, music);
    pts.push(`L${x.toFixed(1)} ${(h - a * h * 0.86).toFixed(1)}`);
  }
  pts.push(`L${w} ${h}Z`);
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top, display: "block" }}>
      <rect x={0} y={0} width={w} height={h} fill={S.clipWaveBg} />
      <path d={pts.join("")} fill={S.clipWave} opacity={0.55} />
      <rect x={0} y={0} width={w} height={Math.max(1, k)} fill={S.clipWave} />
    </svg>
  );
};

// A take segment (video clip): title strip, thumbnail filmstrip, waveform.
const VideoClip: React.FC<{ w: number; k: number; seed: number }> = ({ w, k, seed }) => {
  const head = 17.5 * k;
  const film = 34 * k;
  const wave = 18.5 * k;
  const tw = (film * 16) / 9;
  const n = Math.ceil(w / tw);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: w, height: head + film + wave, borderRadius: 4 * k, overflow: "hidden", backgroundColor: S.clipHead }}>
      <div style={{ position: "absolute", left: 8.5 * k, top: 0, height: head, lineHeight: `${head}px`, fontSize: 12.5 * k, color: S.ink, whiteSpace: "nowrap" }}>
        {STUDIO_EDITOR.clip.name}
      </div>
      <div style={{ position: "absolute", left: 0, top: head, width: w, height: film, backgroundColor: S.previewBg, overflow: "hidden" }}>
        {Array.from({ length: n }, (_, i) => (
          <Img
            key={i}
            src={staticFile(STUDIO_ASSETS.clipFrame)}
            style={{ position: "absolute", left: i * tw, top: 0, width: tw - Math.max(1, 0.8 * k), height: film, objectFit: "cover" }}
          />
        ))}
      </div>
      <Wave w={w} h={wave} top={head + film} seed={seed} k={k} />
    </div>
  );
};

// The music clip (bgm_reel.mp3): same clip language, waveform only.
// `from`/`w` render the slice [from, from + w] (px) of a clip that is `full` px long.
const MusicClip: React.FC<{ k: number; full: number; from: number; w: number }> = ({ k, full, from, w }) => {
  const head = 14 * k;
  const wave = 26 * k;
  const r = 4 * k;
  const atStart = from <= 0;
  const atEnd = from + w >= full;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: w,
        height: head + wave,
        overflow: "hidden",
        backgroundColor: S.clipHead,
        borderRadius: `${atStart ? r : 0}px ${atEnd ? r : 0}px ${atEnd ? r : 0}px ${atStart ? r : 0}px`,
      }}
    >
      {atStart ? (
        <div style={{ position: "absolute", left: 8.5 * k, top: 0, height: head, lineHeight: `${head}px`, fontSize: 11.5 * k, color: S.ink, whiteSpace: "nowrap" }}>
          {STUDIO_EDITOR.music.name}
        </div>
      ) : null}
      <Wave w={w} h={wave} top={head} seed={41} k={k} music offset={Math.max(0, from)} />
    </div>
  );
};

// ------------------------------------------------------------------ the Studio window (window px)
// Real agent lines read off the same run (raw-latest.png, raw-t660.png, rec-t560.png), verbatim.
const LOG_ABOVE = {
  retakes: ["with many retakes per line. Next I'm pulling word-level timings", "so I can pick the best take of each line."],
  ran1Read1: "Ran 1 command · Read 1 file · Searched 2 queries",
  ran1: "Ran 1 command",
  music: [
    "Music is done. The source audio is 29.97 fps video with 48 kHz",
    "PCM, and I've extracted a mono copy. Next I'll measure the",
    "speech energy at each candidate cut so no syllables get",
    "clipped.",
  ],
  edited: "Edited 2 files · Ran 1 command",
  asr: [
    "The ASR word times line up well with the energy onsets, but",
    "background noise varies across the take. I'm checking the tail",
    "ends of a few lines more carefully before locking the cuts.",
  ],
  ran2: "Ran 2 commands",
} as const;
// split a studio.ts string into the app's real line breaks (word counts per line)
const lines = (s: string, counts: number[]) => {
  const words = s.split(" ");
  const out: string[] = [];
  let i = 0;
  for (const c of counts) {
    out.push(words.slice(i, i + c).join(" "));
    i += c;
  }
  if (i < words.length) out[out.length - 1] += ` ${words.slice(i).join(" ")}`;
  return out;
};
const CHAT0 = lines(STUDIO_EDITOR.chat[0], [11, 11, 10, 1]);
const CHAT1 = lines(STUDIO_EDITOR.chat[1], [13, 6]);

const BODY = 16.5;
const META = 15;

const Sidebar: React.FC = () => {
  const navY = [69, 102, 135, 168, 201, 234, 267, 300];
  const navI = [I.newTask, I.computer, "", I.library, I.creations, I.automations, I.plugins, I.more];
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: STUDIO_WIN.sidebarW, height: WIN.h, backgroundColor: S.sidebar, borderRight: `1px solid ${S.border}` }}>
      {/* traffic lights (macOS chrome, fixed colors) */}
      {["#FF5F57", "#FEBC2E", "#28C840"].map((c, i) => (
        <div key={c} style={{ position: "absolute", left: 16 + i * 23, top: 16, width: 12, height: 12, borderRadius: 6, backgroundColor: c }} />
      ))}
      <Ico d={I.panelL} x={100} y={22} s={18} c={S.ink2} />
      <Ico d={I.back} x={132} y={22} s={17} c={S.ink2} />
      <Ico d={I.fwd} x={164} y={22} s={17} c={S.faint} />
      <Ico d={I.search} x={207} y={22} s={18} c={S.ink2} />
      {STUDIO_SIDEBAR.items.map((n, i) => (
        <React.Fragment key={n}>
          {i === 2 ? (
            <Img src={staticFile(MANUS_LOGOS.cueIcon)} style={{ position: "absolute", left: 12, top: navY[i] - 9, width: 18, height: 18 }} />
          ) : (
            <Ico d={navI[i]} x={21} y={navY[i]} s={i === 7 ? 19 : 17} w={i === 7 ? 2.6 : 1.6} c={S.ink2} />
          )}
          <Tx x={37} y={navY[i]} size={15} color={S.ink}>
            {n}
          </Tx>
        </React.Fragment>
      ))}
      <div style={{ position: "absolute", left: 92, top: navY[2] - 10.5, height: 21, padding: "0 5px", borderRadius: 6, backgroundColor: S.card, border: `1px solid ${S.borderStrong}`, boxSizing: "border-box", fontSize: 11.5, fontWeight: 600, color: S.ink, lineHeight: "19px" }}>
        {STUDIO_SIDEBAR.agentsBadge}
      </div>
      <Tx x={13} y={346} size={13.5} color={S.muted}>
        {STUDIO_SIDEBAR.projects}
      </Tx>
      <Ico d={I.newProject} x={21} y={379} s={17} c={S.ink2} />
      <Tx x={37} y={379} size={15} color={S.ink}>
        {STUDIO_SIDEBAR.newProject}
      </Tx>
      <Tx x={13} y={427} size={13.5} color={S.muted}>
        {STUDIO_SIDEBAR.tasks}
      </Tx>
      <div style={{ position: "absolute", left: 5, top: 444, width: 228, height: 32, borderRadius: 8, backgroundColor: S.hover }} />
      <Ico d={I.task} x={21} y={460} s={16} c={S.muted} w={1.8} />
      <Tx x={37} y={460} size={15} color={S.ink} w={184}>
        {STUDIO_SIDEBAR.runningTask}
      </Tx>
      {/* account row */}
      <div style={{ position: "absolute", left: 9, top: 863, width: 28, height: 28, borderRadius: 14, backgroundColor: S.brandSoft, overflow: "hidden" }}>
        <svg width={28} height={28} viewBox="0 0 28 28">
          <circle cx={14} cy={11} r={5} fill={S.brand} />
          <path d="M4 28c1-6 5-9 10-9s9 3 10 9z" fill={S.brand} />
        </svg>
      </div>
      <Tx x={45} y={877} size={15} color={S.ink} weight={500}>
        {STUDIO_SIDEBAR.user}
      </Tx>
      <Ico d={I.devices} x={153} y={877} s={18} c={S.ink2} />
      <Ico d={I.bell} x={185} y={877} s={18} c={S.ink2} />
      <div style={{ position: "absolute", left: 189, top: 866, width: 6, height: 6, borderRadius: 3, backgroundColor: S.fileIcon }} />
      <div style={{ position: "absolute", left: 208, top: 868, width: 18, height: 18, borderRadius: 9, backgroundColor: S.brand }}>
        <Ico d={I.up} x={9} y={9} s={12} c={S.sendInk} w={2.6} />
      </div>
    </div>
  );
};

const ChatColumn: React.FC<{ focus: number; caretOn: boolean }> = ({ focus, caretOn }) => {
  const L = 271; // text left (window px)
  const para = (ls: readonly string[], y0: number, key: string) =>
    ls.map((l, i) => (
      <Tx key={`${key}-${i}`} x={L} y={y0 + i * 24} size={BODY} color={S.ink}>
        {l}
      </Tx>
    ));
  const meta = (s: string, y: number, chev = false) => (
    <div key={`m-${y}`} style={{ position: "absolute", left: L, top: y - 10, height: 20, display: "flex", alignItems: "center", gap: 6, fontSize: META, color: S.muted, whiteSpace: "nowrap" }}>
      {s}
      {chev ? (
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={S.muted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d={I.chevR} />
        </svg>
      ) : null}
    </div>
  );
  return (
    <>
      {/* header */}
      <Tx x={263} y={22} size={17.5} color={S.ink} weight={500}>
        {STUDIO_VIDEO.model}
      </Tx>
      <Ico d={I.chevD} x={387} y={23} s={15} c={S.ink2} />
      <Ico d={I.share} x={660} y={22} s={18} c={S.ink2} />
      <Ico d={I.doc} x={696} y={22} s={18} c={S.ink2} />
      <Ico d={I.dots} x={732} y={22} s={18} c={S.ink2} w={2.6} />
      {/* conversation, scrolled to the end of the run */}
      <div style={{ position: "absolute", left: 0, top: 46, width: 766, height: 712, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: -46 }}>
          {para(LOG_ABOVE.retakes, 41, "rt")}
          {meta(LOG_ABOVE.ran1Read1, 99)}
          {/* bgm_reel.mp3 card */}
          <div style={{ position: "absolute", left: L, top: 118, width: 400, height: 52, borderRadius: 12, backgroundColor: S.card, border: `1px solid ${S.border}`, boxSizing: "border-box" }}>
            <div style={{ position: "absolute", left: 12, top: 12, width: 28, height: 28, borderRadius: 7, backgroundColor: S.fieldHead, border: `1px solid ${S.border}`, boxSizing: "border-box" }}>
              <Ico d={I.note} x={13} y={13} s={16} c={S.ink2} />
            </div>
            <Tx x={51} y={17} size={15.5} color={S.ink}>
              {STUDIO_EDITOR.music.name}
            </Tx>
            <Tx x={51} y={36} size={13.5} color={S.muted}>
              {STUDIO_EDITOR.music.state}
            </Tx>
            {/* green "done" check, same in both appearances */}
            <Ico d={I.check} x={380} y={26} s={16} c={MANUS.success} w={2} />
          </div>
          {meta(LOG_ABOVE.ran1, 189)}
          {meta(LOG_ABOVE.ran1, 217)}
          {para(LOG_ABOVE.music, 251, "mu")}
          {meta(LOG_ABOVE.edited, 357)}
          {para(LOG_ABOVE.asr, 391, "asr")}
          {meta(STUDIO_EDITOR.steps[0], 473)}
          {para(CHAT0, 507, "c0")}
          {meta(LOG_ABOVE.ran2, 613)}
          {para(CHAT1, 647, "c1")}
          {meta(LOG_ABOVE.ran2, 705, true)}
          <Ico d={I.videoSq} x={L + 10} y={733} s={17} c={S.muted} />
          <Tx x={L + 28} y={733} size={META} color={S.muted}>
            {STUDIO_EDITOR.steps[1]}
          </Tx>
        </div>
      </div>
      {/* message box (task finished: no Working row, idle send) */}
      <MessageBox focus={focus} caretOn={caretOn} />
    </>
  );
};

const MessageBox: React.FC<{ focus: number; caretOn: boolean }> = ({ focus, caretOn }) => {
  const x = 256;
  const y = 783;
  const cy = 850 - y; // control row center (box-relative)
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: MSG.w,
        height: MSG.h,
        borderRadius: 20,
        backgroundColor: S.field,
        border: `1px solid ${focus > 0.5 ? S.borderStrong : S.border}`,
        boxShadow: `0 2px 10px ${S.border}, 0 0 0 ${3 * focus}px ${S.hover}`,
        boxSizing: "border-box",
      }}
    >
      {caretOn ? <div style={{ position: "absolute", left: 16, top: 14, width: 1.8, height: 20, borderRadius: 1, backgroundColor: S.ink }} /> : null}
      <Tx x={17} y={24} size={16} color={S.muted}>
        {STUDIO_EDITOR.messagePlaceholder}
      </Tx>
      {[28, 68].map((cx, i) => (
        <div key={cx} style={{ position: "absolute", left: cx - 16, top: cy - 16, width: 32, height: 32, borderRadius: 16, border: `1px solid ${S.borderStrong}`, boxSizing: "border-box" }}>
          <Ico d={i === 0 ? I.plus : I.videoSq} x={15} y={15} s={i === 0 ? 16 : 17} c={S.ink2} />
        </div>
      ))}
      <Ico d={I.shield} x={107.5} y={cy} s={17} c={S.muted} />
      <Tx x={122.5} y={cy} size={15} color={S.muted}>
        {STUDIO_HOME.approve}
      </Tx>
      <Ico d={I.laptop} x={246.5} y={cy} s={17} c={S.muted} />
      <Tx x={261.5} y={cy} size={15} color={S.muted}>
        {STUDIO_EDITOR.chatScope}
      </Tx>
      <Tx x={350.5} y={cy} size={15} color={S.ink2}>
        {STUDIO_VIDEO.chipQuality}
      </Tx>
      <Ico d={I.chevD} x={391} y={cy + 1} s={14} c={S.ink2} />
      <Ico d={I.mic} x={423} y={cy} s={17} c={S.ink2} />
      {/* idle send: empty box, so the arrow button sits disabled */}
      <div style={{ position: "absolute", left: 463 - 16, top: cy - 16, width: 32, height: 32, borderRadius: 16, backgroundColor: S.borderStrong }}>
        <Ico d={I.up} x={16} y={16} s={15} c={S.field} w={2.4} />
      </div>
    </div>
  );
};

const Editor: React.FC<{ playT: number }> = ({ playT }) => {
  const take = takeAt(playT);
  const fr = FRAMING[take];
  const pv = { x: 1033.5, y: 152.5, w: 235, h: 416.5 };
  const imgW = (pv.h * 468) / 262;
  const fmt = (t: number) => {
    const ss = Math.floor(t);
    const ff = Math.min(29, Math.floor((t - ss) * 30));
    return `00:${String(ss).padStart(2, "0")}:${String(ff).padStart(2, "0")}`;
  };
  const phX = TL.t0u + playT * TL.pps;
  const panel = (x: number, y: number, w: number, h: number) => (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 12, backgroundColor: S.card, border: `1px solid ${S.border}`, boxSizing: "border-box" }} />
  );
  return (
    <>
      <div style={{ position: "absolute", left: 766, top: 0, width: 1, height: WIN.h, backgroundColor: S.border }} />
      {/* tab bar */}
      <div style={{ position: "absolute", left: 777, top: 7, width: 159, height: 31, borderRadius: 8, backgroundColor: S.hover }} />
      <Ico d={I.videoSq} x={789.5} y={22.5} s={17} c={S.ink} />
      <Tx x={804.5} y={22.5} size={15.5} color={S.ink}>
        {STUDIO_EDITOR.tab}
      </Tx>
      <Ico d={I.close} x={922} y={22.5} s={14} c={S.muted} />
      <Ico d={I.plus} x={956.5} y={22.5} s={17} c={S.ink2} />
      <Ico d={I.chevD} x={980.5} y={23} s={13} c={S.ink2} />
      <Ico d={I.expand} x={1222.5} y={22.5} s={16} c={S.ink2} />
      <Ico d={I.panelR} x={1258} y={22.5} s={18} c={S.ink2} />
      <div style={{ position: "absolute", left: 766, top: 46, width: WIN.w - 766, height: 1, backgroundColor: S.border }} />
      {/* title row */}
      <Tx x={783.5} y={69.5} size={15.5} color={S.ink}>
        {STUDIO_EDITOR.title}
      </Tx>
      <div style={{ position: "absolute", left: 1222.5, top: 55, width: 56, height: 28, borderRadius: 8, backgroundColor: S.exportBg, color: S.exportInk, fontSize: 14.5, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {STUDIO_EDITOR.export}
      </div>
      {/* media panel */}
      {panel(770, 91, 241, 575)}
      {STUDIO_EDITOR.panelTabs.map((t, i) => (
        <Tx key={t} x={[782.5, 833, 871.5][i]} y={112} size={15} color={i === 0 ? S.ink : S.muted} weight={i === 0 ? 500 : 400}>
          {t}
        </Tx>
      ))}
      <div style={{ position: "absolute", left: 782.5, top: 127.5, width: 36, height: 2, borderRadius: 1, backgroundColor: S.ink }} />
      <div style={{ position: "absolute", left: 771, top: 130, width: 239, height: 1, backgroundColor: S.border }} />
      <Ico d={I.chevL} x={990.5} y={112} s={15} c={S.ink2} />
      <div style={{ position: "absolute", left: 780.5, top: 138.5, width: 184, height: 31.5, borderRadius: 8, backgroundColor: S.hover }} />
      <Ico d={I.search} x={797} y={154} s={15} c={S.muted} />
      <Ico d={I.chevD} x={810.5} y={155} s={10} c={S.muted} w={2} />
      <Tx x={826} y={154} size={14.5} color={S.faint}>
        {STUDIO_EDITOR.searchMedia}
      </Tx>
      <Ico d={I.upload} x={984.5} y={154} s={18} c={S.ink2} />
      <div style={{ position: "absolute", left: 780.5, top: 180, width: 108, height: 81, borderRadius: 8, backgroundColor: S.hover }}>
        <div style={{ position: "absolute", left: 2, top: 11, width: 104, height: 59, overflow: "hidden", backgroundColor: S.previewBg }}>
          <Img src={staticFile(STUDIO_ASSETS.clipFrame)} style={{ width: 104, height: 59, objectFit: "cover" }} />
        </div>
        <div style={{ position: "absolute", right: 6, top: 1, fontSize: 12, color: S.ink2 }}>{STUDIO_EDITOR.clip.length}</div>
      </div>
      <Tx x={834.5} y={273} size={13.5} color={S.ink2} w={108} align="center">
        {STUDIO_EDITOR.clip.name}
      </Tx>
      {/* preview panel */}
      {panel(1016, 91, 270, 575)}
      <div style={{ position: "absolute", left: 1252.5, top: 99, width: 28, height: 28, borderRadius: 8, backgroundColor: S.hover }}>
        <Ico d={I.chevL} x={14} y={14} s={14} c={S.ink2} />
      </div>
      <div style={{ position: "absolute", left: pv.x, top: pv.y, width: pv.w, height: pv.h, backgroundColor: S.previewBg, overflow: "hidden" }}>
        <Img
          src={staticFile(STUDIO_ASSETS.clipFrame)}
          style={{
            position: "absolute",
            height: pv.h * fr.s,
            width: imgW * fr.s,
            left: (pv.w - imgW * fr.s) / 2 + fr.dx,
            top: (pv.h - pv.h * fr.s) / 2 + fr.dy,
          }}
        />
      </div>
      <div style={{ position: "absolute", left: 1029, top: 638, height: 20, display: "flex", gap: 5, fontSize: 14, lineHeight: "20px", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
        <span style={{ color: S.ink }}>{fmt(playT)}</span>
        <span style={{ color: S.faint }}>/</span>
        <span style={{ color: S.muted }}>{STUDIO_EDITOR.total}</span>
      </div>
      <Ico d={I.play} x={1155} y={648} s={16} c={S.ink2} />
      <Ico d={I.fullscreen} x={1265} y={648} s={16} c={S.ink2} />
      {/* timeline panel */}
      {panel(770, 671, 516, 225)}
      <Ico d={I.pointer} x={790} y={689.5} s={17} c={S.ink} />
      <Ico d={I.chevD} x={811} y={690} s={11} c={S.ink2} w={2} />
      <div style={{ position: "absolute", left: 837, top: 679, width: 1, height: 21, backgroundColor: S.border }} />
      <Ico d={I.crop} x={859} y={689.5} s={16} c={S.faint} />
      <Ico d={I.undo} x={891} y={689.5} s={16} c={S.faint} />
      <Ico d={I.redo} x={923.5} y={689.5} s={16} c={S.faint} />
      <div style={{ position: "absolute", left: 946, top: 679, width: 1, height: 21, backgroundColor: S.border }} />
      <div style={{ position: "absolute", left: 955, top: 676, width: 111, height: 27, borderRadius: 8, backgroundColor: S.hover }} />
      <Tx x={966.5} y={689.5} size={14} color={S.ink}>
        {STUDIO_EDITOR.trackMain}
      </Tx>
      <Ico d={I.plus} x={1084.5} y={689.5} s={16} c={S.ink2} />
      <div style={{ position: "absolute", left: 1156, top: 676, width: 27, height: 27, borderRadius: 7, backgroundColor: S.hover }} />
      <Ico d={I.split} x={1169.5} y={689.5} s={16} c={S.ink} />
      <Ico d={I.zoomOut} x={1201.5} y={689.5} s={16} c={S.ink2} />
      <Ico d={I.zoomIn} x={1233.5} y={689.5} s={16} c={S.ink2} />
      <Ico d={I.expand} x={1265.5} y={689.5} s={15} c={S.ink2} />
      <div style={{ position: "absolute", left: 771, top: 707, width: 514, height: 1, backgroundColor: S.border }} />
      {/* track headers */}
      <div style={{ position: "absolute", left: 842, top: 708, width: 1, height: 170, backgroundColor: S.border }} />
      <div style={{ position: "absolute", left: 773, top: 765, width: 19, height: 20, borderRadius: 5, backgroundColor: S.hover }} />
      <Ico d={I.film} x={782.5} y={775} s={13} c={S.ink2} />
      <Ico d={I.eye} x={804.5} y={775} s={13} c={S.ink2} />
      <Ico d={I.speaker} x={826} y={775} s={13} c={S.ink2} />
      <div style={{ position: "absolute", left: 793.5, top: 790, width: 26.5, height: 12.5, borderRadius: 3, backgroundColor: S.mainChipBg, color: S.mainChipInk, fontSize: 9.5, lineHeight: "12.5px", textAlign: "center" }}>
        {STUDIO_EDITOR.trackMain}
      </div>
      <div style={{ position: "absolute", left: 773, top: 835.5, width: 19, height: 20, borderRadius: 5, backgroundColor: S.hover }} />
      <Ico d={I.note} x={782.5} y={845.5} s={13} c={S.ink2} />
      <Ico d={I.speaker} x={826} y={845.5} s={13} c={S.ink2} />
      {/* ruler + lanes (time 0 at u 875.5) */}
      <div style={{ position: "absolute", left: 843, top: 708, width: 442, height: 172, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: -843, top: -708 }}>
          {Array.from({ length: 18 }, (_, i) => {
            const u = TL.t0u + i * 25;
            const major = i % 4 === 0;
            return <div key={`tk${i}`} style={{ position: "absolute", left: u - 0.5, top: 710, width: 1, height: major ? 6 : 4, backgroundColor: S.faint }} />;
          })}
          {STUDIO_EDITOR.ruler.map((r, i) => (
            <Tx key={r} x={TL.t0u + 4 + i * 100} y={718} size={12.5} color={S.muted}>
              {r}
            </Tx>
          ))}
          <div style={{ position: "absolute", left: 843, top: TL.mainTop, width: 442, height: TL.mainH, backgroundColor: S.track }} />
          <div style={{ position: "absolute", left: 843, top: TL.musicTop, width: 442, height: TL.musicH, backgroundColor: S.track }} />
          {[0, 1].map((ti) => (
            <div key={`wt${ti}`} style={{ position: "absolute", left: TL.t0u + TAKE_T0[ti] * TL.pps + (ti ? 1 : 0), top: 748.5 }}>
              <VideoClip w={TAKES[ti] * TL.pps - 1} k={1} seed={ti * 13 + 5} />
            </div>
          ))}
          <div style={{ position: "absolute", left: TL.t0u, top: TL.musicTop + 4 }}>
            <MusicClip k={1} full={TOTAL * TL.pps} from={0} w={420} />
          </div>
          {/* playhead */}
          <div style={{ position: "absolute", left: phX - 1, top: 708, width: 2, height: 173, backgroundColor: S.playhead }} />
          <div style={{ position: "absolute", left: phX - 4.5, top: 708.5, width: 9, height: 10.5, borderRadius: "2px 2px 4px 4px", backgroundColor: S.playhead }} />
        </div>
      </div>
      {/* scrollbar */}
      <div style={{ position: "absolute", left: 851, top: 885.5, width: 40, height: 4, borderRadius: 2, backgroundColor: S.faint }} />
    </>
  );
};

const Cursor: React.FC<{ x: number; y: number; press: number }> = ({ x, y, press }) => (
  <svg
    width={18}
    height={22}
    viewBox="0 0 24 28"
    style={{
      position: "absolute",
      left: x - 2.2,
      top: y - 1.4,
      transform: `scale(${1 - 0.14 * press})`,
      transformOrigin: "2.2px 1.4px",
      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.35))",
    }}
  >
    <path d="M3 2.2 3 20.4l4.6-4.4 3.1 7.1 3.6-1.6-3.1-7 6.2-.4z" fill="#111" stroke="#FFFFFF" strokeWidth={1.7} strokeLinejoin="round" />
  </svg>
);

const StudioWindow: React.FC<{ frame: number; playT: number }> = ({ frame, playT }) => {
  // cursor on the window's own screen (window px)
  const ck = [
    { f: 0, u: 1006, v: 735 },
    { f: 50, u: 1006, v: 735 },
    { f: 72, u: 318, v: 812 },
    { f: CLICK + 4, u: 312, v: 809 },
    { f: DUR, u: 326, v: 826 },
  ];
  let i = 0;
  while (i < ck.length - 2 && frame > ck[i + 1].f) i++;
  const a = ck[i];
  const b = ck[i + 1];
  const t = interpolate(frame, [a.f, b.f], [0, 1], { ...clamp, easing: i === 1 ? TRAVEL : DECEL });
  const bend = Math.sin(Math.PI * t) * (i === 1 ? 34 : 4);
  const cu = lerp(a.u, b.u, t) + bend * 0.25;
  const cv = lerp(a.v, b.v, t) - bend;
  const press = interpolate(frame, [CLICK - 3, CLICK, CLICK + 6], [0, 1, 0], clamp);
  const focus = interpolate(frame, [CLICK + 1, CLICK + 5], [0, 1], { ...clamp, easing: DECEL });
  const since = frame - (CLICK + 2);
  const caretOn = since >= 0 && Math.floor(since / 15) % 2 === 0;
  const rip = interpolate(frame, [CLICK, CLICK + 16], [0, 1], { ...clamp, easing: DECEL });
  const ripO = interpolate(frame, [CLICK, CLICK + 3, CLICK + 16], [0, 0.5, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: WIN.w,
        height: WIN.h,
        borderRadius: WIN.r,
        backgroundColor: S.win,
        overflow: "hidden",
        fontFamily: MANUS_FONT,
        border: `1px solid ${S.border}`,
        boxSizing: "border-box",
      }}
    >
      <Sidebar />
      <ChatColumn focus={focus} caretOn={caretOn} />
      <Editor playT={playT} />
      {ripO > 0.001 ? (
        <div
          style={{
            position: "absolute",
            left: 312 - 20,
            top: 809 - 20,
            width: 40,
            height: 40,
            borderRadius: 20,
            border: `1.5px solid ${S.brand}`,
            backgroundColor: S.brandSoft,
            opacity: ripO,
            transform: `scale(${0.3 + 1.1 * rip})`,
          }}
        />
      ) : null}
      <Cursor x={cu} y={cv} press={press} />
    </div>
  );
};

// ------------------------------------------------------------------ floor strip (the cut, laid flat)
const StripContent: React.FC<{ t0: number; t1: number; playT: number }> = ({ t0, t1, playT }) => {
  const u = (t: number) => t * TS;
  const secs: number[] = [];
  for (let s = Math.max(0, Math.floor(t0)); s <= Math.min(Math.floor(TOTAL), Math.ceil(t1)); s++) secs.push(s);
  const quarters: number[] = [];
  for (let qq = Math.max(0, Math.floor(t0 * 4)); qq <= Math.min(TOTAL * 4, Math.ceil(t1 * 4)); qq++) quarters.push(qq / 4);
  const takes = TAKES.map((d, i) => ({ i, a: TAKE_T0[i], b: TAKE_T0[i] + d })).filter((tk) => tk.b > t0 && tk.a < t1);
  const mFrom = Math.max(0, u(t0));
  const mTo = Math.min(u(TOTAL), u(t1));
  return (
    <>
      {/* panel bed + track lanes */}
      <div style={{ position: "absolute", left: u(Math.max(-STRIP_PRE, t0)), top: 0, width: u(Math.min(TOTAL + STRIP_PRE, t1)) - u(Math.max(-STRIP_PRE, t0)), height: SV.end + 6 * K, backgroundColor: S.card }} />
      <div style={{ position: "absolute", left: u(Math.max(-STRIP_PRE, t0)), top: SV.main, width: u(Math.min(TOTAL + STRIP_PRE, t1)) - u(Math.max(-STRIP_PRE, t0)), height: TL.mainH * K, backgroundColor: S.track }} />
      <div style={{ position: "absolute", left: u(Math.max(-STRIP_PRE, t0)), top: SV.music, width: u(Math.min(TOTAL + STRIP_PRE, t1)) - u(Math.max(-STRIP_PRE, t0)), height: TL.musicH * K, backgroundColor: S.track }} />
      {quarters.map((t) => (
        <div key={`q${t}`} style={{ position: "absolute", left: u(t) - 0.5 * K, top: 2.5 * K, width: K, height: (t % 1 === 0 ? 6 : 4) * K, backgroundColor: S.faint }} />
      ))}
      {/* second labels turned to face the approaching camera */}
      {secs.map((s) => (
        <div
          key={`s${s}`}
          style={{ position: "absolute", left: u(s) + 3 * K, top: 36 * K, height: 15 * K, lineHeight: `${15 * K}px`, fontSize: 12.5 * K, color: S.muted, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", transform: "rotate(-90deg)", transformOrigin: "0 0" }}
        >
          {`00:${String(s).padStart(2, "0")}`}
        </div>
      ))}
      {takes.map((tk) => (
        <div key={`tk${tk.i}`} style={{ position: "absolute", left: u(tk.a) + (tk.i ? 1 * K : 0), top: SV.main + 2.5 * K }}>
          <VideoClip w={u(tk.b - tk.a) - 1 * K} k={K} seed={tk.i * 13 + 5} />
        </div>
      ))}
      {mTo > mFrom ? (
        <div style={{ position: "absolute", left: mFrom, top: SV.music + 4 * K }}>
          <MusicClip k={K} full={u(TOTAL)} from={mFrom} w={mTo - mFrom} />
        </div>
      ) : null}
      {playT >= t0 - 0.2 && playT <= t1 + 0.2 ? (
        <>
          <div style={{ position: "absolute", left: u(playT) - K, top: 0.5 * K, width: 2 * K, height: SV.end + 4 * K, backgroundColor: S.playhead }} />
          <div style={{ position: "absolute", left: u(playT) - 4.5 * K, top: 1 * K, width: 9 * K, height: 10.5 * K, borderRadius: `${2 * K}px ${2 * K}px ${4 * K}px ${4 * K}px`, backgroundColor: S.playhead }} />
        </>
      ) : null}
    </>
  );
};

// ------------------------------------------------------------------ scene
const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const { pos, tgt, focusPt, playT } = cameraAt(frame);
  const cam = makeCam(pos, tgt, focusPt);
  const P = (p: V3) => project(cam, p);

  // ---- horizon + floor (hand-projected) ----
  const hdir = norm(v3(cam.fwd.x, 0, cam.fwd.z));
  const horizonY = CY + (dot(hdir, cam.down) * PERSP) / Math.max(0.001, dot(hdir, cam.fwd));
  const G = 160;
  const grid: string[] = [];
  const pushLine = (pts: V3[]) => {
    let seg: string[] = [];
    for (const p of pts) {
      const s = P(p);
      if (s.depth > 4) seg.push(`${s.sx.toFixed(1)},${s.sy.toFixed(1)}`);
      else {
        if (seg.length > 1) grid.push(seg.join(" "));
        seg = [];
      }
    }
    if (seg.length > 1) grid.push(seg.join(" "));
  };
  for (let i = -30; i <= 30; i++) pushLine(Array.from({ length: 56 }, (_, k) => v3(i * G, 0, -9000 + k * 260)));
  for (let k = -56; k <= 32; k++) pushLine(Array.from({ length: 48 }, (_, i) => v3(-5200 + i * 222, 0, k * G)));

  const poly = (pts: V3[]) => {
    const pr = pts.map(P);
    if (pr.some((p) => p.depth <= 4)) return null;
    return pr.map((p) => `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(" ");
  };
  const ellipse = (c: V3, rx: number, rz: number, n = 40) =>
    poly(Array.from({ length: n }, (_, i) => v3(c.x + Math.cos((i / n) * Math.PI * 2) * rx, 0, c.z + Math.sin((i / n) * Math.PI * 2) * rz)));
  const greenPool = ellipse(v3(200, 0, 900), 2300, 1700);
  const spill = ellipse(v3(0, 0, 320), 1500, 620);
  const contact = poly([v3(WIN.x0 - 10, 0, -26), v3(WIN.x0 + WIN.w + 10, 0, -26), v3(WIN.x0 + WIN.w + 10, 0, 34), v3(WIN.x0 - 10, 0, 34)]);
  const stripShadow = poly([v3(STRIP_X0 + 10, 0, tz(-STRIP_PRE) - 6), v3(STRIP_X0 - SV.end - 16, 0, tz(-STRIP_PRE) - 6), v3(STRIP_X0 - SV.end - 16, 0, tz(18)), v3(STRIP_X0 + 10, 0, tz(18))]);

  // ---- strip pieces (1 s each, overlapped so blurred seams stay solid) ----
  // clip the strip where it would reach behind the near plane
  const zClipAt = (x: number) => {
    const c = cam.fwd.z;
    if (c > -0.02) return Infinity;
    const k0 = NEAR - cam.fwd.x * (x - cam.pos.x) - cam.fwd.y * (0 - cam.pos.y);
    return cam.pos.z + k0 / c;
  };
  const zMax = Math.min(zClipAt(STRIP_X0 + 20), zClipAt(STRIP_X0 - SV.end - 20));
  const tMax = Math.min(TOTAL + STRIP_PRE, (zMax - STRIP_Z0) / TS);
  const pieces: { key: string; node: React.ReactNode }[] = [];
  for (let s = -1; s < Math.ceil(TOTAL); s++) {
    const ta0 = s === -1 ? -STRIP_PRE : s;
    const tb0 = s === -1 ? 0 : Math.min(TOTAL + STRIP_PRE, s + 1);
    if (ta0 >= tMax) continue;
    const mid = P(v3(STRIP_X0 - SV.end / 2, 0, tz((ta0 + Math.min(tb0, tMax)) / 2)));
    // frustum reject
    const cs = [v3(STRIP_X0, 0, tz(ta0)), v3(STRIP_X0 - SV.end, 0, tz(ta0)), v3(STRIP_X0, 0, tz(Math.min(tb0, tMax))), v3(STRIP_X0 - SV.end, 0, tz(Math.min(tb0, tMax)))].map(P);
    if (cs.every((c) => c.sx < -300) || cs.every((c) => c.sx > 1380) || cs.every((c) => c.sy > 1260) || cs.every((c) => c.sy < -300)) continue;
    const screenBlur = dofPx(mid.depth, cam.focus);
    const localBlur = q((screenBlur * mid.depth) / PERSP);
    const m = Math.min(0.3, (localBlur * 3 + 4) / TS);
    const ta = Math.max(-STRIP_PRE, ta0 - m);
    const tb = Math.min(tMax, tb0 + m);
    if (tb <= ta) continue;
    pieces.push({
      key: `p${s}`,
      node: (
        <div
          key={`p${s}`}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: (tb - ta) * TS,
            height: SV.end + 8 * K,
            overflow: "hidden",
            transformOrigin: "0 0",
            transform: `translate3d(${STRIP_X0}px, -1px, ${tz(ta)}px) rotateX(90deg) rotateZ(90deg)`,
            backfaceVisibility: "hidden",
            filter: localBlur >= 0.5 ? `blur(${localBlur}px)` : undefined,
          }}
        >
          <div style={{ position: "absolute", left: -ta * TS, top: 0 }}>
            <StripContent t0={ta} t1={tb} playT={playT} />
          </div>
        </div>
      ),
    });
  }

  // ---- window (hero): soft only while the camera is focused down the strip ----
  const winC = P(v3(0, wy(WIN.h * 0.6), 0));
  const winBlurScreen = dofPx(winC.depth, cam.focus, 0.45);
  const winBlur = q((winBlurScreen * winC.depth) / PERSP);

  const t = frame / 30;
  const yawShift = Math.atan2(cam.fwd.x, -cam.fwd.z) * PERSP * 0.6;

  return (
    <AbsoluteFill style={{ backgroundColor: MRD.bg, fontFamily: MANUS_FONT }}>
      {/* sky: Merydian ground gradient with soft green light shafts (parallax at infinity) */}
      <AbsoluteFill style={{ backgroundImage: MRD_GRADIENT.ground }} />
      {[
        { x: 0.12, w: 170, o: 0.5 },
        { x: 0.4, w: 110, o: 0.32 },
        { x: 0.68, w: 200, o: 0.45 },
        { x: 0.92, w: 120, o: 0.3 },
      ].map((s, i) => {
        const x = (((s.x * 1600 - yawShift) % 1600) + 1600) % 1600 - 260;
        return (
          <div
            key={`st${i}`}
            style={{
              position: "absolute",
              left: x - s.w / 2,
              top: horizonY - 980,
              width: s.w,
              height: 980,
              backgroundImage: MRD_GRADIENT.streak,
              opacity: s.o * (0.7 + 0.25 * Math.sin(t * 0.55 * Math.PI + i * 1.7)),
              filter: "blur(28px)",
            }}
          />
        );
      })}
      {/* floor */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: Math.max(-10, horizonY),
          bottom: 0,
          background: `linear-gradient(180deg, #1A201D 0%, #1C2320 45%, #161B19 100%)`, // same lit floor tone as parts 1 and 2
        }}
      />
      <svg width={1080} height={960} style={{ position: "absolute", left: 0, top: 0 }}>
        {/* same pooled world light as parts 1 and 2: neutral lift + a little green, so the floor reads as one world */}
        {greenPool ? <polygon points={greenPool} fill="rgba(255,255,255,0.11)" style={{ filter: "blur(46px)" }} /> : null}
        {greenPool ? <polygon points={greenPool} fill="rgba(0,255,171,0.05)" style={{ filter: "blur(46px)" }} /> : null}
        {grid.map((pts, i) => (
          <polyline key={i} points={pts} fill="none" stroke="rgba(255,255,255,0.11)" strokeWidth={1} />
        ))}
        {spill ? <polygon points={spill} fill="rgba(255,255,255,0.15)" style={{ filter: "blur(46px)" }} /> : null}
        {contact ? <polygon points={contact} fill="rgba(0,0,0,0.55)" style={{ filter: "blur(16px)" }} /> : null}
        {stripShadow ? <polygon points={stripShadow} fill="rgba(0,0,0,0.5)" style={{ filter: "blur(10px)" }} /> : null}
      </svg>
      {/* horizon haze: the far floor dissolves instead of ending in a wall */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(10,10,10,0) ${horizonY - 160}px, rgba(18,24,22,0.95) ${horizonY + 6}px, rgba(14,18,17,0.6) ${horizonY + 90}px, rgba(10,10,10,0) ${horizonY + 260}px)`,
        }}
      />

      {/* CSS 3D stage: the window + the strip are planes in one world */}
      <AbsoluteFill style={{ perspective: `${PERSP}px`, perspectiveOrigin: `${CX}px ${CY}px` }}>
        <div style={{ position: "absolute", left: CX, top: CY, width: 0, height: 0, transformStyle: "preserve-3d", transformOrigin: "0 0 0", transform: viewMatrix(cam) }}>
          {pieces.map((p) => p.node)}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: WIN.w,
              height: WIN.h,
              transformOrigin: "0 0",
              transform: `translate3d(${WIN.x0}px, ${WIN.y0}px, 0px)`,
              backfaceVisibility: "hidden",
              filter: winBlur >= 0.5 ? `blur(${winBlur}px)` : undefined,
              borderRadius: WIN.r,
              boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
            }}
          >
            <StudioWindow frame={frame} playT={playT} />
          </div>
        </div>
      </AbsoluteFill>

      {/* lens vignette */}
      <AbsoluteFill style={{ background: "radial-gradient(120% 95% at 50% 52%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.42) 100%)" }} />
    </AbsoluteFill>
  );
};

const Stretched: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Freeze frame={(f * (DUR - 1)) / (MBP4PARTTHATTOOKHOURS_DURATION - 1)}>
      <Scene />
    </Freeze>
  );
};

export const MbP4PartThatTookHours: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: MRD.bg }}>
    <CameraMotionBlur shutterAngle={180} samples={5}>
      <Stretched />
    </CameraMotionBlur>
  </AbsoluteFill>
);
