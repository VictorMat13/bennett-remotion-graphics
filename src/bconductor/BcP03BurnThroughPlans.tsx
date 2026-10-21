import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { EASE, FONT_MONO, MONO, MRD, OS_EASE, PARTS, PLANS, TASKS, sec } from "./theme";
import { KanbanLaneHeader, MoveBlur, PlanCard, SeatChip, TaskCard } from "./ui";

// ===========================================================================
// BcP03BurnThroughPlans: 1080x960 (9:8) @ 30fps, wrapped in the Holo safe
// frame by Root. VO (never on screen): "Or they burn through their plans in
// less than a day and wonder why they can't get anything done."
// Word frames: burn 12, plans 27, less than a day 42-72, day 72, wonder 80,
// done 120, end 132.
//
// "Most people": one plan, one board, no hand-off. The same seats P02 ends on
// (Sales / Comms / Reelkit / Brand Deal / Social / Data / Newsletter, timers
// continued, model-only lines as in P02) all run on ONE Claude Max 20x plan.
// Page (css px): the real Claude PlanCard top-left, a real Tasks "In progress"
// lane beside it, a few rows of the real seat grid below (chips wide enough
// that the real failure line prints in full).
//
//   -8..34  opens mid-move tight on "Session limit · 5h" as it starts to
//           climb, easing back to the whole card
//   0..72   the session meter races 1% -> 100% (pctTone: green, amber at 70,
//           red at 90, blended over 5f), weekly 31 -> 38%, the window strip
//           (last hour / 5h session / today / 7 days) counts up; the shot
//           slowly widens until two seat rows (spinners, timers, orbits) burn
//           under the card. 100% · resets in 4h on "day" (f72).
//   74..100 the board fails: every running seat, one after another (3f), to
//           the real error state (red border, ✗, "run failed · You've hit
//           your usage limit."), timers gone; the In progress cards stop
//           breathing as their owners fail. Camera eases back to the meter
//           (red, 100%) over the seat grid going red.
//  100..120 "wonder why": a slow drift (<= 6 px/f) over the frozen seats, the
//           red 100% meter on top and the stalled In progress lane at the side
//  120..145 slow push onto one frozen seat (Sales Agent, right under the
//           plan's frozen window strip)
//  145..end near-still hold (20f)
// No cursor, no captions: only real FounderOS strings.
// ===========================================================================

export const BCP03_DURATION = 165;

const W = 1080;
const H = 960;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const DECEL = Easing.bezier(...EASE.decel);
const HOUSE = Easing.bezier(...OS_EASE.ease);
// Camera glide for the long moves (peak speed ~1.6x the average).
const GLIDE = Easing.bezier(0.37, 0, 0.63, 1);
// The session burn: gathers speed, races, lands on the cap without crawling.
const BURN = Easing.bezier(0.45, 0.02, 0.75, 0.94);

const WD = PARTS.P03.words;
const F_DAY = sec(WD.day); // 72

// ---------------------------------------------------------------- geometry
// One column width for the PlanCard, the lane and a seat chip. A seat chip
// needs 78px of chrome + the model line ("claude-sonnet-5-5 · run failed ·
// You've hit your usage limit." = 61 mono chars at 9px = 329px).
const C = 416;
const GAP = 8; // seat grid gap-2
const CARD_H = 307;
const GRID_Y = CARD_H + 16;
const SEAT_H = 46;
const PX = C + GAP; // column pitch 424
const PY = SEAT_H + GAP; // row pitch 54
const LANE_X = PX; // the In progress lane sits over seat column 1

// -------------------------------------------------------------- the burn
const SESSION_CAP = 13_000_000; // tokens in a full 5h window
const WEEK_CAP = 169_000_000;
const WEEK_BASE = 51_500_000; // 7-day burn before this session (30.5%)
const SESS = { f0: -8, f1: F_DAY } as const;
const SESSION_RESET = "resets in 4h";
const WEEKLY_RESET = "resets in 6d";

