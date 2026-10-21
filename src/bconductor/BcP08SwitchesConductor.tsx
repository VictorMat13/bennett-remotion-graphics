import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { EASE, MONO, MRD, OS_EASE, PARTS, PLAN_DATA, USAGE, sec } from "./theme";
import { MoveBlur, limitMeterProps } from "./ui";
import {
  BoardStrip,
  CODEX_ELAPSED_AT_CUT,
  Column,
  DH_Y,
  DockHeader,
  HATCH_SPEED,
  PL_ROW_Y,
  P07_LAST,
  PlanLimits,
  PlansSlab,
  SEAT_Y,
  atSafe,
  p07Cam,
  runCam,
  type Cam,
  type Row,
  type Seg,
} from "./BcP07CodexAt87";

// ===========================================================================
// BcP08SwitchesConductor: 1080x1920 (9:16) @ 30fps, NOT safe-frame wrapped.
// VO (never on screen): "And once that maxes out, it automatically switches
// to my other conductor, which is running Opus 5.5."
//
// The same page P07 ends on (imported from it, so the cut is one page): the
// Conductor dock header panel, the Board live strip with the two Conductor
// seats, Plan Limits, the Plans card. No cursor: the hand-off happens on
// its own.
//
//    0..30   opens on P07's last frame (same camera, same values) and holds
//            with a slow push while "maxes out" (f15) climbs Codex · weekly
//            87 -> 100 and Codex · 5h 61 -> 100 on the meter's own curve,
//            pctTone amber/green -> red (blended over 5f); both read 100 by f30
//   30..53   one short glide up (23f, <= 45 px/f) to the Conductor: dock
//            header + Board live strip + the Claude gauges in one frame,
//            landing before "switches" (f54)
//   53..106  the hand-off on a hold: f70 Conductor · Codex run fails (✗, red,
//            then "run failed · You've hit your usage limit."), 14 -> 13
//            running; f80 Conductor · Claude goes live (orbit, spinner, 0s),
//            13 -> 14 running; f84-96 the dock chip rolls gpt-6-astra ->
//            claude-opus-5-5 on "other conductor" (f79)
//  106..132  "which is...": eases down onto the live Opus seat over the
//            Claude gauges, which climb (5h 20 -> 33, weekly 34 -> 41, f96-206)
//  179..204  "running Opus 5.5": back up so the dock chip (claude-opus-5-5),
//            the live seat and the Claude climb share the frame
//  204..end  near-still hold
// ===========================================================================

export const BCP08_DURATION = 225;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const TRAVEL = Easing.bezier(...EASE.travel);
const DECEL = Easing.bezier(...EASE.decel);
const HOUSE = Easing.bezier(...OS_EASE.ease);
// The VolumeMeter's own fill curve (bn-vol-meter-in, cubic-bezier(.2,.7,.2,1)).
const METER = Easing.bezier(...OS_EASE.meterIn);
// kit/format.ts countFrame(): ease-out cubic (CountUp).
const COUNT = Easing.bezier(0.33, 1, 0.68, 1);
// Camera glide: soft in-out bezier, peak speed 1.6x the average.
const GLIDE = Easing.bezier(0.37, 0, 0.63, 1);

const W = PARTS.P08.words;
const F_MAX = sec(W.maxesOut); // 15
const F_SWITCH = sec(W.switches); // 54
const F_OTHER = sec(W.otherConductor); // 79
const F_RUN = sec(W.running); // 179

// ------------------------------------------------------------------ the data
// Codex maxes out on "maxes out".
const WEEKLY = { from: USAGE.codexWeeklyA, to: USAGE.codexWeeklyMax, f0: F_MAX - 1, f1: F_MAX + 19 } as const;
const SESSION = { from: USAGE.codexSessionA + 1, to: USAGE.codexSessionMax, f0: F_MAX, f1: F_MAX + 20 } as const;
const STRIP = { f0: F_MAX + 1, f1: F_MAX + 29 } as const;
// Codex window strip, State A -> State B (last hour from capture 02a).
const CODEX_BURNS_A = PLAN_DATA.codexA.burns;
const CODEX_BURNS_B: [number, number, number, number] = [430_000, PLAN_DATA.codexMax.burns[1], PLAN_DATA.codexMax.burns[2], PLAN_DATA.codexMax.burns[3]];
const CODEX_PCT_A = PLAN_DATA.codexA.pctOfWeek;
const CODEX_PCT_B: [number, number, number, number] = [1.7, PLAN_DATA.codexMax.pctOfWeek[1], PLAN_DATA.codexMax.pctOfWeek[2], 100];

