import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { EASE, FONT_MONO, MONO, MRD, OS_EASE, PARTS, PLAN_DATA, PLANS, USAGE, sec } from "./theme";
import { MoveBlur, OS_PAGE, OsChrome, PlanCard, VolumeMeter, limitMeterProps, meterSweep } from "./ui";

// ===========================================================================
// BcP05LeftCodexRightClaude: 1080x960 (9:8) @ 30fps, wrapped in the Holo
// safe frame by Root. VO (never on screen): "On the left is my Codex plan and
// on the right is my Claude Max subscription."
//
// A literal screen recording of the real FounderOS Usage page (state A), the
// view scrolled to the Plans row exactly as captured in
// reference/01-usage-stateA.png. Page coordinates are that capture's CSS px
// (1600x1000 viewport, body scrolled 736px). The one change from the capture,
// per the line: the ChatGPT · Codex card sits LEFT and the Claude card RIGHT.
// Everything else (tab order, Claude selected with its white border and its
// "where it burns" detail open below, Ollama empty, Plan Limits above) is as
// captured. Static neighbours (Burn by Model, Top burner, the Claude detail)
// are the capture's own pixels; everything that moves is the ported DOM.
//
//   -14..29  page rising in (bn-rise, staggered), camera already drifting down
//            onto the Plans row
//   29..55   "left" (f44): glide in tight on the Codex card; its meters sweep
//            (real 1.2s VolumeMeter sweep, weekly +150ms) to 60% / 87% amber,
//            the window strip counts up, last activity ticks
//   85..108  "right" (f89): travel right to the Claude card; 20% / 34%
//  130..153  "subscription" (f135): pull back to both cards side by side
//            (all three moves on GLIDE, each peaks <= 67 px/f)
//  152..end  near-still hold, slow drift; a 10s poll lands (last-hour burn
//            ticks up to the captured value), last-activity stamps tick
// End state = theme.ts USAGE / PLAN_DATA state A exactly (P07 continues from
// the Codex card).
// ===========================================================================

export const BCP05_DURATION = 172;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const TRAVEL = Easing.bezier(...EASE.travel);
const DECEL = Easing.bezier(...EASE.decel);
const HOUSE = Easing.bezier(...OS_EASE.ease);
// kit/format.ts countFrame(): 1 - (1 - t)^3, i.e. ease-out cubic.
const COUNT = Easing.bezier(0.33, 1, 0.68, 1);
// Camera glide for the three moves: a softer in-out than EASE.travel (peak
// speed 1.6x the average instead of 2.9x), so every move stays <= 70 px/f.
const GLIDE = Easing.bezier(0.37, 0, 0.63, 1);

const W = PARTS.P05.words;
const F_LEFT = sec(W.left); // 44
const F_RIGHT = sec(W.right); // 89
const F_SUB = sec(W.subscription); // 135

// ------------------------------------------------------------ page geometry
// Measured on reference/01-usage-stateA.png (css px = png px / 2).
const SCROLL = 736; // the captured view's body scroll
const FULL = { src: "bconductor/reference/01-usage-stateA-full.png", w: 1600, h: 2545 } as const;
const CARD = { y: 509, w: 392, h: 305, left: 310.5, mid: 719.5, right: 1129.5 } as const;

// ------------------------------------------------------------------ timing
const CODEX_ON = F_LEFT + 6; // 50: Codex meters start sweeping as the camera lands
const CLAUDE_ON = F_RIGHT + 13; // 102: Claude meters start as the camera arrives
const WEEKLY_DELAY = 4.5; // PlanCard weekly meter delay={150}
const COUNT_FRAMES = 27; // CountUp 900ms
const POLL = 140; // the page's 10s poll lands; last-hour burn ticks to the captured value

// bn-rise: 0.6s on the house ease, from translateY(10px) scale(.992), opacity 0.
const rise = (f: number, start: number): React.CSSProperties => {
  const t = interpolate(f, [start, start + 18], [0, 1], { ...clamp, easing: HOUSE });
  return { opacity: t, transform: `translateY(${10 * (1 - t)}px) scale(${0.992 + 0.008 * t})` };
};
// Stagger (frames). Negative = already under way at frame 0.
const RISE = {
  burnByModel: -17,
  planLimits: -15,
  topBurner: -13,
  plans: -10,
  codex: -7,
  claude: -4,
  ollama: -1,
  detail: -2,
} as const;