const sessionAt = (fr: number) =>
  100 * interpolate(fr, [SESS.f0, SESS.f1], [0, 1], { ...clamp, easing: BURN });
const weeklyAt = (fr: number) => ((WEEK_BASE + (SESSION_CAP * sessionAt(fr)) / 100) / WEEK_CAP) * 100;

// usage.ts pctTone: >= 70 warn, >= 90 err, on the value the card prints. The
// product swaps the hue on the poll that crosses; here it blends over 5f.
const firstFrame = (shown: (fr: number) => number, thr: number) => {
  for (let fr = -10; fr <= BCP03_DURATION; fr++) if (shown(fr) >= thr) return fr;
  return Infinity;
};
const shownPct = (n: number) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10);
const SESSION_WARN = firstFrame((fr) => shownPct(sessionAt(fr)), 70);
const SESSION_ERR = firstFrame((fr) => shownPct(sessionAt(fr)), 90);
const ramp = (fi: number, at: number) => (Number.isFinite(at) ? interpolate(fi, [at, at + 5], [0, 1], clamp) : 0);
const blendHue = (fi: number) => {
  const w = ramp(fi, SESSION_WARN);
  const e = ramp(fi, SESSION_ERR);
  const c1 = w >= 1 ? MONO.warn : w <= 0 ? MONO.ok : `color-mix(in oklab, ${MONO.warn} ${(w * 100).toFixed(1)}%, ${MONO.ok})`;
  return e >= 1 ? MONO.err : e <= 0 ? c1 : `color-mix(in oklab, ${MONO.err} ${(e * 100).toFixed(1)}%, ${c1})`;
};
// VolumeMeter's fill paint (kit/VolumeMeter.svelte), re-applied with the
// blended hue on the PlanCard's session fill.
const fillCss = (hue: string) =>
  `background-image:linear-gradient(90deg, transparent 72%, color-mix(in oklab, ${hue} 60%, ${MONO.text}) 100%), repeating-linear-gradient(45deg, ${hue}, ${hue} 6px, color-mix(in oklab, ${hue} 45%, transparent) 6px, color-mix(in oklab, ${hue} 45%, transparent) 12px) !important;box-shadow:0 0 14px color-mix(in oklab, ${hue} 45%, transparent), inset 0 0 5px color-mix(in oklab, ${hue} 55%, transparent) !important;`;

// Hatch drift on the meter fills (the P07/P08/P09 ambient layer).
const HATCH_P = 12 * Math.SQRT2;
const HATCH_SPEED = 0.25;

// ------------------------------------------------------------------ seats
// P02's seats (same models, model-only lines) + a few more from the seed.
// sinceSec: how long the current run has been going at f0 (P02 + 5s).
type SeatDef = { name: string; model: string; col: number; row: number; sinceSec?: number };
const SEATS: SeatDef[] = [
  { name: "Sales Agent", model: "claude-opus-5-5", col: 0, row: 0, sinceSec: 151 },
  { name: "Brand Deal Agent", model: "claude-opus-5-5", col: 0, row: 1, sinceSec: 47 },
  { name: "Data Agent", model: "claude-opus-5-5", col: 0, row: 2, sinceSec: 106 },
  { name: "Social Agent", model: "claude-sonnet-5-5", col: 0, row: 3, sinceSec: 40 },
  { name: "Newsletter Agent", model: "claude-sonnet-5-5", col: 0, row: 4, sinceSec: 221 },
  { name: "Reelkit Editor", model: "claude-opus-5-5", col: 1, row: 0, sinceSec: 216 },
  { name: "Comms Agent", model: "claude-sonnet-5-5", col: 1, row: 1, sinceSec: 66 },
  { name: "Postly Publisher", model: "claude-haiku-5-5", col: 1, row: 2, sinceSec: 183 },
  { name: "Gmail Worker", model: "claude-haiku-5-5", col: 1, row: 3, sinceSec: 14 },
  { name: "Client Roster", model: "claude-sonnet-5-5", col: 1, row: 4, sinceSec: 92 },
  { name: "Adsmith Creative", model: "claude-sonnet-5-5", col: 2, row: 0, sinceSec: 129 },
  { name: "Stack Monitor", model: "claude-haiku-5-5", col: 2, row: 1 },
  { name: "Ledger CRM", model: "claude-haiku-5-5", col: 2, row: 2, sinceSec: 77 },
  { name: "Payments Pulse", model: "claude-haiku-5-5", col: 2, row: 3 },
  { name: "WhatsApp Worker", model: "claude-haiku-5-5", col: 2, row: 4, sinceSec: 158 },
];
const FAILURE = "run failed · You've hit your usage limit.";

