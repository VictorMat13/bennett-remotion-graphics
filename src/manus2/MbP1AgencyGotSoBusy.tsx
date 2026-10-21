import React from "react";
import { AbsoluteFill, Audio, Easing, Freeze, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { MANUS_FONT, MANUS_LOGOS, MANUS_SERIF, MRD, loadManusFont } from "./theme";
import { STUDIO_HOME, STUDIO_SIDEBAR, STUDIO_VIDEO, STUDIO_WIN, studio, studioLogo, type StudioMode } from "./studio";
import { type CK, cursorAt, pressAt } from "./cursor";

loadManusFont();
const { fontFamily: CAL_FONT } = loadInter("normal", { weights: ["500", "600", "700"], subsets: ["latin"] });

// ===========================================================================
// MbP1AgencyGotSoBusy: 1080x960 (9:8) @ 30fps, 168 frames. HOOK of the v2 reel.
// VO (never on screen): "My agency got so busy, I didn't have time to make
// content. So I set up an agent to edit my videos."
//
// ONE 3D world (BRIEF-v2-3D.md): Merydian perspective floor, a keyed camera
// (position + look-at) that never stops evolving, depth of field by distance,
// contact shadows, horizon haze, CameraMotionBlur.
//   0-20    close on the official Merydian mark as a solid object (stacked
//           layers give it thickness) turning slowly on the floor; slow push
//           with a little orbit, a light sweep across the face (no text, no glow).
//   20-66   the client-work calendar (day sheets, event blocks, the lone
//           "Film reel" slot) streams in from deep background and slides PAST
//           the mark on flanking paths, never crossing it, some cards carrying
//           on past the lens, while the camera pulls back and cranes up so the
//           mark recedes into the field that buries it.
//   66-106  crane over the stacks, push in through depth onto the Manus
//           Studio window standing upright beyond the field (01-studio-home).
//   100-146 plain arrow cursor clicks Create; the window switches to Video
//           mode (rec-t025 / rec-t070) while the camera keeps a slow push/arc.
//   146-168 settle near-frontal, caret blinking in the prompt box.
// The Studio window is real DOM on a CSS 3D plane, in its own 1289x898 coords.
// ===========================================================================

// Delivered length: 255 frames (8.5s) so the graphic covers Bennett's whole line at talking speed. The scene
// itself is authored on a 168-frame clock (all beat numbers below); WARP spreads those beats over the longer
// runtime (smooth, monotone), it never freezes early.
export const MBP1AGENCYGOTSOBUSY_DURATION = 255;
const REAL_DUR = MBP1AGENCYGOTSOBUSY_DURATION;
const DUR = 168;
const WARP_REAL = [0, 34, 118, 176, 232, 255];
const WARP_SCENE = [0, 20, 66, 106, 146, 168];

// Flip to "dark" for the dark-mode check still, then back.
const MODE: StudioMode = "light";
const S = studio(MODE);
const LOGO = studioLogo(MODE);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ENTER = Easing.bezier(0.05, 0.7, 0.1, 1);
const DECEL = Easing.bezier(0.2, 0, 0, 1);

// ------------------------------------------------------------- 3D camera
const CX = 540;
const CY = 480;
const P = 760; // focal length in px (CSS perspective)

type V3 = { x: number; y: number; z: number };

// Monotone cubic (Fritsch-Carlson) through keys: C1-smooth, never overshoots.
const mono = (t: number, ks: number[], vs: number[]) => {
  const n = ks.length;
  if (t <= ks[0]) return vs[0];
  if (t >= ks[n - 1]) return vs[n - 1];
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((vs[i + 1] - vs[i]) / (ks[i + 1] - ks[i]));
  const m: number[] = [d[0]];
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(d[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s2 = a * a + b * b;
    if (s2 > 9) {
      const k = 3 / Math.sqrt(s2);
      m[i] = k * a * d[i];
      m[i + 1] = k * b * d[i];
    }
  }
  let i = 0;
  while (i < n - 2 && t > ks[i + 1]) i++;
  const h = ks[i + 1] - ks[i];
  const u = (t - ks[i]) / h;
  const u2 = u * u;
  const u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * vs[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * vs[i + 1] + (u3 - u2) * h * m[i + 1];
};

// World: x right, y DOWN (floor at y = 0, up is negative), z toward the start camera.
const WIN = { cx: 0, z: -2600, lift: 20, w: STUDIO_WIN.w, h: STUDIO_WIN.h } as const;
const WIN_TOP = -(WIN.lift + WIN.h);
const winPt = (lx: number, ly: number): V3 => ({ x: WIN.cx - WIN.w / 2 + lx, y: WIN_TOP + ly, z: WIN.z });

// The lone filming slot in the field.
const FR = { x: -360, z: 250, w: 232, h: 92 } as const;

// Camera keys: position + look-at target.
// The Merydian mark stands upright on the floor at the head of the field (hook opening, Oct 2 revision).
const LG = { x: 30, z: 560, size: 300, lift: 14 } as const;
const LG_C: V3 = { x: LG.x, y: -(LG.lift + LG.size / 2), z: LG.z };
const LG_DEPTH = 38; // thickness of the solid mark, in 1px layers
const EMERGE = [22, 60] as const; // the calendar streams past the mark over these frames

const KF = [0, 20, 50, 66, 78, 92, 106, 140, 168];
const CAM: V3[] = [
  { x: 190, y: -200, z: 1000 }, // close on the mark
  { x: 70, y: -184, z: 962 }, // slow push + a little orbit
  { x: 200, y: -440, z: 1430 }, // pull back + crane: the mark recedes into the field that buries it
  { x: 70, y: -600, z: 700 },
  { x: -40, y: -780, z: 40 },
  { x: -20, y: -680, z: -900 },
  { x: 40, y: -440, z: -1800 },
  { x: 104, y: -438, z: -1832 },
  { x: 114, y: -437, z: -1842 },
];
const TGT: V3[] = [
  LG_C,
  LG_C,
  { x: -10, y: -150, z: 420 },
  { x: -80, y: -230, z: -560 },
  { x: 0, y: -330, z: -1700 },
  { x: 60, y: -470, z: -2600 },
  { x: 112, y: -405, z: -2600 },
  { x: 119, y: -436, z: -2600 },
  { x: 120, y: -437, z: -2600 },
];

type Cam = { C: V3; T: V3; th: number; ph: number; ct: number; st: number; cp: number; sp: number; focus: number };
const camAt = (frame: number): Cam => {
  const k = (arr: V3[], c: keyof V3) =>
    mono(
      frame,
      KF,
      arr.map((v) => v[c]),
    );
  const C = { x: k(CAM, "x"), y: k(CAM, "y"), z: k(CAM, "z") };
  const T = { x: k(TGT, "x"), y: k(TGT, "y"), z: k(TGT, "z") };
  const fx = T.x - C.x;
  const fy = T.y - C.y;
  const fz = T.z - C.z;
  const len = Math.hypot(fx, fy, fz);
  const th = Math.atan2(fx, -fz);
  const ph = Math.atan2(-fy, Math.hypot(fx, fz));
  return { C, T, th, ph, ct: Math.cos(th), st: Math.sin(th), cp: Math.cos(ph), sp: Math.sin(ph), focus: len };
};
// Same math as the CSS chain translateZ(P) rotateX(ph) rotateY(th) translate3d(-C).
const toCam = (cam: Cam, p: V3) => {
  const x = p.x - cam.C.x;
  const y = p.y - cam.C.y;
  const z = p.z - cam.C.z;
  const x1 = cam.ct * x + cam.st * z;
  const z1 = -cam.st * x + cam.ct * z;
  const y2 = cam.cp * y - cam.sp * z1;
  const z2 = cam.sp * y + cam.cp * z1;
  return { x: x1, y: y2, d: -z2 };
};
const project = (cam: Cam, p: V3) => {
  const q = toCam(cam, p);
  const s = P / q.d;
  return { d: q.d, s, sx: CX + q.x * s, sy: CY + q.y * s };
};
// Depth of field (screen px) and distance fog.
const blurOf = (cam: Cam, d: number) => {
  const b = Math.min(10, 5600 * Math.abs(1 / d - 1 / cam.focus));
  return Math.round(b * 2) / 2;
};
const brightOf = (cam: Cam, d: number) => 1 - 0.5 * interpolate(d - cam.focus, [250, 3200], [0, 1], clamp);

// ------------------------------------------------------- calendar (generic)
// A plain week calendar app, not a branded product (same family as the Holo
// buried-in-client-work calendar). Fictional clients only.
const CAL = { paper: "#FFFFFF", ink: "#1D1D1F", muted: "#8A8A8E", line: "rgba(0,0,0,0.07)" } as const;
type Kind = { bg: string; bar: string; ink: string };
const KINDS: Kind[] = [
  { bg: "#E7EEFD", bar: "#4F7FE6", ink: "#1F3F86" }, // client call
  { bg: "#EEE8FC", bar: "#8B6BE0", ink: "#4B2E99" }, // discovery / kickoff
  { bg: "#E2F5F1", bar: "#1FA88A", ink: "#11644F" }, // build / deploy
  { bg: "#FDF1DE", bar: "#E09A2B", ink: "#7A4E0B" }, // review
  { bg: "#EFEFF1", bar: "#9A9AA0", ink: "#48484D" }, // internal
];
const FILM: Kind = { bg: "#FFE7DF", bar: "#EE5F3B", ink: "#8C2C12" };
const TITLES = [
  ["Client call", 0],
  ["Onboarding", 1],
  ["Agent build", 2],
  ["Build review", 3],
  ["Kickoff call", 1],
  ["Discovery call", 1],
  ["Deploy", 2],
  ["Strategy call", 0],
  ["QA pass", 3],
  ["Handoff", 2],
  ["Scoping call", 0],
  ["Client sync", 4],
] as const;
const CLIENTS = [
  "Cascade Dental",
  "Northline Roofing",
  "Harbor Physio",
  "Kestrel Legal",
  "Summit HVAC",
  "Brightwater Realty",
  "Alder Logistics",
  "Pinecrest Clinics",
  "Ridgeway Auto",
  "Oakline Fitness",
  "Lumen Spa",
  "Fairway Insurance",
];
const TIMES = ["9:00 AM", "9:30 AM", "10:00 AM", "11:00 AM", "11:30 AM", "12:00 PM", "1:00 PM", "1:30 PM", "2:00 PM", "3:00 PM", "3:30 PM", "4:00 PM"];
const DAYS = [
  ["MON", "5"],
  ["TUE", "6"],
  ["WED", "7"],
  ["THU", "8"],
  ["FRI", "9"],
] as const;

const rand = (i: number, s = 0) => {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const BLK = { w: 250, h: 92, gap: 8, lift: 6 } as const;
const SHEET = { w: 300, h: 600, head: 70, slot: 74 } as const;

type Ev = { title: string; client: string; time: string; kind: Kind };
const evOf = (seed: number): Ev => {
  const t = TITLES[Math.floor(rand(seed, 3) * TITLES.length)];
  return {
    title: t[0],
    client: CLIENTS[Math.floor(rand(seed, 4) * CLIENTS.length)],
    time: TIMES[Math.floor(rand(seed, 5) * TIMES.length)],
    kind: KINDS[t[1]],
  };
};

type Blk = { id: string; x: number; z: number; ry: number; level: number; L: number; ev: Ev; baseY?: number };
type Sheet = { id: string; x: number; z: number; ry: number; day: number; seed: number };

const WAVES = [-4, 6, 16, 28, 40, 52];
const pathX = (z: number) => interpolate(z, [-500, 430, 1380], [-30, 40, 230], clamp);
const segDist = (px: number, pz: number, ax: number, az: number, bx: number, bz: number) => {
  const vx = bx - ax;
  const vz = bz - az;
  const u = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz)));
  return Math.hypot(px - (ax + vx * u), pz - (az + vz * u));
};

const FIELD = (() => {
  const blocks: Blk[] = [];
  const sheets: Sheet[] = [];
  let n = 0;
  for (let r = 0; r < 10; r++) {
    const z0 = 1250 - r * 290;
    for (let c = 0; c < 10; c++) {
      n++;
      const x = -1750 + c * 390 + (r % 2) * 195 + (rand(n, 1) - 0.5) * 120;
      const z = z0 + (rand(n, 2) - 0.5) * 110;
      if (z > -600 && Math.abs(x - pathX(z)) < 250) continue; // camera corridor
      if (z > FR.z && segDist(x, z, CAM[0].x, CAM[0].z, FR.x, FR.z) < 240) continue; // line of sight to the slot
      if (Math.abs(x - FR.x) < 560 && Math.abs(z - FR.z) < 300) continue; // the clearing (boxed in by hand below)
      const ry = (rand(n, 6) - 0.5) * 0.42;
      if (rand(n, 9) < 0.3) {
        sheets.push({ id: `s${n}`, x, z, ry, day: n % 5, seed: n });
        continue;
      }
      const count = 1 + Math.floor(rand(n, 10) * (z < -700 ? 2 : 4));
      const pre = Math.floor(rand(n, 11) * (count + 1));
      const w0 = WAVES[Math.floor(rand(n, 12) * WAVES.length)] + Math.floor(rand(n, 13) * 5);
      for (let k = 0; k < count; k++) {
        const L = k < pre ? -60 : w0 + (k - pre) * 6;
        blocks.push({ id: `b${n}-${k}`, x, z, ry, level: k, L, ev: evOf(n * 7 + k) });
      }
    }
  }
  // the clearing: client blocks land around, on top of and in front of the slot
  const box = (id: string, x: number, z: number, ry: number, levels: number[], ev0: number, baseY = 0) => {
    levels.forEach((L, k) => blocks.push({ id, x, z, ry, level: k, L, ev: evOf(ev0 + k), baseY }));
  };
  box("fl", FR.x - 252, FR.z + 6, 0.06, [18, 25], 901);
  box("fr", FR.x + 250, FR.z - 4, -0.08, [24, 31, 38], 911);
  box("fb", FR.x - 10, FR.z - 120, 0.03, [-60, 14, 21], 921);
  box("ft", FR.x + 4, FR.z + 2, 0.02, [34], 931, -(FR.h + BLK.gap)); // lands on the slot
  box("ff", FR.x + 6, FR.z + 118, -0.04, [41, 47], 941); // in front: buries it
  box("ff2", FR.x - 190, FR.z + 150, 0.1, [50], 951);
  return { blocks, sheets };
})();

// --------------------------------------------------------------- planes
const Plane: React.FC<{
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  ry?: number;
  blur?: number;
  bright?: number;
  opacity?: number;
  scale?: number;
  solid?: boolean;
  children: React.ReactNode;
}> = ({ x, y, z, w, h, ry = 0, blur = 0, bright = 1, opacity = 1, scale = 1, solid = false, children }) => {
  // quantized + capped so near-lens planes cannot blow up the GPU compositor
  const bq = Math.min(12, Math.round(blur));
  const f = [bq >= 1 ? `blur(${bq}px)` : "", bright < 0.995 ? `brightness(${bright.toFixed(3)})` : ""].join(" ").trim();
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: w,
        height: h,
        transformOrigin: "50% 100%",
        transform: `translate3d(${x - w / 2}px, ${y - h}px, ${z}px) rotateY(${ry}rad)${scale !== 1 ? ` scale(${scale.toFixed(4)})` : ""}`,
        backfaceVisibility: solid ? undefined : "hidden",
        transformStyle: solid ? "preserve-3d" : undefined,
        filter: solid ? undefined : f || undefined,
        opacity,
      }}
    >
      {children}
    </div>
  );
};