// ------------------------------------------------------------------ camera
// cx/cy: page point at the frame centre; s: frame px per page css px.
type Cam = { cx: number; cy: number; s: number };
type Seg = { f0: number; f1: number; to: Cam; ease: (t: number) => number; dip?: number };
const START: Cam = { cx: 772, cy: 512, s: 1.1 };
// camera move windows (also the MoveBlur windows)
const LEFT = { f0: F_LEFT - 15, f1: F_LEFT + 11 } as const; // 29..55
const RIGHT = { f0: F_RIGHT - 4, f1: F_RIGHT + 19 } as const; // 85..108
const BACK = { f0: F_SUB - 5, f1: F_SUB + 18 } as const; // 130..153
const SEGS: Seg[] = [
  // opens mid-move (the segment starts before frame 0): drifting down onto the Plans row
  { f0: -14, f1: LEFT.f0, to: { cx: 672, cy: 634, s: 1.36 }, ease: DECEL },
  // "left": glide in tight on the Codex card
  { f0: LEFT.f0, f1: LEFT.f1, to: { cx: 507, cy: 652, s: 2.42 }, ease: GLIDE },
  { f0: LEFT.f1, f1: RIGHT.f0, to: { cx: 511, cy: 655, s: 2.48 }, ease: TRAVEL },
  // "right": travel to the Claude card, easing out a touch mid-pan
  { f0: RIGHT.f0, f1: RIGHT.f1, to: { cx: 917, cy: 657, s: 2.42 }, ease: GLIDE, dip: 0.12 },
  { f0: RIGHT.f1, f1: BACK.f0, to: { cx: 921, cy: 660, s: 2.48 }, ease: TRAVEL },
  // "subscription": pull back to the two cards side by side
  { f0: BACK.f0, f1: BACK.f1, to: { cx: 709, cy: 652, s: 1.25 }, ease: GLIDE },
  { f0: BACK.f1, f1: BCP05_DURATION, to: { cx: 711, cy: 649, s: 1.262 }, ease: TRAVEL },
];

const camAt = (f: number): Cam => {
  let from = START;
  for (const g of SEGS) {
    if (f <= g.f1) {
      const p = g.ease(Math.max(0, Math.min(1, (f - g.f0) / (g.f1 - g.f0))));
      const s = Math.exp(Math.log(from.s) + (Math.log(g.to.s) - Math.log(from.s)) * p);
      return {
        cx: from.cx + (g.to.cx - from.cx) * p,
        cy: from.cy + (g.to.cy - from.cy) * p,
        s: s * (1 - (g.dip ?? 0) * Math.sin(Math.PI * p)),
      };
    }
    from = g.to;
  }
  return from;
};

// --------------------------------------------------------------- live data
type Burns = [number, number, number, number];
const countIn = (f: number, start: number) =>
  interpolate(f, [start, start + COUNT_FRAMES], [0, 1], { ...clamp, easing: COUNT });

// Window strip: counts in from zero (CountUp) a column at a time, then the
// poll adds the last few seconds of burn so it lands on the captured value.
const liveBurns = (f: number, on: number, target: readonly number[], pollDelta: number) => {
  const poll = countIn(f, POLL);
  const fr = target.map((_, i) => countIn(f, on + 2 + i * 2));
  const burns = target.map((v, i) => fr[i] * (v - pollDelta) + poll * pollDelta) as Burns;
  return { burns, fr };
};

// ------------------------------------------------------------- page pieces
// A rectangle of the real page, straight from the full-page capture.
const Capture: React.FC<{ x: number; y: number; w: number; h: number; style?: React.CSSProperties }> = ({
  x,
  y,
  w,
  h,
  style,
}) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, overflow: "hidden", ...style }}>
    <Img
      src={staticFile(FULL.src)}
      style={{ position: "absolute", left: -x, top: -(y + SCROLL), width: FULL.w, height: FULL.h, maxWidth: "none" }}
    />
  </div>
);

// kit chipClass(): rounded-full px-4 py-1.5 text-[12.5px]; on = solid accent, semibold.
const Chip: React.FC<{ on?: boolean; children: React.ReactNode }> = ({ on = false, children }) => (
  <span
    style={{
      borderRadius: 999,
      padding: "6px 16px",
      fontSize: 12.5,
      whiteSpace: "nowrap",
      border: on ? "none" : `1px solid ${MONO.border}`,
      background: on ? MONO.accent : "transparent",
      color: on ? MONO.bg : MONO.text2,
      fontWeight: on ? 600 : 400,
    }}
  >
    {children}
  </span>
);

