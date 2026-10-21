import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { EASE, FONT_MONO, MONO, MRD, OS_EASE, TASKS } from "./theme";
import { KANBAN_LANES, KanbanLaneHeader, MoveBlur, OS_PAGE, OsChrome, TaskCard } from "./ui";

// ===========================================================================
// BcP10TasksKeepMoving: 1080x960 (9:8) @ 30fps, wrapped in the Holo safe frame
// by Root. VO (never on screen): "And all of my tasks just keep moving
// automatically." Word frames: tasks 20, keep moving 41, automatically 53,
// end 69.
//
// A screen recording of the real FounderOS Tasks page, "Local kanban" panel,
// exactly as captured in reference/08-tasks-kanban.png (page coordinates are
// that capture's CSS px: 1600x1000 viewport, panel at x 285 y 286). No cursor:
// the agents advance their own cards. Three moves run as a relay, left to
// right, so the camera drifts right with the flow the whole time:
//
//    0..31   Triage overnight inbound (To do, Comms Agent) lifts and slides into
//            In progress; the In progress cards open a slot at the top
//            (To do 5 -> 4, In progress 4 -> 5). Camera already drifting right.
//   18..56   "tasks" / "keep moving": Counter the inbound sponsor (In progress,
//            Brand Deal Agent) lifts and arcs up to the top of In review; the
//            camera travels right (and tilts up) with it (In progress 5 -> 4,
//            In review 2 -> 3).
//   46..77   "automatically": Draft the next newsletter issue (In review,
//            Newsletter Agent) lifts and rides to the top of Done with the
//            camera; its title strikes through and dims as it lands, the ▸
//            advance pill fades out (In review 3 -> 2, Done 4 -> 5).
//   77..96   near-still hold on In review + Done, slow drift + push.
//
// Lane order follows the product: TaskKanban filters one array per lane, the
// move keeps array order (tasks.ts moveTask) and the backend reads
// ORDER BY created_at DESC, so each moved card lands at the TOP of its new lane
// (it sits above the others in the seeded order). Grid lanes stretch to the
// tallest lane, so the lane boxes shorten as In progress drops back to 4.
// ===========================================================================

export const BCP10_DURATION = 96;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const TRAVEL = Easing.bezier(...EASE.travel);
const ENTER = Easing.bezier(...EASE.enter);
const DECEL = Easing.bezier(...EASE.decel);
const HOUSE = Easing.bezier(...OS_EASE.ease);
const ramp = (f: number, a: number, b: number, ease: (t: number) => number) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing: ease });

// ---------------------------------------------------------------- geometry
// Measured on reference/08-tasks-kanban.png (css px = png px / 2).
const SLAB = { x: 256, w: 1321, pad: 28 } as const; // bn-slab, radius 28
const PANEL = { x: 285, y: 286, w: 1262 } as const; // SlabCard "Local kanban"
const COL_Y = 352; // lane boxes (grid, gap 16, 291 wide)
const COL_W = 291;
type Lane = "todo" | "doing" | "review" | "done";
const COL_X: Record<Lane, number> = { todo: 310, doing: 617, review: 924, done: 1231 };
const LANE_ORDER: Lane[] = ["todo", "doing", "review", "done"];
const CARD_W = 265;
const CARD_DX = 13; // lane border 1 + p-3
const CARD_Y0 = 47.5; // lane top -> first card (p-3, header row, mb-1, gap-2.5)
const GAP = 10; // gap-2.5
const LANE_FOOT = 13; // p-3 + border under the last card
const LANE_MIN = 260; // min-h-[260px]

// Card height (border-box): border 2 + p-3 24 + title lines x 12.5px leading-snug
// + mt-2 8 + owner row (21 with the ▸ pill, 15 without it in Done).
const ONE_LINE = new Set<string>(["Draft the next newsletter issue", "Publish the Tuesday carousel"]);
const cardH = (title: string, pill: number) => 2 + 24 + (ONE_LINE.has(title) ? 1 : 2) * 17.1875 + 8 + 15 + 6 * pill;

// ------------------------------------------------------------------ tasks
type Task = { title: string; owner: string };
const TRIAGE = TASKS.todo[0];
const COUNTER = TASKS.doing[3];
const NEWSLETTER = TASKS.review[0];

// Every card each lane holds at some point, in the product's order.
const LANE_CARDS: Record<Lane, readonly Task[]> = {
  todo: TASKS.todo,
  doing: [TRIAGE, ...TASKS.doing],
  review: [COUNTER, ...TASKS.review],
  done: [NEWSLETTER, ...TASKS.done],
};