// corner depths for culling + screen bbox
const planeView = (cam: Cam, x: number, y: number, z: number, w: number, h: number, ry: number) => {
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  let minD = Infinity;
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const lx of [-w / 2, w / 2]) {
    for (const ly of [0, -h]) {
      const p = project(cam, { x: x + c * lx, y: y + ly, z: z - s * lx });
      minD = Math.min(minD, p.d);
      x0 = Math.min(x0, p.sx);
      x1 = Math.max(x1, p.sx);
      y0 = Math.min(y0, p.sy);
      y1 = Math.max(y1, p.sy);
    }
  }
  const mid = project(cam, { x, y: y - h / 2, z });
  const visible = minD > 28 && x1 > -260 && x0 < 1340 && y1 > -260 && y0 < 1220;
  return { visible, d: mid.d, s: mid.s };
};

const EventCard: React.FC<{ ev: Ev; w: number; h: number; dim?: number }> = ({ ev, w, h, dim = 0 }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      width: w,
      height: h,
      borderRadius: 12,
      backgroundColor: ev.kind.bg,
      overflow: "hidden",
      fontFamily: CAL_FONT,
      boxShadow: "inset 0 -14px 22px -14px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)",
    }}
  >
    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, backgroundColor: ev.kind.bar }} />
    <div style={{ position: "absolute", left: 18, top: 11, fontSize: 15, fontWeight: 600, color: ev.kind.ink, opacity: 0.66, whiteSpace: "nowrap" }}>{ev.time}</div>
    <div style={{ position: "absolute", left: 18, right: 10, top: 30, fontSize: 23, fontWeight: 700, color: ev.kind.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "-0.2px" }}>
      {ev.title}
    </div>
    <div style={{ position: "absolute", left: 18, right: 10, top: 60, fontSize: 17, fontWeight: 500, color: ev.kind.ink, opacity: 0.72, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
      {ev.client}
    </div>
    {dim > 0.005 ? <div style={{ position: "absolute", inset: 0, backgroundColor: "#2A2A2E", opacity: dim }} /> : null}
  </div>
);

const FilmCard: React.FC<{ grey: number; dim: number }> = ({ grey, dim }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      borderRadius: 12,
      backgroundColor: FILM.bg,
      overflow: "hidden",
      fontFamily: CAL_FONT,
      boxShadow: "inset 0 -14px 22px -14px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)",
      filter: grey > 0.01 ? `grayscale(${grey.toFixed(2)})` : undefined,
    }}
  >
    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, backgroundColor: FILM.bar }} />
    <div style={{ position: "absolute", left: 18, top: 11, fontSize: 15, fontWeight: 600, color: FILM.ink, opacity: 0.66 }}>4:00 PM</div>
    <svg style={{ position: "absolute", left: 17, top: 37 }} width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={FILM.bar} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6.5" width="12.5" height="11" rx="2.2" />
      <path d="M15.5 10.5 21 7.5v9l-5.5-3" />
    </svg>
    <div style={{ position: "absolute", left: 52, top: 34, fontSize: 26, fontWeight: 700, color: FILM.ink, letterSpacing: "-0.2px", whiteSpace: "nowrap" }}>Film reel</div>
    {dim > 0.005 ? <div style={{ position: "absolute", inset: 0, backgroundColor: "#2A2A2E", opacity: dim }} /> : null}
  </div>
);