// The hand-off (no cursor). P09 keys its board to these two frames.
const F_FAIL = 70; // Conductor · Codex run fails: border/icon/✗ first ...
const F_FAIL_LINE = 75; // ... then the failure line, quiet
const F_LIVE = F_OTHER + 1; // 80: Conductor · Claude goes live
const F_ROLL = 84; // dock model chip rolls (12f)
const ROLL_LEN = 12;
const XFADE = 6;

// Claude takes the load: session 20 -> 33, weekly 34 -> 41, slow.
const CLAUDE = { f0: F_LIVE + 16, f1: 206 } as const;

// ------------------------------------------------------------------ camera
const P07_END: Cam = p07Cam(P07_LAST);
// The maxes-out hold: P07's framing with a slow push.
const CLIMB: Cam = { cx: P07_END.cx, cy: P07_END.cy - 2, s: 2.55 };
// The hand-off: dock header (top) + Board live strip + the Claude gauges, the
// Codex rows (red) just under the safe zone.
const CLAUDE_WEEKLY_BOTTOM = PL_ROW_Y(1) + 39;
const HANDOFF = atSafe((DH_Y + CLAUDE_WEEKLY_BOTTOM) / 2, 2.53);
const HANDOFF_PUSH = atSafe((DH_Y + CLAUDE_WEEKLY_BOTTOM) / 2 + 4, 2.56);
// The live Opus seat over the climbing Claude gauges.
const GAUGES = atSafe((SEAT_Y.claude + CLAUDE_WEEKLY_BOTTOM) / 2, 2.55);
const GAUGES_PUSH = atSafe((SEAT_Y.claude + CLAUDE_WEEKLY_BOTTOM) / 2 + 4, 2.57);
// End: dock chip + seats + Claude gauges, as the hand-off framed them.
const END = HANDOFF;
const END_DRIFT = atSafe((DH_Y + CLAUDE_WEEKLY_BOTTOM) / 2 + 0.6, 2.525);

const SEG1 = { f0: -4, f1: 30 } as const;
// camera move windows (also the MoveBlur windows)
const UP = { f0: SEG1.f1, f1: F_SWITCH - 1 } as const; // 30..53: lands before "switches"
const DOWN = { f0: 106, f1: 132 } as const; // "which is...": onto the Opus seat + gauges
const BACK = { f0: F_RUN, f1: 204 } as const; // "running Opus 5.5"
const SEGS: Seg[] = [
  { f0: SEG1.f0, f1: SEG1.f1, to: CLIMB, ease: GLIDE },
  { f0: UP.f0, f1: UP.f1, to: HANDOFF, ease: GLIDE },
  { f0: UP.f1, f1: DOWN.f0, to: HANDOFF_PUSH, ease: TRAVEL },
  { f0: DOWN.f0, f1: DOWN.f1, to: GAUGES, ease: GLIDE },
  { f0: DOWN.f1, f1: BACK.f0, to: GAUGES_PUSH, ease: TRAVEL },
  { f0: BACK.f0, f1: BACK.f1, to: END, ease: GLIDE },
  { f0: BACK.f1, f1: BCP08_DURATION + 6, to: END_DRIFT, ease: DECEL },
];

// The first segment starts before frame 0 from a virtual point chosen so that
// frame 0 sits exactly on P07's last camera (already drifting, gently).
const START: Cam = (() => {
  const e = GLIDE((0 - SEG1.f0) / (SEG1.f1 - SEG1.f0));
  const solve = (p: number, b: number) => (p - b * e) / (1 - e);
  return {
    cx: solve(P07_END.cx, CLIMB.cx),
    cy: solve(P07_END.cy, CLIMB.cy),
    s: Math.exp(solve(Math.log(P07_END.s), Math.log(CLIMB.s))),
  };
})();
const camAt = (f: number) => runCam(START, SEGS, f);

// ------------------------------------------------------- tone (pctTone) blend
// usage.ts pctTone: >= 70 warn, >= 90 err. The product swaps the hue on the
// poll the value crosses; here the swap blends over 5 frames so nothing snaps.
const firstFrame = (shown: (fr: number) => number, thr: number) => {
  for (let fr = -1; fr <= BCP08_DURATION; fr++) if (shown(fr) >= thr) return fr;
  return Infinity;
};
const ramp = (fi: number, at: number) =>
  !Number.isFinite(at) ? (at < 0 ? 1 : 0) : interpolate(fi, [at, at + 5], [0, 1], clamp);