// lift: scale/shadow up; t0..t1: travel; settle: scale/shadow down;
// out: the gap it leaves closes; in: the slot it lands in opens (a touch ahead);
// arc: the rise leads the carry by this many frames (lift up, then over).
type Move = {
  task: Task;
  from: Lane;
  to: Lane;
  lift: number;
  t0: number;
  t1: number;
  settle: number;
  out: [number, number];
  in: [number, number];
  arc?: number;
};
const MOVES: Move[] = [
  { task: TRIAGE, from: "todo", to: "doing", lift: 2, t0: 4, t1: 26, settle: 24, out: [8, 30], in: [2, 24] },
  // Counter is the last card in its lane: its gap closing only shortens the lane box
  { task: COUNTER, from: "doing", to: "review", lift: 19, t0: 21, t1: 51, settle: 49, out: [36, 66], in: [20, 46], arc: 3 },
  { task: NEWSLETTER, from: "review", to: "done", lift: 46, t0: 50, t1: 72, settle: 70, out: [53, 74], in: [48, 70] },
];
const moveOf = (t: Task) => MOVES.find((m) => m.task === t);

// The newsletter card becoming a Done card: strike draws, title dims to
// bn-dim, the ▸ pill fades and its row height collapses (21 -> 15).
const STRIKE: [number, number] = [64, 76];
const PILL_FADE: [number, number] = [62, 70];
const PILL_COLLAPSE: [number, number] = [64, 74];

// Lane counts: both lanes tick as the card crosses the gutter between them
// (mid-travel), a 6-frame crossfade of the number.
const COUNT_XF = 6;
const TICKS: Record<Lane, { f: number; to: number }[]> = {
  todo: [{ f: 13, to: 4 }],
  doing: [
    { f: 13, to: 5 },
    { f: 34, to: 4 },
  ],
  review: [
    { f: 34, to: 3 },
    { f: 59, to: 2 },
  ],
  done: [{ f: 59, to: 5 }],
};
const START_COUNT: Record<Lane, number> = { todo: 5, doing: 4, review: 2, done: 4 };

// ------------------------------------------------------------------ layout
const presence = (task: Task, lane: Lane, f: number) => {
  const m = moveOf(task);
  if (!m) return 1;
  if (m.from === lane) return 1 - ramp(f, m.out[0], m.out[1], TRAVEL);
  if (m.to === lane) return ramp(f, m.in[0], m.in[1], TRAVEL);
  return 1;
};
const pillOf = (task: Task, lane: Lane, f: number) =>
  task === NEWSLETTER ? 1 - ramp(f, PILL_COLLAPSE[0], PILL_COLLAPSE[1], HOUSE) : lane === "done" ? 0 : 1;

type Slot = { task: Task; y: number; h: number; p: number };
const laneLayout = (lane: Lane, f: number) => {
  let y = COL_Y + CARD_Y0;
  const slots: Slot[] = [];
  for (const task of LANE_CARDS[lane]) {
    const p = presence(task, lane, f);
    const h = cardH(task.title, pillOf(task, lane, f));
    slots.push({ task, y, h, p });
    y += p * (h + GAP);
  }
  // content height: header block + cards + p-3 + border (the last gap is not a gap)
  return { slots, height: Math.max(LANE_MIN, y - COL_Y - GAP + LANE_FOOT) };
};

// ------------------------------------------------------------------ camera
// cx/cy: page point at the frame centre; s: frame px per page css px.
type Cam = { cx: number; cy: number; s: number };
type Seg = { f0: number; f1: number; to: Cam };
const START: Cam = { cx: 562, cy: 598, s: 1.6 };
const SEGS: Seg[] = [
  // opens mid-move: drifting right across To do -> In progress, "Local kanban 15" in the top-left
  { f0: -10, f1: 14, to: { cx: 603, cy: 594, s: 1.62 } },
  { f0: 14, f1: 18, to: { cx: 605, cy: 593, s: 1.62 } },
  // travels right (and tilts up a touch) with Counter the inbound sponsor onto In progress | In review
  { f0: 18, f1: 46, to: { cx: 912, cy: 566, s: 1.645 } },
  { f0: 46, f1: 50, to: { cx: 915, cy: 565, s: 1.65 } },
  // rides with the newsletter card onto In review | Done
  { f0: 50, f1: 74, to: { cx: 1224, cy: 556, s: 1.7 } },
  // near-still hold
  { f0: 74, f1: BCP10_DURATION, to: { cx: 1226, cy: 553, s: 1.72 } },
];
const camAt = (f: number): Cam => {
  let from = START;
  for (const g of SEGS) {
    if (f <= g.f1) {
      const p = TRAVEL(Math.max(0, Math.min(1, (f - g.f0) / (g.f1 - g.f0))));
      return {
        cx: from.cx + (g.to.cx - from.cx) * p,
        cy: from.cy + (g.to.cy - from.cy) * p,
        s: Math.exp(Math.log(from.s) + (Math.log(g.to.s) - Math.log(from.s)) * p),
      };
    }
    from = g.to;
  }
  return from;
};

