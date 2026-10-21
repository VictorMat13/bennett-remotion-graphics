import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { EASE, MONO, MRD, MRD_GRID, OS_EASE, PARTS, PLAN_DATA, PLANS, TASKS, USAGE, sec } from "./theme";
import { ConductorEmblem, MoveBlur, PlanCard, TaskCard, meterSweep } from "./ui";

// ===========================================================================
// BcP01RunAstraSideBySide: 1080x960 (9:8) @ 30fps. HOOK of the bconductor reel.
// VO (never on screen): "I run Astra and Fable side by side with just my
// subscription."
//
// ONE real 3D world (manus2 BRIEF-v2-3D recipe): Merydian perspective floor
// (grid brighter near the plans, fading to the haze horizon, green world light
// on the floor only), keyed look-at camera, depth of field by distance,
// parallax layers, real contact shadows, ui.tsx MoveBlur (8 samples, camera
// move windows only).
//   Two FounderOS PlanCards (captured 393px size + PLAN_DATA) stand side by
//   side just above the floor as solid slabs (14 units thick, so the edge reads
//   when the camera arcs round): LEFT Codex (ChatGPT Pro), RIGHT Claude (Claude
//   Max 20x), each with its official mark on a plate at its top-left corner.
//   A ConductorEmblem disc hovers low over the floor in front of each card,
//   over its own contact shadow, clear of the card face. Each disc is OFF (dim
//   core, no sweep) until its word, then ignites (thinking 0 -> 1 over 8f: the
//   real sweep + halo + breathe). Seeded task cards glide along two floor
//   lanes outside the discs toward the plans and dissolve there; a dim field
//   of tasks recedes into the haze.
//   0-10    low + tight behind a left-lane task card (big, out of focus), moving
//   10      "Astra": left conductor ignites, centred
//   10-34   one long sweep right, rising; "Fable" (f28) right conductor ignites
//   34-56   "side by side": crane up + arc round to a three-quarter view, yaw
//           ~30 deg: the slabs' edges, the floor perspective and the parallax
//           between the two plans read
//   56-64   brief hold on the three-quarter
//   64-89   arc back to the front + push in on "subscription" (f89)
//   89-134  near-frontal two-shot (yaw ~3 deg, tilt ~13 deg, floor visible),
//           tiny drift; near-still from f100
// Peak camera speed 40 px/frame at the frame corners (focus plane + floor).
// No text other than the real UI on the planes.
// ===========================================================================

export const BCP01_DURATION = 135;
const DUR = BCP01_DURATION;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ENTER = Easing.bezier(...EASE.enter);
const LENS = Easing.bezier(...OS_EASE.lens);

const WD = PARTS.P01.words;
const F_ASTRA = sec(WD.Astra); // 10
const F_FABLE = sec(WD.Fable); // 28
const IGNITE = 8; // frames for thinking 0 -> 1