// SlabCard "Plan Limits · official gauges only" (MeterStack, Claude rows then Codex rows).
const PlanLimits: React.FC<{ codex: [number, number]; claude: [number, number]; style: React.CSSProperties }> = ({
  codex,
  claude,
  style,
}) => {
  const rows = [
    { ...limitMeterProps("session", USAGE.claudeSessionA, USAGE.claudeSessionReset), label: "Claude · 5h session", sweep: claude[0] },
    { ...limitMeterProps("weekly", USAGE.claudeWeeklyA, USAGE.claudeWeeklyReset), label: "Claude · weekly", sweep: claude[1] },
    { ...limitMeterProps("session", USAGE.codexSessionA, USAGE.codexSessionReset), label: "Codex · 5h session", sweep: codex[0] },
    { ...limitMeterProps("weekly", USAGE.codexWeeklyA, USAGE.codexWeeklyReset), label: "Codex · weekly", sweep: codex[1] },
  ];
  return (
    <div
      style={{
        position: "absolute",
        left: 714,
        top: 70,
        width: 405,
        height: 345,
        boxSizing: "border-box",
        border: `1px solid ${MONO.border}`,
        borderRadius: 12,
        background: MONO.surface,
        ...style,
      }}
    >
      <div style={{ position: "absolute", left: 24, top: 20, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ color: MONO.text, fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em" }}>Plan Limits</span>
        <span style={{ color: MONO.text3, fontSize: 12 }}>official gauges only</span>
      </div>
      <div style={{ position: "absolute", left: 24, right: 24, top: 69, borderTop: `1px solid ${MONO.border}` }} />
      {rows.map((r, i) => (
        <div key={r.label} style={{ position: "absolute", left: 24, right: 24, top: 89.5 + i * 63 }}>
          <VolumeMeter label={r.label} frac={r.frac} display={r.display} hue={r.hue} sweep={r.sweep} />
        </div>
      ))}
    </div>
  );
};

// ------------------------------------------------------------------ scene
const Page: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camAt(f);
  const left = 540 - cam.cx * cam.s;
  const top = 480 - cam.cy * cam.s;

  const codexSweep: [number, number] = [meterSweep(f, CODEX_ON), meterSweep(f, CODEX_ON + WEEKLY_DELAY)];
  const claudeSweep: [number, number] = [meterSweep(f, CLAUDE_ON), meterSweep(f, CLAUDE_ON + WEEKLY_DELAY)];

  // Text counters step on whole frames (as a screen recording shows them), so
  // the motion-blur sub-samples never smear their digits; fills and the
  // camera keep the sub-frame time.
  const fi = Math.floor(f);
  const codex = liveBurns(fi, CODEX_ON, PLAN_DATA.codexA.burns, 600);
  const claude = liveBurns(fi, CLAUDE_ON, PLAN_DATA.claudeA.burns, 1200);
  const pctOf = (p: readonly number[], fr: number[]) => p.map((v, i) => v * fr[i]) as Burns;

  // "last activity Ns ago" ticks once a second and lands on the captured
  // stamp (30s / 25s); the two plans tick half a second apart.
  const codexAgo = 25 + Math.min(5, Math.floor(fi / 30));
  const claudeAgo = 19 + Math.min(6, Math.floor((fi + 15) / 30));

  return (
    <AbsoluteFill style={{ backgroundColor: MONO.bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: OS_PAGE.w,
          height: FULL.h - SCROLL,
          transform: `translate(${left}px, ${top}px) scale(${cam.s})`,
          transformOrigin: "0 0",
          fontFamily: FONT_MONO,
          lineHeight: 1.5,
          color: MONO.text,
          background: MONO.bg,
        }}
      >
        {/* the page slab (bn-slab): runs from above the view to below it */}
        <div
          style={{
            position: "absolute",
            left: 256,
            top: -760,
            width: 1320,
            height: 2385,
            boxSizing: "border-box",
            border: `1px solid ${MONO.border}`,
            borderRadius: 28,
            background: MONO.bg,
            boxShadow: "0 1px 2px rgb(0 0 0 / .4), 0 24px 70px -18px rgb(0 0 0 / .6)",
          }}
        />

        {/* second row: Burn by Model | Plan Limits | Top burner */}
        <Capture x={286} y={70} w={405} h={345} style={rise(f, RISE.burnByModel)} />
        <PlanLimits codex={codexSweep} claude={claudeSweep} style={rise(f, RISE.planLimits)} />
        <Capture x={1142} y={70} w={405} h={345} style={rise(f, RISE.topBurner)} />

        {/* Plans SlabCard: header + tabs (Claude selected, as captured) */}
        <div style={{ position: "absolute", left: 286, top: 438, width: 1261, height: 1160, ...rise(f, RISE.plans) }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              boxSizing: "border-box",
              border: `1px solid ${MONO.border}`,
              borderRadius: 12,
              background: MONO.surface,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 25,
              top: 21,
              width: 1211,
              height: 33,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em", color: MONO.text }}>Plans</span>
              <span style={{ fontSize: 12, color: MONO.text3, fontVariantNumeric: "tabular-nums" }}>3 providers</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Chip on>Claude</Chip>
              <Chip>ChatGPT · Codex</Chip>
              <Chip>Ollama</Chip>
            </div>
          </div>
        </div>

        {/* the plan cards: Codex LEFT, Claude RIGHT (Bennett's words), Ollama empty */}
        <div style={{ position: "absolute", left: CARD.left, top: CARD.y, ...rise(f, RISE.codex) }}>
          <PlanCard
            title={PLANS.codex.title}
            plan={PLANS.codex.plan}
            sessionPct={USAGE.codexSessionA}
            weeklyPct={USAGE.codexWeeklyA}
            sessionReset={USAGE.codexSessionReset}
            weeklyReset={USAGE.codexWeeklyReset}
            burns={codex.burns}
            pctOfWeek={pctOf(PLAN_DATA.codexA.pctOfWeek, codex.fr)}
            lanes={PLAN_DATA.codexA.lanes}
            machines={PLAN_DATA.codexA.machines}
            lastActivity={`${codexAgo}s ago`}
            sessionSweep={codexSweep[0]}
            weeklySweep={codexSweep[1]}
            width={CARD.w}
          />
        </div>
        <div style={{ position: "absolute", left: CARD.mid, top: CARD.y, ...rise(f, RISE.claude) }}>
          <PlanCard
            title={PLANS.claude.title}
            plan={PLANS.claude.plan}
            sessionPct={USAGE.claudeSessionA}
            weeklyPct={USAGE.claudeWeeklyA}
            sessionReset={USAGE.claudeSessionReset}
            weeklyReset={USAGE.claudeWeeklyReset}
            burns={claude.burns}
            pctOfWeek={pctOf(PLAN_DATA.claudeA.pctOfWeek, claude.fr)}
            lanes={PLAN_DATA.claudeA.lanes}
            machines={PLAN_DATA.claudeA.machines}
            lastActivity={`${claudeAgo}s ago`}
            sessionSweep={claudeSweep[0]}
            weeklySweep={claudeSweep[1]}
            selected
            width={CARD.w}
          />
        </div>
        <div
          style={{
            position: "absolute",
            left: CARD.right,
            top: CARD.y,
            width: CARD.w,
            height: CARD.h,
            boxSizing: "border-box",
            borderRadius: 12,
            border: `1px dashed ${MONO.border}`,
            padding: 20,
            fontSize: 12.5,
            color: MONO.text3,
            ...rise(f, RISE.ollama),
          }}
        >
          <span style={{ color: MONO.text2, fontSize: 15, fontWeight: 600 }}>Ollama</span>
          <p style={{ margin: "8px 0 0" }}>no machine has reported Ollama yet</p>
        </div>

        {/* Claude's "where it burns" detail, open below (selected plan) */}
        <Capture x={287} y={822} w={1258} h={300} style={rise(f, RISE.detail)} />

        {/* sticky chrome (out of shot at these framings, kept for a true page) */}
        <div style={{ position: "absolute", left: 0, top: 0, width: OS_PAGE.w, height: OS_PAGE.h }}>
          <OsChrome page="usage" />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// MoveBlur windows (12 samples there, plain frames elsewhere): the three
// camera moves. The opening drift (<= 12 px/f) and the holds render plain.
const MOVES: [number, number][] = [
  [LEFT.f0, LEFT.f1],
  [RIGHT.f0, RIGHT.f1],
  [BACK.f0, BACK.f1],
];

export const BcP05LeftCodexRightClaude: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: MRD.bg }}>
    <MoveBlur moves={MOVES}>
      <Page />
    </MoveBlur>
  </AbsoluteFill>
);