// MoveBlur windows: the camera moves and the card swoops (12 samples there,
// plain frames once everything has settled).
const BLUR_WINDOWS: [number, number][] = [
  [0, 14],
  [18, 46],
  [50, 74],
  ...MOVES.map((m) => [m.t0, m.t1] as [number, number]),
];

// ------------------------------------------------------------- page pieces
// Scoped overrides for the two composed states TaskCard / KanbanLaneHeader do
// not expose as props (the components themselves are used as-is):
//  .p10-landing: the card turning into a Done card (title colour, ▸ pill fade + collapse)
//  .p10-cnt-old / .p10-cnt-new: lane count crossfade (number only, pill bg drawn once)
const SCOPED_CSS = `
.p10-landing > div > div:first-child { color: var(--p10-title) !important; }
.p10-landing > div > div:last-child > span:last-child { opacity: var(--p10-pill); margin-top: var(--p10-pm); margin-bottom: var(--p10-pm); }
.p10-cnt-old > div > span:last-child { color: var(--p10-old) !important; }
.p10-cnt-new > div > span:first-child { visibility: hidden; }
.p10-cnt-new > div > span:last-child { background: transparent !important; }
`;
const cssVars = (v: Record<string, string>) => v as unknown as React.CSSProperties;

const LaneHead: React.FC<{ lane: Lane; f: number }> = ({ lane, f }) => {
  const meta = KANBAN_LANES[LANE_ORDER.indexOf(lane)];
  let count = START_COUNT[lane];
  let next: number | null = null;
  let a = 0;
  for (const t of TICKS[lane]) {
    if (f >= t.f + COUNT_XF) count = t.to;
    else if (f >= t.f) {
      next = t.to;
      a = ramp(f, t.f, t.f + COUNT_XF, HOUSE);
    }
  }
  return (
    <div
      style={{ position: "absolute", left: COL_X[lane] + CARD_DX, top: COL_Y + 13, width: CARD_W }}
    >
      <div
        className={next != null ? "p10-cnt-old" : undefined}
        style={next != null ? cssVars({ "--p10-old": `color-mix(in oklab, ${meta.tone} ${((1 - a) * 100).toFixed(1)}%, transparent)` }) : undefined}
      >
        <KanbanLaneHeader label={meta.label} tone={meta.tone} count={count} />
      </div>
      {next != null ? (
        <div className="p10-cnt-new" style={{ position: "absolute", left: 0, top: 0, width: CARD_W, opacity: a }}>
          <KanbanLaneHeader label={meta.label} tone={meta.tone} count={next} />
        </div>
      ) : null}
    </div>
  );
};

const Card: React.FC<{
  task: Task;
  x: number;
  y: number;
  h: number;
  done: boolean;
  lift?: number;
  z?: number;
  landing?: { strike: number; pill: number; collapse: number };
}> = ({ task, x, y, h, done, lift = 0, z, landing }) => (
  <div
    className={landing ? "p10-landing" : undefined}
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: CARD_W,
      zIndex: z,
      transform: lift > 0 ? `scale(${1 + 0.02 * lift})` : undefined,
      transformOrigin: "50% 50%",
      ...(landing
        ? cssVars({
            "--p10-title": `color-mix(in oklab, ${MONO.text3} ${(landing.strike * 100).toFixed(1)}%, ${MONO.text})`,
            "--p10-pill": landing.pill.toFixed(3),
            "--p10-pm": `${(-3 * landing.collapse).toFixed(3)}px`,
          })
        : {}),
    }}
  >
    <TaskCard
      title={task.title}
      owner={task.owner}
      done={done}
      strike={landing ? landing.strike : undefined}
      width={CARD_W}
      style={{
        height: h,
        // the product's --bn-shadow-lift
        boxShadow: lift > 0 ? `0 8px 22px rgba(0,0,0,${(0.6 * lift).toFixed(3)})` : undefined,
      }}
    />
  </div>
);