const rand = (i: number, s = 0) => {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ------------------------------------------------------------- 3D camera
const CX = 540;
const CY = 480;
const P = 900; // focal length in px (CSS perspective)

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

// ------------------------------------------------------------- the world
// x right, y DOWN (floor at y = 0, up is negative), z toward the camera.
const CARD = { w: 393, h: 307, gap: 40, lift: 32, toe: 0.1, layers: 7, step: 2 } as const; // captured card size (01a/01b); 14-unit slab
const CARD_X = CARD.w / 2 + CARD.gap / 2; // plan centres at x = -/+ CARD_X
// Official-mark plate pinned at each card's top-left corner, a little in front of the card.
const PLATE = { s: 124, overlap: 20, inset: 10, z: 28, radius: 26, layers: 3, step: 2 } as const;
// Conductor disc: low over the floor in front of the card (never over the card face).
// The real 62px emblem, scaled up as one plane so the ring/comet keep the captured proportions.
const EMB = { size: 110, bottom: 10, z: 260, css: 62, layers: 4, step: 2.5 } as const;
const TASK = { w: 260, h: 86, lift: 6 } as const;
// local (card-space) offset -> world, for things attached to a toed-in card
const onCard = (side: number, ry: number, lx: number, lz: number) => ({
  x: side * CARD_X + lx * Math.cos(ry) + lz * Math.sin(ry),
  z: -lx * Math.sin(ry) + lz * Math.cos(ry),
});
const SIDES = [-1, 1] as const; // -1 = Codex (left), 1 = Claude (right)

// Camera keys: position + look-at target (focus plane follows the target).
const KF = [0, 10, 22, 34, 46, 56, 64, 76, 89, 104, 118, 134];
const CAM: V3[] = [
  { x: -380, y: -150, z: 900 }, // low + tight behind a left-lane task card, already moving
  { x: -300, y: -185, z: 850 }, // "Astra": the left plan + its conductor centred
  { x: -140, y: -220, z: 850 }, // sweeping right, rising
  { x: 110, y: -290, z: 882 }, // "Fable" ignited: favouring the right plan
  { x: 390, y: -405, z: 912 }, // "side by side": crane up + arc
  { x: 536, y: -452, z: 915 }, // three-quarter, yaw ~30 deg
  { x: 542, y: -455, z: 912 }, // short hold
  { x: 330, y: -418, z: 872 }, // arc back toward the front
  { x: 64, y: -367, z: 792 }, // "subscription": near-frontal two-shot, floor in view
  { x: 54, y: -364, z: 785 }, // settle
  { x: 48, y: -361, z: 781 },
  { x: 43, y: -358, z: 777 }, // end drift
];
const TGT: V3[] = [
  { x: -250, y: -185, z: 90 },
  { x: -215, y: -190, z: 90 },
  { x: -90, y: -190, z: 85 },
  { x: 40, y: -190, z: 80 },
  { x: 58, y: -188, z: 70 },
  { x: 58, y: -188, z: 70 },
  { x: 57, y: -188, z: 70 },
  { x: 36, y: -189, z: 65 },
  { x: 16, y: -196, z: 60 },
  { x: 14, y: -196, z: 60 },
  { x: 13, y: -196, z: 60 },
  { x: 12, y: -196, z: 60 },
];
// Camera move windows for MoveBlur (corner speed > ~3 px/frame); the
// three-quarter hold and the end hold render plain.
const MOVES: [number, number][] = [
  [0, 56],
  [63, 91],
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
  const th = Math.atan2(fx, -fz);
  const ph = Math.atan2(-fy, Math.hypot(fx, fz));
  return { C, T, th, ph, ct: Math.cos(th), st: Math.sin(th), cp: Math.cos(ph), sp: Math.sin(ph), focus: Math.hypot(fx, fy, fz) };
};
// Same math as the CSS chain translateZ(P) rotateX(ph) rotateY(th) translate3d(-C).
const project = (cam: Cam, p: V3) => {
  const x = p.x - cam.C.x;
  const y = p.y - cam.C.y;
  const z = p.z - cam.C.z;
  const x1 = cam.ct * x + cam.st * z;
  const z1 = -cam.st * x + cam.ct * z;
  const y2 = cam.cp * y - cam.sp * z1;
  const d = -(cam.sp * y + cam.cp * z1);
  const s = P / d;
  return { d, s, sx: CX + x1 * s, sy: CY + y2 * s };
};
// Depth of field (screen px of blur) and distance fog.
const blurOf = (cam: Cam, d: number) => {
  const inv = 1 / d - 1 / cam.focus; // > 0 in front of the focus plane, < 0 behind it
  const b = inv > 0 ? Math.min(18, 6400 * inv) : Math.min(10, 12000 * -inv);
  return b < 1.5 ? 0 : b;
};
// Heroes (plans + conductors) are the subject: a much shallower falloff keeps them sharp.
const heroBlurOf = (cam: Cam, d: number) => {
  const b = blurOf(cam, d) * 0.35;
  return b < 1.5 ? 0 : b;
};
const brightOf = (cam: Cam, d: number) => 1 - 0.6 * interpolate(d - cam.focus, [250, 3400], [0, 1], clamp);
const farFade = (d: number) => interpolate(d, [3800, 5600], [1, 0], clamp);

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
  const visible = minD > 30 && x1 > -200 && x0 < 1280 && y1 > -200 && y0 < 1160;
  return { visible, d: mid.d, s: mid.s };
};