const blendHue = (fi: number, fWarn: number, fErr: number) => {
  const w = ramp(fi, fWarn);
  const e = ramp(fi, fErr);
  const c1 = w >= 1 ? MONO.warn : w <= 0 ? MONO.ok : `color-mix(in oklab, ${MONO.warn} ${(w * 100).toFixed(1)}%, ${MONO.ok})`;
  return e >= 1 ? MONO.err : e <= 0 ? c1 : `color-mix(in oklab, ${MONO.err} ${(e * 100).toFixed(1)}%, ${c1})`;
};
// VolumeMeter's fill paint (kit/VolumeMeter.svelte), for a CSS override on the
// PlanCard's own fills so they blend with the Plan Limits rows.
const fillCss = (hue: string) =>
  `background-image:linear-gradient(90deg, transparent 72%, color-mix(in oklab, ${hue} 60%, ${MONO.text}) 100%), repeating-linear-gradient(45deg, ${hue}, ${hue} 6px, color-mix(in oklab, ${hue} 45%, transparent) 6px, color-mix(in oklab, ${hue} 45%, transparent) 12px) !important;box-shadow:0 0 14px color-mix(in oklab, ${hue} 45%, transparent), inset 0 0 5px color-mix(in oklab, ${hue} 55%, transparent) !important;`;

const weeklyFillAt = (fr: number) =>
  WEEKLY.from + (WEEKLY.to - WEEKLY.from) * interpolate(fr, [WEEKLY.f0, WEEKLY.f1], [0, 1], { ...clamp, easing: METER });
const sessionFillAt = (fr: number) =>
  SESSION.from + (SESSION.to - SESSION.from) * interpolate(fr, [SESSION.f0, SESSION.f1], [0, 1], { ...clamp, easing: METER });
const WEEKLY_ERR = firstFrame((fr) => Math.round(weeklyFillAt(fr)), 90);
const SESSION_WARN = firstFrame((fr) => Math.round(sessionFillAt(fr)), 70);
const SESSION_ERR = firstFrame((fr) => Math.round(sessionFillAt(fr)), 90);