// The plan is out: the running seats fail one after another, 3f apart, in a
// wave down and across the grid (the columns in shot first).
const F_FAIL0 = F_DAY + 3; // 75
const FAIL_STEP = 3;
const FAIL_AT: Record<string, number> = (() => {
  const running = SEATS.filter((s) => s.sinceSec !== undefined);
  const key = (s: SeatDef) => (s.col === 2 ? 100 : 0) + s.row + s.col + s.col * 0.1;
  const order = [...running].sort((a, b) => key(a) - key(b));
  const out: Record<string, number> = {};
  order.forEach((s, k) => (out[s.name] = F_FAIL0 + k * FAIL_STEP));
  return out;
})();
const XF = 5; // state crossfade
const LINE_DELAY = 4; // the failure line lands just after the ✗
const SETTLE = 24; // the fresh red border settles to the product's 45% mix

const mix = (c: string, pct: number, other = "transparent") => `color-mix(in oklab, ${c} ${pct.toFixed(2)}%, ${other})`;

const Seat: React.FC<{ s: SeatDef; i: number; f: number; fi: number }> = ({ s, i, f, fi }) => {
  const sf = f + i * 7; // spinners out of phase, as a live board looks
  const x = s.col * PX;
  const y = GRID_Y + s.row * PY;
  const box: React.CSSProperties = { position: "absolute", left: x, top: y, width: C, height: SEAT_H };
  if (s.sinceSec === undefined) {
    return (
      <div style={box}>
        <SeatChip name={s.name} model={s.model} status="idle" frame={sf} width={C} />
      </div>
    );
  }
  const tf = FAIL_AT[s.name];
  const err = interpolate(fi, [tf, tf + XF], [0, 1], { ...clamp, easing: HOUSE });
  const line = interpolate(fi, [tf + LINE_DELAY, tf + LINE_DELAY + XF], [0, 1], { ...clamp, easing: HOUSE });
  const settle = interpolate(fi, [tf, tf + SETTLE], [0, 1], { ...clamp, easing: DECEL });
  const errBorder = { border: `1px solid ${mix(MONO.err, 45 + 33 * (1 - settle), MONO.border)}` };
  // the SeatChip's own 1s clock, stopped where the run died
  const elapsed = s.sinceSec + Math.floor(Math.min(fi, tf) / 30);
  return (
    <div style={box}>
      {err < 1 ? (
        <div style={{ position: "absolute", inset: 0 }}>
          <SeatChip
            name={s.name}
            model={s.model}
            status="running"
            frame={fi < tf ? sf : tf + i * 7}
            elapsedSec={elapsed}
            width={C}
            orbit
            orbitPhase={i * 0.37}
          />
        </div>
      ) : null}
      {err > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: err }}>
          <SeatChip name={s.name} model={s.model} status="error" frame={sf} width={C} style={errBorder} />
        </div>
      ) : null}
      {line > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: line }}>
          <SeatChip name={s.name} model={s.model} status="error" failure={FAILURE} frame={sf} width={C} style={errBorder} />
        </div>
      ) : null}
    </div>
  );
};