// An upright plane standing at (x, z) with its bottom edge at height y.
const Plane: React.FC<{
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  ry?: number;
  /** blur in SCREEN px (converted to the plane's local px with `s`) */
  blur?: number;
  s?: number;
  bright?: number;
  opacity?: number;
  children: React.ReactNode;
}> = ({ x, y, z, w, h, ry = 0, blur = 0, s = 1, bright = 1, opacity = 1, children }) => {
  // local blur, quantized to 0.5px and capped so near-lens planes stay cheap
  const bq = Math.min(14, Math.round((blur / Math.max(0.2, s)) * 2) / 2);
  const f = [bq >= 0.5 ? `blur(${bq}px)` : "", bright < 0.995 ? `brightness(${bright.toFixed(3)})` : ""].join(" ").trim();
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: w,
        height: h,
        transformOrigin: "50% 100%",
        transform: `translate3d(${x - w / 2}px, ${y - h}px, ${z}px) rotateY(${ry}rad)`,
        backfaceVisibility: "hidden",
        filter: f || undefined,
        opacity,
      }}
    >
      {children}
    </div>
  );
};

// Slab body: one layer of a solid object's thickness, stacked behind its face.
// Lit edge near the face, darker toward the back.
const slabTone = (i: number, n: number) => {
  const v = Math.round(40 - (i / n) * 18); // #282828 -> #161616
  return `rgb(${v},${v},${v + 1})`;
};
const SlabLayer: React.FC<{ radius: number | string; i: number; n: number }> = ({ radius, i, n }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      borderRadius: radius,
      background: slabTone(i, n),
      boxShadow: `inset 0 0 0 1px ${i === 1 ? "#3a3a3a" : "#2a2a2a"}`,
    }}
  />
);

// --------------------------------------------------------------- objects
// The plan card face.
const PlanFace: React.FC<{ kind: "codex" | "claude"; frame: number }> = ({ kind, frame }) => {
  const codex = kind === "codex";
  const plan = PLANS[kind];
  const data = codex ? PLAN_DATA.codexA : PLAN_DATA.claudeA;
  const sweep0 = codex ? 5 : 24; // entrance sweep: left during the "Astra" beat, right as "Fable" lands
  // live: session meter creeping into the captured State A value, last-hour burn ticking up to the capture.
  // Counters step on whole frames (as a screen recording shows them), so the
  // MoveBlur sub-samples never smear two different digits over each other.
  const fi = Math.floor(frame);
  const sessionPct = interpolate(fi, [0, DUR], codex ? [58.6, USAGE.codexSessionA] : [19.1, USAGE.claudeSessionA], clamp);
  const hour = interpolate(fi, [0, DUR], [data.burns[0] - (codex ? 8_000 : 10_000), data.burns[0]], clamp);
  return (
    <PlanCard
      title={plan.title}
      plan={plan.plan}
      sessionPct={sessionPct}
      weeklyPct={codex ? USAGE.codexWeeklyA : USAGE.claudeWeeklyA}
      sessionReset={codex ? USAGE.codexSessionReset : USAGE.claudeSessionReset}
      weeklyReset={codex ? USAGE.codexWeeklyReset : USAGE.claudeWeeklyReset}
      burns={[hour, data.burns[1], data.burns[2], data.burns[3]]}
      pctOfWeek={data.pctOfWeek}
      lanes={data.lanes}
      machines={data.machines}
      lastActivity={data.lastActivity}
      sessionSweep={meterSweep(frame, sweep0)}
      weeklySweep={meterSweep(frame, sweep0 + 3)}
      width={CARD.w}
      style={{ height: CARD.h }}
    />
  );
};

// The official mark on a plate (real assets: openai-white.svg, claude-logo.png).
const MarkPlate: React.FC<{ kind: "codex" | "claude" }> = ({ kind }) => {
  const codex = kind === "codex";
  const mark = codex ? 66 : 72;
  return (
    <div
      style={{
        width: PLATE.s,
        height: PLATE.s,
        boxSizing: "border-box",
        borderRadius: PLATE.radius,
        border: `1px solid ${MONO.border}`,
        background: MONO.surface2,
        display: "grid",
        placeItems: "center",
      }}
    >
      <Img src={staticFile(codex ? PLANS.codex.logoWhite : PLANS.claude.logo)} style={{ width: mark, height: mark, objectFit: "contain" }} />
    </div>
  );
};