// ------------------------------------------------------------------ scene
const Scene: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camAt(f);
  const left = 540 - cam.cx * cam.s;
  const top = 480 - cam.cy * cam.s;

  const lanes = Object.fromEntries(LANE_ORDER.map((l) => [l, laneLayout(l, f)])) as Record<Lane, ReturnType<typeof laneLayout>>;
  const colH = Math.max(...LANE_ORDER.map((l) => lanes[l].height));
  const panelBottom = COL_Y + colH + 24 + 1;
  const slabBottom = panelBottom + SLAB.pad + 1;

  const slotOf = (lane: Lane, task: Task) => lanes[lane].slots.find((s) => s.task === task)!;

  // static cards: every card not travelling, in its own lane
  const statics: React.ReactNode[] = [];
  for (const lane of LANE_ORDER) {
    for (const s of lanes[lane].slots) {
      if (moveOf(s.task)) continue;
      statics.push(
        <Card key={`${lane}-${s.task.title}`} task={s.task} x={COL_X[lane] + CARD_DX} y={s.y} h={s.h} done={lane === "done"} />,
      );
    }
  }

  // travelling cards: from their slot in the old lane to their slot in the new
  // one (both slots keep reflowing, so the path lands exactly where the lane
  // has opened room), lifted on the way
  const movers = MOVES.map((m, i) => {
    const arc = m.arc ?? 0;
    const ex = ramp(f, m.t0 + arc, m.t1, TRAVEL);
    const ey = ramp(f, m.t0, m.t1 - arc, TRAVEL);
    const a = slotOf(m.from, m.task);
    const b = slotOf(m.to, m.task);
    const x = COL_X[m.from] + (COL_X[m.to] - COL_X[m.from]) * ex + CARD_DX;
    const y = a.y + (b.y - a.y) * ey;
    const h = a.h + (b.h - a.h) * ex;
    const lift = ramp(f, m.lift, m.lift + 6, ENTER) * (1 - ramp(f, m.settle, m.settle + 7, DECEL));
    const landing =
      m.task === NEWSLETTER
        ? {
            strike: ramp(f, STRIKE[0], STRIKE[1], HOUSE),
            pill: 1 - ramp(f, PILL_FADE[0], PILL_FADE[1], HOUSE),
            collapse: ramp(f, PILL_COLLAPSE[0], PILL_COLLAPSE[1], HOUSE),
          }
        : undefined;
    // the card in the air rides above everything, a waiting mover sits with the lane
    const z = f >= m.lift && f <= m.settle + 7 ? 20 + i : 1;
    return <Card key={m.task.title} task={m.task} x={x} y={y} h={h} done={false} lift={lift} z={z} landing={landing} />;
  });

  return (
    <AbsoluteFill style={{ backgroundColor: MONO.bg, overflow: "hidden" }}>
      <style>{SCOPED_CSS}</style>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: OS_PAGE.w,
          height: OS_PAGE.h,
          transform: `translate(${left}px, ${top}px) scale(${cam.s})`,
          transformOrigin: "0 0",
          fontFamily: FONT_MONO,
          lineHeight: 1.5,
          color: MONO.text,
          background: MONO.bg,
        }}
      >
        {/* the page slab (bn-slab): runs from above the view down past the kanban */}
        <div
          style={{
            position: "absolute",
            left: SLAB.x,
            top: -800,
            width: SLAB.w,
            height: slabBottom + 800,
            boxSizing: "border-box",
            border: `1px solid ${MONO.border}`,
            borderRadius: 28,
            background: MONO.bg,
            boxShadow: "0 1px 2px rgb(0 0 0 / .4), 0 24px 70px -18px rgb(0 0 0 / .6)",
          }}
        />

        {/* SlabCard "Local kanban" */}
        <div
          style={{
            position: "absolute",
            left: PANEL.x,
            top: PANEL.y,
            width: PANEL.w,
            height: panelBottom - PANEL.y,
            boxSizing: "border-box",
            border: `1px solid ${MONO.border}`,
            borderRadius: 12,
            background: MONO.surface,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: PANEL.x + 1 + 24,
            top: PANEL.y + 1 + 20,
            width: PANEL.w - 2 - 48,
            height: 28.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em", color: MONO.text }}>Local kanban</span>
            <span style={{ fontSize: 12, color: MONO.text3, fontVariantNumeric: "tabular-nums" }}>15</span>
          </div>
          <span style={{ fontSize: 11, color: MONO.text3 }}>drag between lanes · or click ▸ to advance</span>
        </div>

        {/* the four lanes (grid rows stretch to the tallest lane) */}
        {LANE_ORDER.map((lane) => (
          <div
            key={lane}
            style={{
              position: "absolute",
              left: COL_X[lane],
              top: COL_Y,
              width: COL_W,
              height: colH,
              boxSizing: "border-box",
              border: `1px solid ${MONO.border}`,
              borderRadius: 10,
              background: MONO.bg,
            }}
          />
        ))}
        {LANE_ORDER.map((lane) => (
          <LaneHead key={lane} lane={lane} f={f} />
        ))}

        {statics}
        {movers}

        {/* sticky chrome (out of shot at these framings, kept for a true page) */}
        <div style={{ position: "absolute", left: 0, top: 0, zIndex: 50 }}>
          <OsChrome page="tasks" />
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const BcP10TasksKeepMoving: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: MRD.bg }}>
    <MoveBlur moves={BLUR_WINDOWS}>
      <Scene />
    </MoveBlur>
  </AbsoluteFill>
);