// ------------------------------------------------------- In progress lane
// pages/tasks/TaskKanban.svelte column (08c): p-3, radius 10, gap 10, header
// + cards. Cards breathe green while their owner's run is live (the
// product's bn-task-breathe, 1.5s) and go still when the owner fails.
const LANE_CARDS = TASKS.doing.slice(0, 3);
const Lane: React.FC<{ f: number; fi: number }> = ({ f, fi }) => {
  const breathe = 0.5 - 0.5 * Math.cos((((f / 30) % 1.5) / 1.5) * 2 * Math.PI);
  return (
    <div
      style={{
        position: "absolute",
        left: LANE_X,
        top: 0,
        width: C,
        height: CARD_H,
        boxSizing: "border-box",
        border: `1px solid ${MONO.border}`,
        borderRadius: 10,
        background: MONO.bg,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <KanbanLaneHeader label="In progress" tone={MONO.warn} count={LANE_CARDS.length} />
      {LANE_CARDS.map((t) => {
        const tf = FAIL_AT[t.owner] ?? Infinity;
        const lv = 1 - interpolate(fi, [tf, tf + 8], [0, 1], { ...clamp, easing: HOUSE });
        return (
          <TaskCard
            key={t.title}
            title={t.title}
            owner={t.owner}
            width={C - 26}
            style={{
              border: `1px solid ${lv > 0 ? mix(MONO.ok, (30 + 70 * breathe) * lv, MONO.border) : MONO.border}`,
              background: lv > 0 ? mix(MONO.ok, 9 * breathe * lv, MONO.surface) : MONO.surface,
            }}
          />
        );
      })}
    </div>
  );
};

// ================================================================ camera
type Cam = { cx: number; cy: number; s: number };
type Seg = { f0: number; f1: number; to: Cam; ease: (t: number) => number; bow?: number };

const K0: Cam = { cx: 183, cy: 144, s: 3.2 }; // virtual (f-8): tight on the session meter (label, fill start, value)
const K1: Cam = { cx: 210, cy: 186, s: 2.4 }; // the whole card, the first seat row under it
const K2: Cam = { cx: 214, cy: 212, s: 2.2 }; // slow widen while the meter races: two rows of seats burning
const K3: Cam = { cx: 288, cy: 268, s: 1.82 }; // red meter + lane header over the seat grid going red
const K4: Cam = { cx: 292, cy: 298, s: 1.9 }; // slow drift: red meter on top, frozen seats, stalled lane
const K5: Cam = { cx: 206, cy: 344, s: 2.5 }; // onto Sales Agent, under the plan's frozen window strip
const K6: Cam = { cx: 206, cy: 345, s: 2.53 };

const OPEN = { f0: -8, f1: 34 } as const;
const FALL = { f0: 74, f1: 100 } as const;
const DRIFT = { f0: 100, f1: 120 } as const;
const PUSH = { f0: 120, f1: 145 } as const;
const SEGS: Seg[] = [
  { f0: OPEN.f0, f1: OPEN.f1, to: K1, ease: GLIDE },
  { f0: OPEN.f1, f1: FALL.f0, to: K2, ease: GLIDE },
  { f0: FALL.f0, f1: FALL.f1, to: K3, ease: GLIDE },
  { f0: DRIFT.f0, f1: DRIFT.f1, to: K4, ease: GLIDE },
  { f0: PUSH.f0, f1: PUSH.f1, to: K5, ease: GLIDE },
  { f0: PUSH.f1, f1: BCP03_DURATION + 3, to: K6, ease: DECEL },
];

const camAt = (f: number): Cam => {
  let from = K0;
  for (const g of SEGS) {
    if (f <= g.f1) {
      const p = g.ease(Math.max(0, Math.min(1, (f - g.f0) / (g.f1 - g.f0))));
      const bow = g.bow ? 1 - g.bow * 4 * p * (1 - p) : 1;
      return {
        cx: from.cx + (g.to.cx - from.cx) * p,
        cy: from.cy + (g.to.cy - from.cy) * p,
        s: Math.exp(Math.log(from.s) + (Math.log(g.to.s) - Math.log(from.s)) * p) * bow,
      };
    }
    from = g.to;
  }
  return from;
};

// ================================================================= scene
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

const Scene: React.FC = () => {
  const f = useCurrentFrame();
  // UI state steps on whole frames (as a screen recording shows it), so the
  // motion-blur sub-samples never smear digits; camera, spinners, orbits,
  // breathing and hatch keep sub-frame time.
  const fi = Math.floor(f);
  const cam = camAt(f);

  // ---- the plan burns
  const session = sessionAt(fi);
  const weekly = weeklyAt(fi);
  const sessBurn = (SESSION_CAP * session) / 100;
  const burns: [number, number, number, number] = [
    0.72 * sessBurn,
    sessBurn,
    900_000 + sessBurn,
    WEEK_BASE + sessBurn,
  ];
  const pctOfWeek = burns.map((b, k) => (k === 3 ? Math.round(weekly) : Math.round((b / WEEK_CAP) * 1000) / 10)) as [
    number,
    number,
    number,
    number,
  ];
  const lp = session / 100;
  const lanes = {
    board: lerp(62, 76, lp),
    sessions: lerp(20, 13, lp),
    terminal: lerp(12, 7, lp),
    automation: lerp(6, 4, lp),
  };
  // nothing has run since the cap: "last activity" starts to age
  const lastActivity = fi < F_DAY + 30 ? "now" : `${Math.floor((fi - F_DAY) / 30)}s ago`;

  const hue = blendHue(fi);
  const hatchX = ((f * HATCH_SPEED) % HATCH_P).toFixed(3);
  // PlanCard: card > meters (2nd child) > session meter (1st) > track (2nd) > fill
  const sessionFill = `.p03-card > div > div:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div`;

  return (
    <AbsoluteFill style={{ backgroundColor: MONO.bg, overflow: "hidden" }}>
      <style>{`.p03-page [style*="repeating-linear-gradient"]{background-size:auto,${HATCH_P}px ${HATCH_P}px !important;background-position:0 0,var(--p03-hx) 0 !important;}${sessionFill}{${fillCss(hue)}}`}</style>
      <div
        className="p03-page"
        style={
          {
            position: "absolute",
            left: 0,
            top: 0,
            width: 1,
            height: 1,
            transform: `translate(${W / 2 - cam.cx * cam.s}px, ${H / 2 - cam.cy * cam.s}px) scale(${cam.s})`,
            transformOrigin: "0 0",
            fontFamily: FONT_MONO,
            lineHeight: 1.5,
            color: MONO.text,
            "--p03-hx": `${hatchX}px`,
          } as React.CSSProperties
        }
      >
        <div className="p03-card" style={{ position: "absolute", left: 0, top: 0 }}>
          <PlanCard
            title={PLANS.claude.title}
            plan={PLANS.claude.plan}
            sessionPct={session}
            weeklyPct={weekly}
            sessionReset={SESSION_RESET}
            weeklyReset={WEEKLY_RESET}
            burns={burns}
            pctOfWeek={pctOfWeek}
            lanes={lanes}
            machines={1}
            lastActivity={lastActivity}
            selected
            width={C}
          />
        </div>

        <Lane f={f} fi={fi} />

        {SEATS.map((s, i) => (
          <Seat key={s.name} s={s} i={i} f={f} fi={fi} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

// MoveBlur windows (12 samples there, plain frames elsewhere): the opening
// glide, the pull back over the board and the push. The slow widen (f34-74)
// and the drift (f100-120) stay under ~6 px/f and render plain.
const MOVES: [number, number][] = [
  [0, OPEN.f1],
  [FALL.f0, FALL.f1],
  [PUSH.f0, PUSH.f1],
];

export const BcP03BurnThroughPlans: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: MRD.bg }}>
    <MoveBlur moves={MOVES}>
      <Scene />
    </MoveBlur>
  </AbsoluteFill>
);