const DaySheet: React.FC<{ sh: Sheet; frame: number }> = ({ sh, frame }) => {
  const [dn, dd] = DAYS[sh.day];
  const slots = Array.from({ length: 7 }).map((_, i) => {
    const seed = sh.seed * 13 + i;
    const pre = rand(seed, 20) < 0.45;
    const L = pre ? -60 : WAVES[Math.floor(rand(seed, 21) * WAVES.length)] + Math.floor(rand(seed, 22) * 6);
    return { i, L, ev: evOf(seed) };
  });
  return (
    <div style={{ position: "absolute", inset: 0, borderRadius: 18, backgroundColor: CAL.paper, overflow: "hidden", fontFamily: CAL_FONT, boxShadow: "inset 0 -40px 50px -40px rgba(0,0,0,0.10)" }}>
      <div style={{ position: "absolute", left: 22, top: 20, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 17, fontWeight: 600, color: CAL.muted, letterSpacing: "1px" }}>{dn}</span>
        <span style={{ fontSize: 24, fontWeight: 700, color: CAL.ink }}>{dd}</span>
      </div>
      {slots.map((s) => (
        <div key={`l${s.i}`} style={{ position: "absolute", left: 0, right: 0, top: SHEET.head + s.i * SHEET.slot, height: 1, backgroundColor: CAL.line }} />
      ))}
      {slots.map((s) => {
        const a = interpolate(frame, [s.L, s.L + 9], [0, 1], { ...clamp, easing: ENTER });
        if (a <= 0.001) return null;
        return (
          <div
            key={`e${s.i}`}
            style={{
              position: "absolute",
              left: 10,
              top: SHEET.head + s.i * SHEET.slot + 4,
              width: SHEET.w - 20,
              height: SHEET.slot - 8,
              borderRadius: 9,
              backgroundColor: s.ev.kind.bg,
              overflow: "hidden",
              opacity: interpolate(a, [0, 0.4], [0, 1], clamp),
              transform: `translateY(${(1 - a) * -14}px)`,
            }}
          >
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, backgroundColor: s.ev.kind.bar }} />
            <div style={{ position: "absolute", left: 15, right: 8, top: 9, fontSize: 18, fontWeight: 700, color: s.ev.kind.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.ev.title}</div>
            <div style={{ position: "absolute", left: 15, right: 8, top: 35, fontSize: 15, fontWeight: 500, color: s.ev.kind.ink, opacity: 0.72, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.ev.client}</div>
          </div>
        );
      })}
    </div>
  );
};

// --------------------------------------------------------- Manus Studio UI
// Window-local CSS px of the 1289x898 Studio window (captures minus 204,34).
const SIDE = STUDIO_WIN.sidebarW;
const CREATE_ORANGE = "#BC8235"; // Create glyph art, sampled from 01-studio-home (no studio() token for it)