// Task lanes: cards fade in out of the lens, glide in depth along a floor lane
// outside each conductor disc (the product's lens ease: quick off the lens,
// settling as they reach the plan) and dissolve beside the plan.
const LANE_TASKS = [...TASKS.todo, ...TASKS.doing];
const LANE = { off: 175, z0: 900, z1: 110, dur: 150, every: 18, fade: [0.42, 0.6] } as const;
const LANE_PHASE = [17, 8]; // left lane: one card ~330 in front of the lens at f0 (lower left, out of focus)
type Flyer = { key: string; side: number; t0: number; jx: number; ry: number; task: (typeof LANE_TASKS)[number] };
const FLYERS: Flyer[] = (() => {
  const out: Flyer[] = [];
  SIDES.forEach((side, si) => {
    for (let k = 0; ; k++) {
      const t0 = LANE_PHASE[si] - LANE.dur + k * LANE.every;
      if (t0 > DUR) break;
      const n = k * 2 + si;
      out.push({
        key: `f${si}-${k}`,
        side,
        t0,
        jx: (rand(n, 1) - 0.5) * 50,
        ry: (rand(n, 2) - 0.5) * 0.2,
        task: LANE_TASKS[(k * 3 + si * 2) % LANE_TASKS.length],
      });
    }
  });
  return out;
})();

// Far field: the backlog standing in rows, receding into the haze.
type Far = { x: number; z: number; ry: number; seed: number; task: (typeof LANE_TASKS)[number] };
const FAR: Far[] = (() => {
  const out: Far[] = [];
  let n = 0;
  for (let r = 0; r < 3; r++) {
    const z0 = -1250 - r * 700;
    for (let c = 0; c < 9; c++) {
      n++;
      const x = -2560 + c * 640 + (r % 2) * 320 + (rand(n, 4) - 0.5) * 200;
      const z = z0 + (rand(n, 5) - 0.5) * 200;
      out.push({ x, z, ry: (rand(n, 6) - 0.5) * 0.5, seed: n, task: LANE_TASKS[n % LANE_TASKS.length] });
    }
  }
  return out;
})();

// Floor grid: MRD_GRID hairlines, brighter on the lit floor around the plans,
// back to the plain MRD_GRID alpha toward the haze.
const GRID = { step: 160, centreZ: 130, r: 700, boost: 3.6 } as const;
const GRID_BASE = parseFloat(MRD_GRID.color.split(",")[3]); // rgba(255,255,255,0.035) -> 0.035
const gridAlpha = (x: number, z: number) => {
  const r = Math.hypot(x, z - GRID.centreZ) / GRID.r;
  return GRID_BASE * (1 + GRID.boost * Math.exp(-r * r));
};