// ------------------------------------------------------------------ scene
const Page: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camAt(f);
  // UI state steps on whole frames (as a screen recording shows it), so the
  // motion-blur sub-samples never smear digits; camera, spinners, sweep and
  // hatch keep sub-frame time.
  const fi = Math.floor(f);
  const clock = P07_LAST + f; // P07's clock, continued (spinners, orbits, LED, emblem)
  const t7 = P07_LAST + fi;

  // ---- Codex maxes out
  const weeklyFill = weeklyFillAt(fi);
  const sessionFill = sessionFillAt(fi);
  const weeklyShown = Math.round(weeklyFill);
  const weeklyHue = blendHue(fi, -Infinity, WEEKLY_ERR);
  const sessionHue = blendHue(fi, SESSION_WARN, SESSION_ERR);

  const strip = interpolate(fi, [STRIP.f0, STRIP.f1], [0, 1], { ...clamp, easing: COUNT });
  const lerp4 = (a: readonly number[], b: readonly number[], p: number) =>
    a.map((v, i) => v + (b[i] - v) * p) as [number, number, number, number];
  const codexBurns = lerp4(CODEX_BURNS_A, CODEX_BURNS_B, strip);
  codexBurns[3] = CODEX_BURNS_A[3] + (CODEX_BURNS_B[3] - CODEX_BURNS_A[3]) * ((weeklyFill - WEEKLY.from) / (WEEKLY.to - WEEKLY.from));
  const codexPct = lerp4(CODEX_PCT_A, CODEX_PCT_B, strip).map((v) => Math.round(v * 10) / 10) as [number, number, number, number];
  codexPct[3] = weeklyShown;

  // "last activity Ns ago": Codex was reset by the poll that maxed it, then ages.
  const codexAgo = fi < F_MAX + 1 ? Math.floor((t7 - 72) / 30) : Math.floor((fi - F_MAX - 1) / 30);

  // ---- Claude takes the load
  const cl = interpolate(fi, [CLAUDE.f0, CLAUDE.f1], [0, 1], { ...clamp, easing: TRAVEL });
  const claudeSession = USAGE.claudeSessionA + (USAGE.claudeSessionC - USAGE.claudeSessionA) * cl;
  const claudeWeekly = USAGE.claudeWeeklyA + (USAGE.claudeWeeklyC - USAGE.claudeWeeklyA) * cl;
  const ca = PLAN_DATA.claudeA;
  const cc = PLAN_DATA.claudeC;
  const claudeBurns = lerp4(ca.burns, cc.burns, cl);
  const claudePct = lerp4(ca.pctOfWeek, cc.pctOfWeek, cl).map((v) => Math.round(v * 10) / 10) as [number, number, number, number];
  const claudeLanes = {
    board: ca.lanes.board + (cc.lanes.board - ca.lanes.board) * cl,
    sessions: ca.lanes.sessions + (cc.lanes.sessions - ca.lanes.sessions) * cl,
    terminal: ca.lanes.terminal + (cc.lanes.terminal - ca.lanes.terminal) * cl,
    automation: ca.lanes.automation + (cc.lanes.automation - ca.lanes.automation) * cl,
  };
  const claudeAgo = fi < CLAUDE.f0 ? `${25 + Math.floor((t7 + 15) / 30)}s ago` : `${Math.floor((fi - CLAUDE.f0) / 30)}s ago`;

  const shownMeter = (kind: "session" | "weekly", fill: number, reset: string, hue?: string) => {
    const m = limitMeterProps(kind, Math.round(fill), reset);
    return { ...m, frac: fill / 100, hue: hue ?? m.hue };
  };
  const rows: Row[] = [
    { ...shownMeter("session", claudeSession, USAGE.claudeSessionReset), label: "Claude · 5h session" },
    { ...shownMeter("weekly", claudeWeekly, USAGE.claudeWeeklyReset), label: "Claude · weekly" },
    { ...shownMeter("session", sessionFill, USAGE.codexSessionReset, sessionHue), label: "Codex · 5h session" },
    { ...shownMeter("weekly", weeklyFill, USAGE.codexWeeklyReset, weeklyHue), label: "Codex · weekly" },
  ];

  // ---- the hand-off
  const codexFail = interpolate(fi, [F_FAIL, F_FAIL + XFADE], [0, 1], { ...clamp, easing: HOUSE });
  const codexFailLine = interpolate(fi, [F_FAIL_LINE, F_FAIL_LINE + XFADE], [0, 1], { ...clamp, easing: HOUSE });
  const claudeLive = interpolate(fi, [F_LIVE, F_LIVE + XFADE], [0, 1], { ...clamp, easing: HOUSE });
  const roll = interpolate(f, [F_ROLL, F_ROLL + ROLL_LEN], [0, 1], { ...clamp, easing: TRAVEL });
  // the board snapshot that shows the failed run also shows one fewer running
  const running = fi >= F_FAIL && fi < F_LIVE ? 13 : 14;

  // PlanCard fill selectors: card > meters (2nd child) > VolumeMeter n > track (2nd) > fill.
  const cardFill = (n: number) => `.p08-codexcard > div > div:nth-child(2) > div:nth-child(${n}) > div:nth-child(2) > div`;
  const css = `${cardFill(1)}{${fillCss(sessionHue)}}${cardFill(2)}{${fillCss(weeklyHue)}}`;

  return (
    <Column cam={cam} hatchX={clock * HATCH_SPEED} scope="p08-page" css={css}>
      <DockHeader clock={clock} roll={roll} />
      <BoardStrip
        clock={clock}
        running={running}
        codexElapsed={CODEX_ELAPSED_AT_CUT + fi / 30}
        codexFail={codexFail}
        codexFailLine={codexFailLine}
        claudeLive={claudeLive}
        claudeElapsed={Math.max(0, (fi - F_LIVE) / 30)}
      />
      <PlanLimits rows={rows} />
      <PlansSlab
        codexClass="p08-codexcard"
        codex={{
          sessionPct: sessionFill,
          weeklyPct: weeklyFill,
          sessionReset: USAGE.codexSessionReset,
          weeklyReset: USAGE.codexWeeklyReset,
          burns: codexBurns,
          pctOfWeek: codexPct,
          lanes: PLAN_DATA.codexA.lanes,
          machines: PLAN_DATA.codexA.machines,
          lastActivity: `${codexAgo}s ago`,
        }}
        claude={{
          sessionPct: claudeSession,
          weeklyPct: claudeWeekly,
          sessionReset: USAGE.claudeSessionReset,
          weeklyReset: USAGE.claudeWeeklyReset,
          burns: claudeBurns,
          pctOfWeek: claudePct,
          lanes: claudeLanes,
          machines: ca.machines,
          lastActivity: claudeAgo,
        }}
      />
    </Column>
  );
};

// MoveBlur windows (12 samples there, plain frames elsewhere): the three
// camera moves. The opening push and the holds (<= ~2 px/f) render plain.
const MOVES: [number, number][] = [
  [UP.f0, UP.f1],
  [DOWN.f0, DOWN.f1],
  [BACK.f0, BACK.f1],
];

export const BcP08SwitchesConductor: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: MRD.bg }}>
    <MoveBlur moves={MOVES}>
      <Page />
    </MoveBlur>
  </AbsoluteFill>
);