const Ico: React.FC<{ d: string; x: number; y: number; s?: number; c?: string; w?: number }> = ({ d, x, y, s = 18, c = S.ink, w = 1.6 }) => (
  <svg style={{ position: "absolute", left: x - s / 2, top: y - s / 2 }} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const I = {
  panel: "M4 5h16v14H4zM10 5v14",
  panelR: "M4 5h16v14H4zM14.5 5v14",
  back: "M19 12H5M11 6l-6 6 6 6",
  fwd: "M5 12h14M13 6l6 6-6 6",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 20 20",
  newTask: "M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6M17.5 3.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z",
  computer: "M3.5 5h17v11h-17zM9 20h6M12 16v4",
  library: "M5 4v16M9 4v16M13 5l4 15M17.5 4.5l3 15",
  creations: "M4 20 20 4M6.5 4a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM14 14h6v6h-6z",
  automations: "M4 4h6v6H4zM14 14h6v6h-6zM7 10v4a3 3 0 0 0 3 3h4",
  plugins: "M7 3.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM17 3.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM7 13.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM17 13.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  newProject: "M20 12V8h-8l-2-2.5H4v13h8M16 17h6M19 14v6",
  chev: "M7 10l5 5 5-5",
  right: "M10 6l6 6-6 6",
  left: "M14 6l-6 6 6 6",
  sparkle: "M11 3l1.6 4.4L17 9l-4.4 1.6L11 15l-1.6-4.4L5 9l4.4-1.6zM18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z",
  laptop: "M5 6.5h14v9H5zM3 18.5h18",
  box: "M4.5 8h15v11h-15zM4.5 8l1.5-3h12l1.5 3M10 12h4",
  folder: "M3.5 6h6l2 2.2h9v10.3h-17z",
  plus: "M12 5v14M5 12h14",
  plug: "M8 3v4M8 7a3 3 0 0 0-3 3v1a3 3 0 0 0 6 0v-1a3 3 0 0 0-3-3zM8 14v4a3 3 0 0 0 6 0V8a3 3 0 0 1 6 0v8M17 16v4M20 16v4",
  shield: "M12 3.5l7 2.8v5.2c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V6.3zM9 12l2.2 2.2L15.5 10",
  chatDots: "M4 12a8 7.4 0 1 1 3.3 6l-3.3 1.2 1.1-3.1A7 7 0 0 1 4 12zM8.8 12h.01M12 12h.01M15.2 12h.01",
  mic: "M12 4a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V7a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v3",
  up: "M12 19V5M6 11l6-6 6 6",
  devices: "M3 5h13v9H3zM6.5 18h6M9.5 14v4M18 9h3v10h-4v-2",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5h4",
  playSq: "M4 5.5h16v13H4zM10.2 9.2v5.6l4.6-2.8z",
  phone: "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z",
  flask: "M9.5 3.5h5M10.5 3.5v5.8L5.2 18.2A1.6 1.6 0 0 0 6.6 20.5h10.8a1.6 1.6 0 0 0 1.4-2.3l-5.3-8.9V3.5",
};

const NAV_Y = [69, 102, 135, 168, 201, 234, 267, 300];
const NAV_I = [I.newTask, I.computer, "", I.library, I.creations, I.automations, I.plugins, I.more];

const Sidebar: React.FC = () => (
  <div style={{ position: "absolute", left: 0, top: 0, width: SIDE, height: WIN.h, backgroundColor: S.sidebar, borderRight: `1px solid ${S.border}` }}>
    {/* macOS traffic lights (the only fixed colors in the window) */}
    {[
      [22, "#FF5F57"],
      [45, "#FEBC2E"],
      [68, "#28C840"],
    ].map(([x, c]) => (
      <div key={c} style={{ position: "absolute", left: (x as number) - 6.5, top: 15.5, width: 13, height: 13, borderRadius: 7, backgroundColor: c as string }} />
    ))}
    <Ico d={I.panel} x={100} y={22} s={19} c={S.ink2} />
    <Ico d={I.back} x={132} y={22} s={18} c={S.ink2} />
    <Ico d={I.fwd} x={164} y={22} s={18} c={S.faint} />
    <Ico d={I.search} x={206} y={22} s={19} c={S.ink2} />
    {STUDIO_SIDEBAR.items.map((n, i) => (
      <React.Fragment key={n}>
        {i === 2 ? (
          <Img src={staticFile(MANUS_LOGOS.cueIcon)} style={{ position: "absolute", left: 10, top: NAV_Y[i] - 10, width: 20, height: 20, filter: "grayscale(1)", opacity: 0.75 }} />
        ) : (
          <Ico d={NAV_I[i]} x={20} y={NAV_Y[i]} s={i === 7 ? 19 : 17} w={i === 7 ? 2.6 : 1.6} />
        )}
        <div style={{ position: "absolute", left: 37, top: NAV_Y[i] - 10, fontSize: 14.5, lineHeight: "20px", color: S.ink, whiteSpace: "nowrap" }}>{n}</div>
      </React.Fragment>
    ))}
    <div
      style={{
        position: "absolute",
        left: 84,
        top: NAV_Y[2] - 11,
        height: 22,
        padding: "0 6px",
        borderRadius: 7,
        backgroundColor: S.card,
        border: `1px solid ${S.borderStrong}`,
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
    <div style={{ position: "absolute", left: 13, top: 337, fontSize: 13, lineHeight: "18px", color: S.muted }}>{STUDIO_SIDEBAR.projects}</div>
    <Ico d={I.newProject} x={20} y={379} s={17} />
    <div style={{ position: "absolute", left: 37, top: 369, fontSize: 14.5, lineHeight: "20px", color: S.ink }}>{STUDIO_SIDEBAR.newProject}</div>
    <div style={{ position: "absolute", left: 13, top: 418, fontSize: 13, lineHeight: "18px", color: S.muted }}>{STUDIO_SIDEBAR.tasks}</div>
    {/* account row */}
    <div style={{ position: "absolute", left: 9, top: 863, width: 28, height: 28, borderRadius: 14, backgroundColor: S.brandSoft, overflow: "hidden" }}>
      <svg width={28} height={28} viewBox="0 0 28 28">
        <circle cx={14} cy={11} r={5} fill={S.brand} opacity={0.7} />
        <path d="M5 27c0-6 4-9 9-9s9 3 9 9z" fill={S.brand} opacity={0.7} />
      </svg>
    </div>
    <div style={{ position: "absolute", left: 45, top: 867, fontSize: 14.5, lineHeight: "20px", fontWeight: 500, color: S.ink, whiteSpace: "nowrap" }}>{STUDIO_SIDEBAR.user}</div>
    <Ico d={I.devices} x={153} y={877} s={18} />
    <Ico d={I.bell} x={185} y={877} s={18} />
    <div style={{ position: "absolute", left: 189, top: 867, width: 7, height: 7, borderRadius: 4, backgroundColor: S.fileIcon }} />
    <div style={{ position: "absolute", left: 208, top: 868, width: 18, height: 18, borderRadius: 9, backgroundColor: S.brand }}>
      <Ico d={I.up} x={9} y={9} s={12} c={S.maxBadgeBg} w={2.6} />
    </div>
  </div>
);

const Header: React.FC<{ model: string }> = ({ model }) => (
  <>
    <div style={{ position: "absolute", left: 263, top: 12, fontSize: 16.5, lineHeight: "22px", fontWeight: 500, color: S.ink, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
      {model}
      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={S.ink2} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d={I.chev} />
      </svg>
    </div>
    <div style={{ position: "absolute", left: 1156, top: 7, width: 78, height: 31, borderRadius: 9, border: `1px solid ${S.border}`, backgroundColor: S.card, boxSizing: "border-box" }}>
      <Ico d={I.sparkle} x={17} y={15} s={16} c={S.ink} />
      <div style={{ position: "absolute", left: 29, top: 5, fontSize: 15, lineHeight: "20px", fontWeight: 500, color: S.ink }}>{STUDIO_SIDEBAR.credits}</div>
    </div>
    <Ico d={I.panelR} x={1258} y={22} s={19} c={S.ink2} />
  </>
);

// 01-studio-home: lockup + Build / Create / local file cards
const HomeView: React.FC<{ hover: number; press: number }> = ({ hover, press }) => (
  <>
    <Img src={staticFile(LOGO.mark)} style={{ position: "absolute", left: 376, top: 181, width: 50, height: 50 }} />
    <Img src={staticFile(LOGO.word)} style={{ position: "absolute", left: 437, top: 178, height: 58, width: (58 * 88) / 38 }} />
    <div style={{ position: "absolute", left: 585, top: 180, fontFamily: MANUS_SERIF, fontSize: 37, lineHeight: "50px", color: S.muted, whiteSpace: "nowrap" }}>{STUDIO_HOME.lockupStudio}</div>

    {/* Build */}
    <div style={{ position: "absolute", left: 381, top: 264, width: 489, height: 130, borderRadius: 14, backgroundColor: S.card, border: `1px solid ${S.border}`, boxSizing: "border-box", overflow: "hidden" }}>
      <svg style={{ position: "absolute", left: 19, top: 25 }} width={22} height={22} viewBox="0 0 24 24">
        <path d="M3.5 9.5 10 3.6l3.2 3.1-1.9 1.9 8.6 8.7-3 3-8.6-8.7-1.9 1.9z" fill={S.brand} />
      </svg>
      <div style={{ position: "absolute", left: 19, top: 61, fontSize: 16.5, lineHeight: "22px", fontWeight: 600, color: S.ink, display: "flex", alignItems: "center", gap: 6 }}>
        {STUDIO_HOME.build}
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={S.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d={I.right} />
        </svg>
      </div>
      <div style={{ position: "absolute", left: 19, top: 85, fontSize: 14.5, lineHeight: "20px", color: S.muted }}>{STUDIO_HOME.buildSub}</div>
      <svg style={{ position: "absolute", left: 353, top: 18 }} width={136} height={112} viewBox="0 0 136 112" fill="none" stroke={S.borderStrong} strokeWidth={1}>
        {[0, 27, 54, 81, 108, 135].map((x) => (
          <path key={`gx${x}`} d={`M${x + 0.5} 0V112`} opacity={0.6} />
        ))}
        {[0, 27, 54, 81, 108].map((y) => (
          <path key={`gy${y}`} d={`M0 ${y + 0.5}H136`} opacity={0.6} />
        ))}
        <circle cx={75} cy={70} r={62} opacity={0.7} />
        <circle cx={75} cy={70} r={46} fill={S.track} stroke={S.borderStrong} />
        <circle cx={75} cy={70} r={23} fill={S.card} />
        <path d="M5 4 136 112M136 4 5 112" strokeDasharray="3 4" opacity={0.5} />
      </svg>
    </div>

    {/* Create (hover + press) */}
    <div
      style={{
        position: "absolute",
        left: 381,
        top: 404,
        width: 489,
        height: 130,
        borderRadius: 14,
        backgroundColor: S.card,
        border: `1px solid ${hover > 0.5 ? S.borderStrong : S.border}`,
        boxSizing: "border-box",
        overflow: "hidden",
        transform: `scale(${1 - 0.012 * press})`,
      }}
    >
      <div style={{ position: "absolute", inset: 0, backgroundColor: S.hover, opacity: hover }} />
      <svg style={{ position: "absolute", left: 19, top: 25 }} width={24} height={24} viewBox="0 0 24 24">
        <circle cx={8} cy={8} r={5.2} fill={CREATE_ORANGE} />
        <circle cx={16.6} cy={11.2} r={3.4} fill={CREATE_ORANGE} />
        <circle cx={10.5} cy={17.6} r={4} fill={CREATE_ORANGE} />
      </svg>
      <div style={{ position: "absolute", left: 19, top: 61, fontSize: 16.5, lineHeight: "22px", fontWeight: 600, color: S.ink, display: "flex", alignItems: "center", gap: 6 }}>
        {STUDIO_HOME.create}
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={S.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ transform: `translateX(${2 * hover}px)` }}>
          <path d={I.right} />
        </svg>
      </div>
      <div style={{ position: "absolute", left: 19, top: 85, fontSize: 14.5, lineHeight: "20px", color: S.muted }}>{STUDIO_HOME.createSub}</div>
      <svg style={{ position: "absolute", left: 340, top: 0 }} width={149} height={130} viewBox="0 0 149 130" fill="none">
        <path d="M22 130 12 74l118-14 19 4" stroke={S.borderStrong} />
        <path d="M30 120 38 54 148 76" stroke={S.borderStrong} strokeDasharray="4 4" />
        <path d="M52 96 70 22l79 26v76z" fill={S.track} stroke={S.borderStrong} />
        <path d="M60 130 66 74l83 30" stroke={S.borderStrong} />
      </svg>
    </div>

    {/* Start from a local file */}
    <div style={{ position: "absolute", left: 879, top: 264, width: 269, height: 270, borderRadius: 14, backgroundColor: S.card, border: `1px solid ${S.border}`, boxSizing: "border-box" }}>
      <svg style={{ position: "absolute", left: 95, top: 74 }} width={78} height={66} viewBox="0 0 78 66">
        <path d="M5 5a4 4 0 0 1 4-4h20l6 7h34a4 4 0 0 1 4 4v8H5z" fill={S.track} stroke={S.borderStrong} />
        <path d="M2 18a3 3 0 0 1 3-3h68a3 3 0 0 1 3 3l-3 43a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" fill={S.cardAlt} stroke={S.borderStrong} />
      </svg>
      <div style={{ position: "absolute", left: 0, width: 269, top: 163, textAlign: "center", fontSize: 16.5, lineHeight: "22px", fontWeight: 500, color: S.ink }}>{STUDIO_HOME.local}</div>
      <div style={{ position: "absolute", left: 0, width: 269, top: 187, textAlign: "center", fontSize: 14.5, lineHeight: "20px", color: S.muted }}>{STUDIO_HOME.localSub}</div>
    </div>
  </>
);

// rec-t025 / rec-t070: Create > Video
// Neutral tinted tiles (no invented photos), every tone from studio().
const GAL_K = 130 / 113;

const VideoView: React.FC<{ t: number }> = ({ t }) => {
  // t = frames since the switch
  const rise = (d: number, dist = 12) => {
    const a = interpolate(t, [d, d + 14], [0, 1], { ...clamp, easing: ENTER });
    return { opacity: interpolate(a, [0, 0.5], [0, 1], clamp), transform: `translateY(${(1 - a) * dist}px)` };
  };
  return (
    <>
      <div style={{ position: "absolute", left: 239, width: 1050, top: 72, textAlign: "center", fontFamily: MANUS_SERIF, fontSize: 49, lineHeight: "64px", color: S.ink, whiteSpace: "nowrap", ...rise(1, 16) }}>
        {STUDIO_VIDEO.headline}
      </div>
      <div style={{ position: "absolute", left: 287, top: 234, display: "flex", alignItems: "baseline", gap: 11, ...rise(5) }}>
        <span style={{ fontSize: 16.5, fontWeight: 600, color: S.ink }}>{STUDIO_VIDEO.templateTitle}</span>
        <span style={{ fontSize: 13.5, color: S.muted }}>{STUDIO_VIDEO.templateSub}</span>
      </div>
      <div style={rise(5)}>
        <Ico d={I.left} x={1192} y={245} s={15} c={S.faint} w={2} />
        <Ico d={I.right} x={1228} y={245} s={15} c={S.ink2} w={2} />
      </div>
      {STUDIO_VIDEO.templates.map((name, i) => (
        <div
          key={name}
          style={{
            position: "absolute",
            left: 287 + i * 118,
            top: 277,
            width: 108,
            height: 161,
            borderRadius: 8,
            backgroundColor: S.cardAlt,
            overflow: "hidden",
            ...rise(7 + i * 2, 14),
          }}
        >
          {/* the app's own template art (title baked in), cropped from the real capture rec-t025 at 1x */}
          <Img
            src={staticFile("manus2/studio/rec-t025.png")}
            style={{ position: "absolute", left: -(491 + i * 118), top: -311, width: 1512, height: 982, maxWidth: "none" }}
          />
        </div>
      ))}
      <div style={{ position: "absolute", left: 287, top: 474, display: "flex", alignItems: "center", gap: 8, ...rise(12) }}>
        <span style={{ fontSize: 16.5, fontWeight: 600, color: S.ink }}>{STUDIO_VIDEO.madeWith}</span>
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={S.brand} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d={I.flask} />
        </svg>
      </div>
      <div style={rise(12)}>
        <Ico d={I.left} x={1194} y={485} s={15} c={S.faint} w={2} />
        <Ico d={I.right} x={1228} y={485} s={15} c={S.ink2} w={2} />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={`m${i}`}
          style={{
            position: "absolute",
            left: 287 + i * 241,
            top: 511,
            width: 231,
            height: 130,
            borderRadius: 8,
            backgroundColor: S.cardAlt,
            overflow: "hidden",
            ...rise(14 + i * 2, 14),
          }}
        >
          {/* "Made with Alchemy" art cropped from rec-t070 (113px tall there, scaled to the 130px tile) */}
          <Img
            src={staticFile("manus2/studio/rec-t070.png")}
            style={{
              position: "absolute",
              left: -([491, 733, 974, 1215][i] * GAL_K) - (231 * (GAL_K - 1)) / 2,
              top: -512 * GAL_K,
              width: 1512 * GAL_K,
              height: 982 * GAL_K,
              maxWidth: "none",
            }}
          />
        </div>
      ))}
    </>
  );
};

const PromptBox: React.FC<{ video: number; t: number; caret: boolean }> = ({ video, t, caret }) => {
  const home = 1 - video;
  const chip = (d: number) => {
    const a = interpolate(t, [d, d + 10], [0, 1], { ...clamp, easing: ENTER });
    return { opacity: interpolate(a, [0, 0.5], [0, 1], clamp), transform: `translateX(${(1 - a) * -8}px)` };
  };
  const pill = (left: number, width: number, extra: React.CSSProperties, children: React.ReactNode, d: number) => (
    <div
      style={{
        position: "absolute",
        left,
        top: 75,
        width,
        height: 32,
        borderRadius: 16,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        fontSize: 15,
        fontWeight: 500,
        whiteSpace: "nowrap",
        ...extra,
        ...chip(d),
      }}
    >
      {children}
    </div>
  );
  return (
    <>
      <div style={{ position: "absolute", left: 381, top: 716, width: 767, height: 162, borderRadius: 22, backgroundColor: S.fieldHead, border: `1px solid ${S.border}`, boxSizing: "border-box" }}>
        <Ico d={I.laptop} x={24} y={21} s={17} c={S.ink2} />
        <div style={{ position: "absolute", left: 39, top: 11, fontSize: 14.5, lineHeight: "20px", color: S.ink2 }}>{STUDIO_HOME.scope[0]}</div>
        <Ico d={I.box} x={123} y={21} s={17} c={S.ink2} />
        <div style={{ position: "absolute", left: 137, top: 11, fontSize: 14.5, lineHeight: "20px", color: S.ink2 }}>{STUDIO_HOME.scope[1]}</div>
        <Ico d={I.folder} x={262} y={21} s={17} c={S.ink2} />
        <div style={{ position: "absolute", left: 276, top: 11, fontSize: 14.5, lineHeight: "20px", color: S.ink2 }}>{STUDIO_HOME.scope[2]}</div>
      </div>
      <div style={{ position: "absolute", left: 381, top: 759, width: 767, height: 119, borderRadius: 22, backgroundColor: S.field, border: `1px solid ${S.borderStrong}`, boxSizing: "border-box" }}>
        {/* placeholder + caret */}
        <div style={{ position: "absolute", left: 17, top: 16, fontSize: 16, lineHeight: "22px", color: S.faint, whiteSpace: "nowrap", opacity: home }}>{STUDIO_HOME.placeholder}</div>
        <div style={{ position: "absolute", left: 17, top: 16, fontSize: 16, lineHeight: "22px", color: S.faint, whiteSpace: "nowrap", opacity: video }}>{STUDIO_VIDEO.placeholder}</div>
        {caret ? <div style={{ position: "absolute", left: 16, top: 17, width: 1.6, height: 20, backgroundColor: S.ink }} /> : null}
        {/* left controls */}
        <div style={{ position: "absolute", left: 12, top: 75, width: 32, height: 32, borderRadius: 16, border: `1px solid ${S.borderStrong}`, boxSizing: "border-box" }}>
          <Ico d={I.plus} x={15} y={15} s={16} c={S.ink2} />
        </div>
        <div style={{ position: "absolute", left: 52, top: 75, width: 32, height: 32, borderRadius: 16, border: `1px solid ${S.borderStrong}`, boxSizing: "border-box" }}>
          <div style={{ opacity: home }}>
            <Ico d={I.plug} x={15} y={15} s={16} c={S.ink2} />
          </div>
          <div style={{ opacity: video }}>
            <Ico d={I.playSq} x={15} y={15} s={16} c={S.ink} />
          </div>
        </div>
        <Ico d={I.shield} x={108} y={91} s={16} c={S.muted} />
        <div style={{ position: "absolute", left: 122, top: 81, fontSize: 14.5, lineHeight: "20px", color: S.muted, whiteSpace: "nowrap" }}>{STUDIO_HOME.approve}</div>
        {/* home: right icons */}
        <div style={{ opacity: home }}>
          <Ico d={I.chatDots} x={666} y={91} s={18} c={S.ink2} />
        </div>
        {/* video chips (real strings) */}
        {video > 0.001 ? (
          <>
            {pill(
              232,
              76,
              { border: `1px solid ${S.brand}`, backgroundColor: S.brandSoft, color: S.brand, justifyContent: "center", gap: 6 },
              <>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={S.brand} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d={I.playSq} />
                </svg>
                {STUDIO_VIDEO.chipVideo}
              </>,
              2,
            )}
            {pill(
              318,
              161,
              { backgroundColor: S.brand, color: S.maxBadgeBg, paddingLeft: 14, gap: 7, fontWeight: 600 },
              <>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={S.maxBadgeBg} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                  <path d={I.flask} />
                </svg>
                {STUDIO_VIDEO.chipAlchemy}
                <span style={{ marginLeft: 2, padding: "0 6px", height: 19, borderRadius: 5, backgroundColor: S.maxBadgeBg, color: S.maxBadgeInk, fontFamily: MANUS_SERIF, fontWeight: 700, fontSize: 12.5, lineHeight: "19px" }}>
                  {STUDIO_VIDEO.chipMax}
                </span>
                <svg style={{ marginLeft: 4 }} width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={S.maxBadgeBg} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                  <path d={I.chev} />
                </svg>
              </>,
              4,
            )}
            {pill(
              490,
              88,
              { border: `1px solid ${S.borderStrong}`, color: S.ink, justifyContent: "center", gap: 7 },
              <>
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={S.ink2} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d={I.phone} />
                </svg>
                {STUDIO_VIDEO.chipRatio}
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={S.ink2} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                  <path d={I.chev} />
                </svg>
              </>,
              6,
            )}
            {pill(
              619,
              58,
              { color: S.ink2, justifyContent: "center", gap: 5 },
              <>
                {STUDIO_VIDEO.chipQuality}
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={S.ink2} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                  <path d={I.chev} />
                </svg>
              </>,
              8,
            )}
          </>
        ) : null}
        <Ico d={I.mic} x={698} y={91} s={18} c={S.ink2} />
        <div style={{ position: "absolute", left: 722, top: 75, width: 32, height: 32, borderRadius: 16, backgroundColor: S.track }}>
          <Ico d={I.up} x={16} y={16} s={16} c={S.faint} w={2.2} />
        </div>
      </div>
    </>
  );
};

const T_CUR_IN = 98;
const T_CLICK = 120;
const T_SWITCH = 122;
const CREATE_BOX = { x0: 381, x1: 870, y0: 404, y1: 534 };

const StudioWindow: React.FC<{ frame: number; cur: { x: number; y: number } }> = ({ frame, cur }) => {
  const inside = cur.x > CREATE_BOX.x0 && cur.x < CREATE_BOX.x1 && cur.y > CREATE_BOX.y0 && cur.y < CREATE_BOX.y1;
  const hover = frame >= T_CUR_IN && frame < T_SWITCH + 2 && inside ? 1 : 0;
  const press = pressAt(frame, T_CLICK);
  const homeO = interpolate(frame, [T_SWITCH - 1, T_SWITCH + 4], [1, 0], clamp);
  const video = interpolate(frame, [T_SWITCH, T_SWITCH + 6], [0, 1], clamp);
  const t = frame - T_SWITCH;
  const caret = frame >= T_SWITCH + 8 && Math.floor((frame - T_SWITCH - 8) / 15) % 2 === 0;
  return (
    <div style={{ position: "absolute", inset: 0, borderRadius: STUDIO_WIN.radius, backgroundColor: S.win, overflow: "hidden", fontFamily: MANUS_FONT, boxShadow: `0 0 0 1px ${S.border}` }}>
      <Sidebar />
      <Header model={frame >= T_SWITCH ? STUDIO_VIDEO.model : STUDIO_HOME.model} />
      {homeO > 0.001 ? (
        <div style={{ opacity: homeO }}>
          <HomeView hover={hover} press={press} />
        </div>
      ) : null}
      {video > 0.001 ? <VideoView t={t} /> : null}
      <PromptBox video={video} t={t} caret={caret} />
    </div>
  );
};

// ---------------------------------------------------------------- cursor
const CUR_KEYS: CK[] = [
  { f: T_CUR_IN, x: 1010, y: 905 },
  { f: 116, x: 596, y: 474 },
  { f: 124, x: 598, y: 476 },
  { f: 146, x: 905, y: 812 },
  { f: DUR, x: 909, y: 815 },
];

// ================================================================= scene
const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = camAt(frame);

  // ---------- background: sky, haze, floor grid, world light ----------
  const dirH = { x: cam.T.x - cam.C.x, z: cam.T.z - cam.C.z };
  const dl = Math.hypot(dirH.x, dirH.z);
  const hz = project(cam, { x: cam.C.x + (dirH.x / dl) * 1e6, y: 0, z: cam.C.z + (dirH.z / dl) * 1e6 });
  const horizonY = hz.sy;

  const gridLines: string[] = [];
  const pushLine = (pts: V3[]) => {
    const seg: string[] = [];
    for (const p of pts) {
      const q = project(cam, p);
      if (q.d > 30) seg.push(`${q.sx.toFixed(1)},${q.sy.toFixed(1)}`);
      else if (seg.length > 1) break;
    }
    if (seg.length > 1) gridLines.push(seg.join(" "));
  };
  const G = 200;
  for (let i = -24; i <= 24; i++) pushLine(Array.from({ length: 46 }).map((_, k) => ({ x: i * G, y: 0, z: 2000 - k * 180 })));
  for (let k = 0; k < 40; k++) pushLine(Array.from({ length: 46 }).map((_, i) => ({ x: -5000 + i * 222, y: 0, z: 1900 - k * G })));

  // world-anchored light shafts in the sky (Merydian streaks)
  const streaks = [-0.5, -0.18, 0.12, 0.42].map((az, i) => {
    const rel = az - cam.th;
    return { sx: CX + Math.tan(rel) * P, w: [170, 110, 210, 120][i], o: [0.5, 0.32, 0.46, 0.3][i] };
  });

  // ---------- objects ----------
  type Node = { d: number; el: React.ReactNode };
  const nodes: Node[] = [];
  const floor: React.ReactNode[] = [];

  const shadow = (key: string, x: number, z: number, w: number, depth: number, ry: number, a: number) => {
    const q = project(cam, { x, y: 0, z });
    if (q.d < 60 || a < 0.01) return;
    floor.push(
      <div
        key={key}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: w,
          height: depth,
          transformOrigin: "50% 50%",
          transform: `translate3d(${x - w / 2}px, ${-1 - depth / 2}px, ${z}px) rotateY(${ry}rad) rotateX(90deg)`,
          background: `radial-gradient(closest-side, rgba(0,0,0,${(0.62 * a).toFixed(3)}) 0%, rgba(0,0,0,${(0.36 * a).toFixed(3)}) 55%, rgba(0,0,0,0) 100%)`,
          backfaceVisibility: "hidden",
        }}
      />,
    );
  };

  // day sheets
  // The calendar streams in from deep background and slides PAST the Merydian mark on flanking paths: every card
  // stays on its own side of the mark (never crossing its silhouette), travelling in depth to its place.
  const FLANK = 330; // minimum sideways clearance from the mark's centre line
  const emerge = (seed: number, land: number, rest: V3, travel = 26) => {
    const u = interpolate(frame, [land - travel, land], [0, 1], { ...clamp, easing: DECEL });
    const side = rest.x >= LG_C.x ? 1 : -1;
    const startX = LG_C.x + side * Math.max(Math.abs(rest.x - LG_C.x), FLANK) * (1.05 + 0.3 * rand(seed, 31));
    const startZ = Math.max(-2300, rest.z - 1500 - 800 * rand(seed, 34));
    return {
      u,
      x: startX + (rest.x - startX) * u,
      y: rest.y,
      z: startZ + (rest.z - startZ) * u,
      scale: 1,
      opacity: interpolate(u, [0, 0.22], [0, 1], clamp),
    };
  };
  const landOf = (seed: number, L: number) =>
    L < 0 ? EMERGE[0] + 8 + Math.floor(rand(seed, 32) * 22) : Math.round(EMERGE[0] + 12 + (L / 58) * (EMERGE[1] - EMERGE[0] - 12));

  // day sheets
  for (const sh of FIELD.sheets) {
    const e = emerge(sh.seed, EMERGE[0] + 10 + Math.floor(rand(sh.seed, 33) * 26), { x: sh.x, y: -BLK.lift, z: sh.z }, 28);
    if (e.u <= 0) continue;
    const v = planeView(cam, e.x, e.y, e.z, SHEET.w * e.scale, SHEET.h * e.scale, sh.ry);
    shadow(`${sh.id}sh`, e.x, e.z + 10, SHEET.w * 1.25 * e.scale, 120 * e.scale, sh.ry, e.u * e.u);
    if (!v.visible) continue;
    const b = blurOf(cam, v.d);
    nodes.push({
      d: v.d,
      el: (
        <Plane key={sh.id} x={e.x} y={e.y} z={e.z} w={SHEET.w} h={SHEET.h} ry={sh.ry} blur={b / v.s} bright={brightOf(cam, v.d)} scale={e.scale} opacity={e.opacity}>
          <DaySheet sh={sh} frame={frame} />
        </Plane>
      ),
    });
  }

  // cards that keep going: from deep background, past the mark on either side / above it / low by the lens, and
  // out behind the camera (they never land and never cross the mark)
  for (let i = 0; i < 16; i++) {
    const t0 = EMERGE[0] - 2 + i * 2.3;
    const u = interpolate(frame, [t0, t0 + 30], [0, 1], { ...clamp, easing: Easing.bezier(0.3, 0.1, 0.75, 0.75) });
    if (u <= 0 || u >= 1) continue;
    const side = i % 2 ? 1 : -1;
    const kind = i % 4; // 0/1 flanks, 2 above, 3 low and close to the lens
    const off = kind === 2 ? 120 + rand(i, 41) * 260 : FLANK + 20 + rand(i, 41) * (kind === 3 ? 90 : 520);
    const x = LG_C.x + side * off * (1 + 0.25 * u);
    const y = kind === 2 ? -560 - rand(i, 42) * 150 : kind === 3 ? -40 - rand(i, 42) * 70 : -90 - rand(i, 42) * 330;
    const z = -1500 + (1900 + 1500) * u;
    const ry = -side * (0.1 + rand(i, 43) * 0.3);
    const v = planeView(cam, x, y, z, BLK.w, BLK.h, ry);
    if (!v.visible) continue;
    const b = blurOf(cam, v.d);
    nodes.push({
      d: v.d,
      el: (
        <Plane key={`fly${i}`} x={x} y={y} z={z} w={BLK.w} h={BLK.h} ry={ry} blur={b / v.s} bright={brightOf(cam, v.d)} opacity={interpolate(u, [0, 0.12], [0, 1], clamp)}>
          <EventCard ev={evOf(4000 + i)} w={BLK.w} h={BLK.h} />
        </Plane>
      ),
    });
  }

  const filmBuried = interpolate(frame, [44, 64], [0, 1], clamp);
  FIELD.blocks.forEach((bk, bi) => {
    const restY = (bk.baseY ?? 0) - BLK.lift - bk.level * (BLK.h + BLK.gap);
    const e = emerge(bi + 500, landOf(bi + 500, bk.L), { x: bk.x, y: restY, z: bk.z });
    if (e.u <= 0) return;
    const v = planeView(cam, e.x, e.y, e.z, BLK.w * e.scale, BLK.h * e.scale, bk.ry);
    if (bk.level === 0 && (bk.baseY ?? 0) === 0) shadow(`${bk.id}sh`, e.x, e.z + 8, BLK.w * 1.2 * e.scale, 90 * e.scale, bk.ry, e.u * e.u);
    if (!v.visible) return;
    const b = blurOf(cam, v.d);
    nodes.push({
      d: v.d,
      el: (
        <Plane key={`${bk.id}-${bk.level}`} x={e.x} y={e.y} z={e.z} w={BLK.w} h={BLK.h} ry={bk.ry} blur={b / v.s} bright={brightOf(cam, v.d)} scale={e.scale} opacity={e.opacity}>
          <EventCard ev={bk.ev} w={BLK.w} h={BLK.h} />
        </Plane>
      ),
    });
  });

  // the Merydian mark as a solid object: the official icon is the front face (never recolored); its thickness is
  // the same silhouette stacked along z in a darker shade of the mint. It turns slowly so the edges show.
  {
    const y = -LG.lift;
    const yaw = interpolate(frame, [0, 26, 60], [-0.56, 0.02, 0.2], { ...clamp, easing: Easing.bezier(0.3, 0, 0.3, 1) });
    const tilt = interpolate(frame, [0, 30], [0.09, 0.02], clamp);
    const v = planeView(cam, LG.x, y, LG.z, LG.size, LG.size, 0);
    shadow("lgsh", LG.x, LG.z - 4, LG.size * 1.2, 150, yaw, 1);
    if (v.visible) {
      const b = blurOf(cam, v.d);
      const sweep = interpolate(frame, [4, 30], [-60, 160], clamp); // light band position, % of the face
      const img: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: LG.size, height: LG.size };
      const far = b / v.s >= 1; // out of focus: a filter would flatten the stack, so draw the face only
      nodes.push({
        d: v.d,
        el: (
          <Plane key="mrd" x={LG.x} y={y} z={LG.z} w={LG.size} h={LG.size} ry={yaw} blur={b / v.s} bright={brightOf(cam, v.d)} solid={!far}>
            <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", transform: `rotateX(${tilt}rad)`, transformOrigin: "50% 100%" }}>
              {far
                ? null
                : Array.from({ length: LG_DEPTH }).map((_, i) => (
                    <Img key={i} src={staticFile("manus2/merydian/merydianlogoicon-side.png")} style={{ ...img, transform: `translateZ(${-(LG_DEPTH - i)}px)` }} />
                  ))}
              <Img src={staticFile("manus2/merydian/merydianlogoicon.png")} style={img} />
              {/* soft light sweeping across the front face, clipped to the mark */}
              <div
                style={{
                  ...img,
                  transform: "translateZ(0.5px)",
                  background: `linear-gradient(105deg, rgba(255,255,255,0) ${sweep - 22}%, rgba(255,255,255,0.3) ${sweep}%, rgba(255,255,255,0) ${sweep + 22}%)`,
                  WebkitMaskImage: `url(${staticFile("manus2/merydian/merydianlogoicon.png")})`,
                  maskImage: `url(${staticFile("manus2/merydian/merydianlogoicon.png")})`,
                  WebkitMaskSize: "100% 100%",
                  maskSize: "100% 100%",
                }}
              />
            </div>
          </Plane>
        ),
      });
    }
  }

  // the lone filming slot
  {
    const e = emerge(77, EMERGE[0] + 10, { x: FR.x, y: -BLK.lift, z: FR.z }, 22);
    const v = planeView(cam, e.x, e.y, e.z, FR.w * e.scale, FR.h * e.scale, 0.05);
    if (e.u > 0) shadow("frsh", e.x, e.z + 8, FR.w * 1.2 * e.scale, 80 * e.scale, 0.05, e.u * e.u);
    if (v.visible && e.u > 0) {
      const b = blurOf(cam, v.d);
      nodes.push({
        d: v.d,
        el: (
          <Plane key="film" x={e.x} y={e.y} z={e.z} w={FR.w} h={FR.h} ry={0.05} blur={b / v.s} bright={brightOf(cam, v.d)} scale={e.scale} opacity={e.opacity}>
            <FilmCard grey={0.75 * filmBuried} dim={0.32 * filmBuried} />
          </Plane>
        ),
      });
    }
  }

  // the Manus Studio window, upright on the floor beyond the field
  const curWin = cursorAt(frame, CUR_KEYS);
  {
    const y = -WIN.lift;
    const v = planeView(cam, WIN.cx, y, WIN.z, WIN.w, WIN.h, 0);
    shadow("winsh", WIN.cx, WIN.z + 30, WIN.w * 1.18, 260, 0, 1);
    if (v.visible) {
      const b = blurOf(cam, v.d);
      nodes.push({
        d: v.d,
        el: (
          <Plane key="win" x={WIN.cx} y={y} z={WIN.z} w={WIN.w} h={WIN.h} blur={b / v.s} bright={brightOf(cam, v.d)} opacity={interpolate(frame, [40, 66], [0, 1], clamp)}>
            <StudioWindow frame={frame} cur={curWin} />
          </Plane>
        ),
      });
    }
  }
  nodes.sort((a, b) => b.d - a.d);

  const worldTf = `translateZ(${P}px) rotateX(${cam.ph}rad) rotateY(${cam.th}rad) translate3d(${-cam.C.x}px, ${-cam.C.y}px, ${-cam.C.z}px)`;
  const stage = (children: React.ReactNode) => (
    <div style={{ position: "absolute", inset: 0, perspective: `${P}px`, perspectiveOrigin: `${CX}px ${CY}px` }}>
      <div style={{ position: "absolute", left: CX, top: CY, width: 0, height: 0, transformStyle: "preserve-3d", transformOrigin: "0 0", transform: worldTf }}>{children}</div>
    </div>
  );

  // cursor on the window plane, projected
  const cp = project(cam, winPt(curWin.x, curWin.y));
  const curVis = interpolate(frame, [T_CUR_IN, T_CUR_IN + 6], [0, 1], clamp);
  const press = pressAt(frame, T_CLICK);
  const clickP = project(cam, winPt(596, 474));
  const ripS = interpolate(frame, [T_CLICK, T_CLICK + 13], [0.2, 1.2], { ...clamp, easing: DECEL });
  const ripO = interpolate(frame, [T_CLICK, T_CLICK + 3, T_CLICK + 13], [0, 0.5, 0], clamp);
  const curScale = cp.s;

  const glow = 0.85 + 0.15 * Math.sin((frame / 30) * 1.1 * Math.PI);

  return (
    <AbsoluteFill style={{ backgroundColor: MRD.bg }}>
      {/* sky above the horizon */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${MRD.bg} ${horizonY - 760}px, #101312 ${horizonY - 380}px, #1A1F1D ${horizonY - 60}px, #222826 ${horizonY}px, #181C1A ${horizonY + 6}px, #111312 ${horizonY + 260}px, ${MRD.bg} ${horizonY + 640}px)`,
        }}
      />
      {streaks.map((s, i) => (
        <div
          key={`st${i}`}
          style={{
            position: "absolute",
            left: s.sx - s.w / 2,
            top: -140,
            width: s.w,
            height: Math.max(0, horizonY + 140),
            backgroundImage: MRD_GRADIENT_STREAK,
            opacity: s.o * (0.75 + 0.2 * Math.sin((frame / 30) * 0.55 * Math.PI + i * 1.7)),
            filter: "blur(26px)",
          }}
        />
      ))}
      {/* perspective floor grid */}
      <svg width={1080} height={960} style={{ position: "absolute", inset: 0 }}>
        {gridLines.map((pts, i) => (
          <polyline key={i} points={pts} fill="none" stroke="rgba(255,255,255,0.065)" strokeWidth={1} />
        ))}
      </svg>
      {/* floor: Merydian world light around the Studio window + contact shadows */}
      {stage(
        <>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 4400,
              height: 3000,
              transformOrigin: "50% 50%",
              transform: `translate3d(${WIN.cx - 2200}px, ${-1.5 - 1500}px, ${WIN.z + 300}px) rotateX(90deg)`,
              background: `radial-gradient(closest-side, rgba(0,255,171,${(0.16 * glow).toFixed(3)}) 0%, rgba(0,255,171,${(0.06 * glow).toFixed(3)}) 45%, rgba(0,255,171,0) 100%)`,
              backfaceVisibility: "hidden",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 5200,
              height: 4200,
              transformOrigin: "50% 50%",
              transform: `translate3d(${-200 - 2600}px, ${-2 - 2100}px, ${200}px) rotateX(90deg)`,
              background: `radial-gradient(closest-side, rgba(0,255,171,0.055) 0%, rgba(0,255,171,0.02) 55%, rgba(0,255,171,0) 100%)`,
              backfaceVisibility: "hidden",
            }}
          />
          {floor}
        </>,
      )}
      {/* horizon haze (behind the objects) */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(30,37,34,0) ${horizonY - 170}px, rgba(33,41,37,0.75) ${horizonY - 20}px, rgba(36,44,40,0.95) ${horizonY + 8}px, rgba(30,37,34,0.6) ${horizonY + 90}px, rgba(30,37,34,0) ${horizonY + 280}px)`,
        }}
      />
      {/* objects */}
      {stage(nodes.map((n) => n.el))}
      {/* vignette */}
      <AbsoluteFill style={{ opacity: interpolate(frame, [92, 110], [1, 0], clamp), background: "radial-gradient(125% 100% at 50% 52%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.12) 70%, rgba(0,0,0,0.42) 100%)" }} />
      {/* click ripple + plain arrow cursor (on the window plane) */}
      {ripO > 0.001 ? (
        <div
          style={{
            position: "absolute",
            left: clickP.sx - 34 * clickP.s,
            top: clickP.sy - 34 * clickP.s,
            width: 68 * clickP.s,
            height: 68 * clickP.s,
            borderRadius: "50%",
            border: `${2.2 * clickP.s}px solid ${S.brand}`,
            backgroundColor: S.brandSoft,
            opacity: ripO,
            transform: `scale(${ripS})`,
          }}
        />
      ) : null}
      {curVis > 0.001 ? (
        <svg
          width={26 * curScale}
          height={31 * curScale}
          viewBox="0 0 24 28"
          style={{
            position: "absolute",
            left: cp.sx - 3 * curScale,
            top: cp.sy - 2 * curScale,
            opacity: curVis,
            transform: `scale(${1 - 0.14 * press})`,
            transformOrigin: `${3 * curScale}px ${2 * curScale}px`,
            filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.35))",
          }}
        >
          <path d="M3 2.2 3 20.4l4.6-4.4 3.1 7.1 3.6-1.6-3.1-7 6.2-.4z" fill="#111" stroke="#FFFFFF" strokeWidth={1.7} strokeLinejoin="round" />
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};

const MRD_GRADIENT_STREAK = "linear-gradient(180deg, rgba(0,255,171,0.16) 0%, rgba(0,255,171,0.04) 60%, rgba(0,255,171,0.00) 100%)";

// SFX (same files + levels as F8P01Crowd): fly-by peak on the fastest push (~f92).
const WHOOSH_PEAK_IN_FILE = 55;
const WHOOSH_PEAK_AT = 153; // real frame of the fastest part of the push-in (scene frame 90)
const DEEP_AT = 141;

const Warped: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Freeze frame={mono(f, WARP_REAL, WARP_SCENE)}>
      <Scene />
    </Freeze>
  );
};

export const MbP1AgencyGotSoBusy: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: MRD.bg }}>
    <Sequence from={WHOOSH_PEAK_AT - WHOOSH_PEAK_IN_FILE} durationInFrames={REAL_DUR - (WHOOSH_PEAK_AT - WHOOSH_PEAK_IN_FILE)}>
      <Audio
        src={staticFile("fish8/sfx/whoosh-lowpassed.wav")}
        volume={(f) => interpolate(f, [0, 6, REAL_DUR - (WHOOSH_PEAK_AT - WHOOSH_PEAK_IN_FILE) - 14, REAL_DUR - (WHOOSH_PEAK_AT - WHOOSH_PEAK_IN_FILE)], [0.38, 0.57, 0.57, 0], clamp)}
      />
    </Sequence>
    <Sequence from={DEEP_AT} durationInFrames={REAL_DUR - DEEP_AT}>
      <Audio src={staticFile("fish8/sfx/whoosh-deep.wav")} volume={(f) => interpolate(f, [0, REAL_DUR - DEEP_AT - 12, REAL_DUR - DEEP_AT], [0.35, 0.28, 0], clamp)} />
    </Sequence>
    <CameraMotionBlur shutterAngle={180} samples={5}>
      <Warped />
    </CameraMotionBlur>
  </AbsoluteFill>
);