// ================================================================= scene
const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = camAt(frame);

  // conductors: OFF (dim core, no sweep) until their word, then ignite over IGNITE frames
  const think = [
    interpolate(frame, [F_ASTRA, F_ASTRA + IGNITE], [0, 1], { ...clamp, easing: ENTER }),
    interpolate(frame, [F_FABLE, F_FABLE + IGNITE], [0, 1], { ...clamp, easing: ENTER }),
  ];
  const shadeOf = (t: number) => {
    const v = Math.round(70 + (242 - 70) * t);
    return `rgb(${v},${v},${v})`;
  };

  // ---------- horizon + floor grid ----------
  const dirH = { x: cam.T.x - cam.C.x, z: cam.T.z - cam.C.z };
  const dl = Math.hypot(dirH.x, dirH.z);
  const horizonY = project(cam, { x: cam.C.x + (dirH.x / dl) * 1e6, y: 0, z: cam.C.z + (dirH.z / dl) * 1e6 }).sy;

  const buckets = new Map<number, string[]>();
  const pushLine = (pts: V3[]) => {
    let prev: { sx: number; sy: number; d: number } | null = null;
    let prevW: V3 | null = null;
    for (const p of pts) {
      const q = project(cam, p);
      if (prev && prevW && q.d > 30 && prev.d > 30) {
        const a = Math.round(gridAlpha((p.x + prevW.x) / 2, (p.z + prevW.z) / 2) * 200) / 200;
        if (a >= 0.02) {
          const list = buckets.get(a) ?? [];
          list.push(`M${prev.sx.toFixed(1)} ${prev.sy.toFixed(1)}L${q.sx.toFixed(1)} ${q.sy.toFixed(1)}`);
          buckets.set(a, list);
        }
      }
      prev = q;
      prevW = p;
    }
  };
  const G = GRID.step;
  for (let i = -30; i <= 30; i++) pushLine(Array.from({ length: 56 }).map((_, k) => ({ x: i * G, y: 0, z: 2400 - k * 150 })));
  for (let k = 0; k < 54; k++) pushLine(Array.from({ length: 56 }).map((_, i) => ({ x: -5200 + i * 190, y: 0, z: 2400 - k * G })));

  // ---------- objects ----------
  type Node = { d: number; el: React.ReactNode };
  const nodes: Node[] = [];
  const floor: React.ReactNode[] = [];

  // contact shadow on the floor (above the light pools)
  const shadow = (key: string, x: number, z: number, w: number, depth: number, ry: number, a: number) => {
    if (a < 0.01 || project(cam, { x, y: 0, z }).d < 60) return;
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
          transform: `translate3d(${x - w / 2}px, ${-1.5 - depth / 2}px, ${z}px) rotateY(${ry}rad) rotateX(90deg)`,
          background: `radial-gradient(closest-side, rgba(0,0,0,${(0.82 * a).toFixed(3)}) 0%, rgba(0,0,0,${(0.5 * a).toFixed(3)}) 50%, rgba(0,0,0,0) 100%)`,
          backfaceVisibility: "hidden",
        }}
      />,
    );
  };

  // far field
  for (const f of FAR) {
    const bob = 3 * Math.sin(frame / 26 + f.seed);
    const y = -TASK.lift + bob;
    const v = planeView(cam, f.x, y, f.z, TASK.w, TASK.h, f.ry);
    if (!v.visible) continue;
    const op = farFade(v.d) * (1 - 0.7 * interpolate(v.d - cam.focus, [300, 3000], [0, 1], clamp));
    if (op < 0.02) continue;
    shadow(`fsh${f.seed}`, f.x, f.z + 6, TASK.w * 1.15, 60, f.ry, 0.7 * op);
    nodes.push({
      d: v.d,
      el: (
        <Plane key={`far${f.seed}`} x={f.x} y={y} z={f.z} w={TASK.w} h={TASK.h} ry={f.ry} blur={blurOf(cam, v.d)} s={v.s} opacity={op}>
          <TaskCard title={f.task.title} owner={f.task.owner} width={TASK.w} />
        </Plane>
      ),
    });
  }

  // lane flyers
  for (const fl of FLYERS) {
    const u = (frame - fl.t0) / LANE.dur;
    if (u <= 0 || u >= 1) continue;
    const z = LANE.z0 + (LANE.z1 - LANE.z0) * LENS(u);
    const x = fl.side * (CARD_X + LANE.off) + fl.jx;
    const y = -TASK.lift;
    const v = planeView(cam, x, y, z, TASK.w, TASK.h, fl.ry);
    // fades in off the lens (never crosses it), dissolves while still gliding
    // (before the ease's slow tail, so cards never pile up beside the discs)
    const op = interpolate(v.d, [170, 330], [0, 1], clamp) * interpolate(u, [...LANE.fade], [1, 0], clamp);
    if (op < 0.01) continue;
    shadow(`sh${fl.key}`, x, z + 6, TASK.w * 1.12, 56, fl.ry, op);
    if (!v.visible) continue;
    nodes.push({
      d: v.d,
      el: (
        <Plane key={fl.key} x={x} y={y} z={z} w={TASK.w} h={TASK.h} ry={fl.ry} blur={blurOf(cam, v.d)} s={v.s} bright={brightOf(cam, v.d)} opacity={op}>
          <TaskCard title={fl.task.title} owner={fl.task.owner} width={TASK.w} />
        </Plane>
      ),
    });
  }

  // the two plans (solid slabs) + their mark plates + their conductors
  SIDES.forEach((side, si) => {
    const kind = side < 0 ? "codex" : "claude";
    const ry = -side * CARD.toe; // toed in: each plan faces the middle
    {
      const y = -CARD.lift;
      const v = planeView(cam, side * CARD_X, y, 0, CARD.w, CARD.h, ry);
      // contact shadow: a tight core under the bottom edge + a soft spread
      shadow(`pshA${si}`, side * CARD_X, 4, CARD.w * 1.05, 76, ry, 0.95);
      shadow(`pshB${si}`, side * CARD_X, 30, CARD.w * 1.4, 300, ry, 0.55);
      if (v.visible) {
        const blur = heroBlurOf(cam, v.d);
        const bright = brightOf(cam, v.d);
        for (let i = CARD.layers; i >= 1; i--) {
          const p = onCard(side, ry, 0, -i * CARD.step);
          nodes.push({
            d: v.d + i * CARD.step,
            el: (
              <Plane key={`slab${si}-${i}`} x={p.x} y={y} z={p.z} w={CARD.w} h={CARD.h} ry={ry} blur={blur} s={v.s} bright={bright}>
                <SlabLayer radius={12} i={i} n={CARD.layers} />
              </Plane>
            ),
          });
        }
        nodes.push({
          d: v.d,
          el: (
            <Plane key={`plan${si}`} x={side * CARD_X} y={y} z={0} w={CARD.w} h={CARD.h} ry={ry} blur={blur} s={v.s} bright={bright}>
              <PlanFace kind={kind} frame={frame} />
            </Plane>
          ),
        });
      }
    }
    {
      const y = -CARD.lift - CARD.h + PLATE.overlap;
      const lx = -CARD.w / 2 + PLATE.s / 2 + PLATE.inset;
      const p0 = onCard(side, ry, lx, PLATE.z);
      const v = planeView(cam, p0.x, y, p0.z, PLATE.s, PLATE.s, ry);
      if (v.visible) {
        const blur = heroBlurOf(cam, v.d);
        const bright = brightOf(cam, v.d);
        for (let i = PLATE.layers; i >= 1; i--) {
          const p = onCard(side, ry, lx, PLATE.z - i * PLATE.step);
          nodes.push({
            d: v.d - 1 + i * PLATE.step,
            el: (
              <Plane key={`pslab${si}-${i}`} x={p.x} y={y} z={p.z} w={PLATE.s} h={PLATE.s} ry={ry} blur={blur} s={v.s} bright={bright}>
                <SlabLayer radius={PLATE.radius} i={i} n={PLATE.layers} />
              </Plane>
            ),
          });
        }
        nodes.push({
          d: v.d - 1,
          el: (
            <Plane key={`plate${si}`} x={p0.x} y={y} z={p0.z} w={PLATE.s} h={PLATE.s} ry={ry} blur={blur} s={v.s} bright={bright}>
              <MarkPlate kind={kind} />
            </Plane>
          ),
        });
      }
    }
    {
      const p0 = onCard(side, ry, 0, EMB.z);
      const bob = 2.5 * Math.sin(frame / 20 + si * 1.9);
      const y = -EMB.bottom + bob;
      const v = planeView(cam, p0.x, y, p0.z, EMB.size, EMB.size, ry);
      // contact shadow right under the hovering disc
      shadow(`eshA${si}`, p0.x, p0.z, EMB.size * 1.2, 64, ry, 0.95);
      shadow(`eshB${si}`, p0.x, p0.z + 6, EMB.size * 2.1, 170, ry, 0.45);
      if (v.visible) {
        const blur = heroBlurOf(cam, v.d);
        const bright = brightOf(cam, v.d);
        for (let i = EMB.layers; i >= 1; i--) {
          const p = onCard(side, ry, 0, EMB.z - i * EMB.step);
          nodes.push({
            d: v.d + i * EMB.step,
            el: (
              <Plane key={`eslab${si}-${i}`} x={p.x} y={y} z={p.z} w={EMB.size} h={EMB.size} ry={ry} blur={blur} s={v.s} bright={bright}>
                <SlabLayer radius="50%" i={i} n={EMB.layers} />
              </Plane>
            ),
          });
        }
        nodes.push({
          d: v.d,
          el: (
            <Plane key={`emb${si}`} x={p0.x} y={y} z={p0.z} w={EMB.size} h={EMB.size} ry={ry} blur={blur} s={v.s} bright={bright}>
              <div style={{ position: "absolute", left: 0, top: 0, transform: `scale(${EMB.size / EMB.css})`, transformOrigin: "0 0" }}>
                <ConductorEmblem size={EMB.css} frame={frame + si * 17} thinking={think[si]} shade={shadeOf(think[si])} />
              </div>
            </Plane>
          ),
        });
      }
    }
  });
  nodes.sort((a, b) => b.d - a.d);

  const worldTf = `translateZ(${P}px) rotateX(${cam.ph}rad) rotateY(${cam.th}rad) translate3d(${-cam.C.x}px, ${-cam.C.y}px, ${-cam.C.z}px)`;
  const stage = (children: React.ReactNode) => (
    <div style={{ position: "absolute", inset: 0, perspective: `${P}px`, perspectiveOrigin: `${CX}px ${CY}px` }}>
      <div style={{ position: "absolute", left: CX, top: CY, width: 0, height: 0, transformStyle: "preserve-3d", transformOrigin: "0 0", transform: worldTf }}>{children}</div>
    </div>
  );
  const floorPool = (key: string, x: number, z: number, w: number, h: number, a: number) => (
    <div
      key={key}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: w,
        height: h,
        transformOrigin: "50% 50%",
        transform: `translate3d(${x - w / 2}px, ${-0.5 - h / 2}px, ${z}px) rotateX(90deg)`,
        background: `radial-gradient(closest-side, rgba(0,255,171,${a.toFixed(3)}) 0%, rgba(0,255,171,${(a * 0.4).toFixed(3)}) 45%, rgba(0,255,171,0) 100%)`,
        backfaceVisibility: "hidden",
      }}
    />
  );
  const breathe = 0.88 + 0.12 * Math.sin((frame / 30) * 1.1 * Math.PI);

  return (
    <AbsoluteFill style={{ backgroundColor: MRD.bg }}>
      {/* sky above the horizon */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${MRD.bg} ${horizonY - 760}px, #0F1211 ${horizonY - 380}px, #181D1B ${horizonY - 60}px, #202624 ${horizonY}px, #161A18 ${horizonY + 6}px, #101211 ${horizonY + 260}px, ${MRD.bg} ${horizonY + 640}px)`,
        }}
      />
      {/* perspective floor grid (MRD_GRID hairlines, brighter around the plans) */}
      <svg width={1080} height={960} style={{ position: "absolute", inset: 0 }}>
        {[...buckets.entries()].map(([a, segs]) => (
          <path key={a} d={segs.join("")} fill="none" stroke={`rgba(255,255,255,${a})`} strokeWidth={1} />
        ))}
      </svg>
      {/* floor: Merydian world light, then contact shadows on top of it */}
      {stage(
        <>
          {/* world light on the floor around the plans (kept to a medium plane: a
              huge plane overflows the MoveBlur sample layers and blanks the frame) */}
          {floorPool("wide", 0, -60, 2600, 2000, 0.05 * breathe)}
          {SIDES.map((side, si) => floorPool(`pool${si}`, side * CARD_X, 170, 1000, 900, 0.1 * breathe))}
          {/* each conductor lights the floor around it once it ignites */}
          {SIDES.map((side, si) => {
            const p = onCard(side, -side * CARD.toe, 0, EMB.z);
            return floorPool(`lit${si}`, p.x, p.z, 560, 420, 0.13 * think[si] * breathe);
          })}
          {floor}
        </>,
      )}
      {/* horizon haze (behind the objects) */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(30,37,34,0) ${horizonY - 170}px, rgba(33,41,37,0.72) ${horizonY - 20}px, rgba(36,44,40,0.92) ${horizonY + 8}px, rgba(30,37,34,0.55) ${horizonY + 90}px, rgba(30,37,34,0) ${horizonY + 280}px)`,
        }}
      />
      {/* objects */}
      {stage(nodes.map((n) => n.el))}
      {/* vignette */}
      <AbsoluteFill style={{ background: "radial-gradient(125% 100% at 50% 50%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.14) 72%, rgba(0,0,0,0.42) 100%)" }} />
    </AbsoluteFill>
  );
};

export const BcP01RunAstraSideBySide: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: MRD.bg }}>
    <MoveBlur moves={MOVES} samples={8}>
      <Scene />
    </MoveBlur>
  </AbsoluteFill>
);
