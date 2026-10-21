import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { CONDUCTORS, EASE, FONT_MONO, MONO, MRD, OS_EASE, PARTS, PLAN_DATA, PLANS, USAGE, sec } from "./theme";
import {
  ConductorEmblem,
  MoveBlur,
  OsIcon,
  PlanCard,
  SeatChip,
  VolumeMeter,
  limitMeterProps,
  meterSweep,
} from "./ui";

// ===========================================================================
// BcP07CodexAt87: 1080x1920 (9:16) @ 30fps, NOT safe-frame wrapped. VO (never
// on screen): "As you can see, Codex is at 87% on the week, as I've been
// using it more than Opus."
//
// One narrow FounderOS column (shared with P08, which imports the pieces
// below so the cut is the same page): the Conductor dock header (06b/07b) as
// its own panel, a Board live strip (04a header + the two Conductor seats),
// the "Plan Limits · official gauges only" SlabCard (01c), then the Plans
// SlabCard (header, chips, the plan cards). A 2D screen-recording camera
// zooms and pans over it.
//
//    0..24   opens tight and already moving on the Plan Limits Codex rows
//            (label side), meters still empty: the page just mounted
//   18..32   the real MeterStack cascade (700ms base, 150ms stagger): Claude
//            5h, Claude weekly, Codex 5h sweep in above the hero row
//   24..45   the camera crosses to the value side, pushing in, as
//   32..68   "Codex" (f34): Codex · weekly sweeps 0 -> 87% on the product's
//            own 1.2s curve (amber, 87 >= 70); camera settled on "87% ·
//            resets in 2d" by "87%" (f44), the fill tip running in under it
//   45..50   holds on the value as the fill runs in under it
//   50..90   slow drift back along the amber fill to "Codex · weekly ... 87%"
//            (hatch drifting; the 10s poll on "week" (f72) creeps Codex 5h
//            60 -> 61%)
//   92..118  "more than Opus" (f98): eases back to the whole Plan Limits
//            card: Claude · weekly 34% stacked over Codex · weekly 87%
//  118..end  near-still hold on the four gauges (the Conductor seats sit at
//            the top edge: Codex running, Opus idle; no token strips in shot)
// End state (P08 opens on it): Codex weekly 87%, session 61%, Claude 20/34,
// Conductor · Codex running 2m31, Conductor · Claude idle, 14 running.
// ===========================================================================

export const BCP07_DURATION = 138;
/** P07's last frame: P08's frame 0 shows exactly this. */
export const P07_LAST = BCP07_DURATION - 1;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const TRAVEL = Easing.bezier(...EASE.travel);
const DECEL = Easing.bezier(...EASE.decel);
const HOUSE = Easing.bezier(...OS_EASE.ease);
// Camera glide: a soft in-out bezier (peak speed 1.6x the average, EASE.travel
// is 2.9x), so moves stay well under the 45 px/f target.
const GLIDE = Easing.bezier(0.37, 0, 0.63, 1);

const W = PARTS.P07.words;
const F_CODEX = sec(W.codex); // 34
const F_WEEK = sec(W.week); // 72
const F_OPUS = sec(W.moreThanOpus); // 98

// ===================================================== the column (shared)
// Page space = css px of the real UI. x 0..COL for every panel.
export const COL = 405; // the captured Plan Limits SlabCard width (01c: 405)
export const PL_H = 345; // Plan Limits SlabCard (capture 01c: 405x344)
const ROW_GAP = 24; // mt-6 between the page's rows
const SLAB_PAD = 16; // .bn-slab padding at a narrow viewport
// Board live strip (BoardLive.svelte head + the seat grid's first rows).
export const BS_H = 206.5;
export const BS_Y = -ROW_GAP - BS_H; // -230.5
const BS_HEAD = 72.5; // py-2.5 + label row 15 + mt-1 + 2 summary lines + border
const SEAT_H = 46;
const SEAT_GAP = 8;
const SEAT_W = COL - 2 - 32; // p-4 inside the 1px border
export const SEAT_Y = { codex: BS_Y + 1 + BS_HEAD + 16, claude: BS_Y + 1 + BS_HEAD + 16 + SEAT_H + SEAT_GAP } as const;
// Conductor dock header (ConductorPanel.svelte <header>, tokens.json 58 tall).
export const DH_H = 58;
export const DH_Y = BS_Y - 16 - DH_H; // -304.5
// Plans SlabCard below Plan Limits (UsageBoard.svelte: SlabCard "Plans").
export const PLANS_Y = PL_H + ROW_GAP; // 369
const PLANS_CARD_Y = 109.25; // pt-5 title, wrapped chips row, pt-4
const CARD_W = COL - 48; // px-6
const CARD_H = 307;
// Plan Limits rows (MeterStack): label row top, 63 apart; track 29..39 below.
export const PL_ROW_Y = (i: number) => 89.5 + i * 63;

// board.ts modelSummary() for the 37 seats with two Conductor seats (the
// string P09's board computes): models holding seats, not who is running.
const MODEL_SUMMARY = "claude-haiku-5-5 x19 · claude-sonnet-5-5 x13 · gpt-6-astra x3 · claude-opus-5-5 x2";
export const FAILURE = "run failed · You've hit your usage limit.";

// Hatch drift (ambient): the stripe layer tiles seamlessly at 12px * sqrt(2)
// horizontally, so it can slide forever. css px per frame (P07 clock).
export const HATCH_P = 12 * Math.SQRT2;
export const HATCH_SPEED = 0.25;
/** The CSS that slides every hatched fill under `scope` by var(--hx). */
export const hatchCss = (scope: string) =>
  `${scope} [style*="repeating-linear-gradient"]{background-size:auto,${HATCH_P}px ${HATCH_P}px !important;background-position:0 0,var(--hx) 0 !important;}`;

const Box: React.FC<{ y: number; h: number; style?: React.CSSProperties; children?: React.ReactNode }> = ({ y, h, style, children }) => (
  <div style={{ position: "absolute", left: 0, top: y, width: COL, height: h, boxSizing: "border-box", ...style }}>{children}</div>
);

// The page slab (bn-slab) around the narrow column, running past every shot.
export const PageSlab: React.FC = () => (
  <div
    style={{
      position: "absolute",
      left: -SLAB_PAD - 1,
      top: -1400,
      width: COL + 2 * (SLAB_PAD + 1),
      height: 4000,
      boxSizing: "border-box",
      border: `1px solid ${MONO.border}`,
      borderRadius: 28,
      background: MONO.bg,
      boxShadow: "0 1px 2px rgb(0 0 0 / .4), 0 24px 70px -18px rgb(0 0 0 / .6)",
    }}
  />
);

export type Row = { label: string; frac: number; display: string; hue: string; sweep?: number };

// SlabCard "Plan Limits · official gauges only" (MeterStack: Claude rows, then Codex rows).
export const PlanLimits: React.FC<{ rows: Row[] }> = ({ rows }) => (
  <Box y={0} h={PL_H} style={{ border: `1px solid ${MONO.border}`, borderRadius: 12, background: MONO.surface }}>
    <div style={{ position: "absolute", left: 24, top: 20, display: "flex", alignItems: "baseline", gap: 8 }}>
      <span style={{ color: MONO.text, fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em" }}>Plan Limits</span>
      <span style={{ color: MONO.text3, fontSize: 12 }}>official gauges only</span>
    </div>
    <div style={{ position: "absolute", left: 24, right: 24, top: 69, borderTop: `1px solid ${MONO.border}` }} />
    {rows.map((r, i) => (
      <div key={r.label} style={{ position: "absolute", left: 24, right: 24, top: PL_ROW_Y(i) }}>
        <VolumeMeter label={r.label} frac={r.frac} display={r.display} hue={r.hue} sweep={r.sweep ?? 1} />
      </div>
    ))}
  </Box>
);

// kit Label: mono 10px bold uppercase, tracking 0.26em, dim.
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontSize: 10, lineHeight: "15px", fontWeight: 700, letterSpacing: "0.26em", textTransform: "uppercase", color: MONO.text3, whiteSpace: "nowrap" }}>
    {children}
  </span>
);

// Stacked seat states, crossfaded (each SeatChip is opaque, so a layer fading
// in over the one below is a clean dissolve).
const SeatStack: React.FC<{ y: number; layers: { key: string; opacity: number; node: React.ReactNode }[] }> = ({ y, layers }) => (
  <div style={{ position: "absolute", left: 16, top: y, width: SEAT_W, height: SEAT_H }}>
    {layers.map((l) =>
      l.opacity <= 0 ? null : (
        <div key={l.key} style={{ position: "absolute", left: 0, top: 0, opacity: l.opacity }}>
          {l.node}
        </div>
      ),
    )}
  </div>
);

export type SeatState = {
  /** shared clock (P07 frame; P08 continues it) for spinners, orbits, LED */
  clock: number;
  running: number;
  codexElapsed: number;
  /** 0..1: Conductor · Codex run failed (border, ✗), then its failure line */
  codexFail: number;
  codexFailLine: number;
  /** 0..1: Conductor · Claude goes live */
  claudeLive: number;
  claudeElapsed: number;
};

// BoardLive.svelte: head (LED, "Board live", seats · running, open board,
// model summary) over the seat grid; here only the two Conductor seats
// (stacked full width at this column width so the model lines read whole).
export const BoardStrip: React.FC<SeatState> = ({ clock, running, codexElapsed, codexFail, codexFailLine, claudeLive, claudeElapsed }) => {
  const cx = CONDUCTORS.codex;
  const cc = CONDUCTORS.claude;
  const led = 0.75 + 0.25 * Math.cos(((clock / 30) % 2) * Math.PI); // animate-pulse 2s
  const top = (y: number) => y - BS_Y - 1;
  return (
    <Box y={BS_Y} h={BS_H} style={{ border: `1px solid ${MONO.border}`, borderRadius: 10, background: MONO.surface }}>
      <div style={{ position: "absolute", left: 16, top: 10, right: 16, height: 15, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 6, height: 6, background: MONO.ok, opacity: led, flexShrink: 0 }} />
        <Label>Board live</Label>
        <span style={{ fontSize: 10, lineHeight: "15px", color: MONO.text3, whiteSpace: "nowrap" }}>{`37 seats · ${running} running`}</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 10, lineHeight: "15px", color: MONO.text3 }}>
          open board <OsIcon name="ArrowUpRight" size={12} />
        </span>
      </div>
      <div style={{ position: "absolute", left: 16, top: 29, width: SEAT_W, fontSize: 10, lineHeight: "16.25px", color: MONO.text2 }}>{MODEL_SUMMARY}</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: BS_HEAD - 1, height: 1, background: MONO.border }} />
      {/* Conductor · Codex: running -> run failed (usage limit) */}
      <SeatStack
        y={top(SEAT_Y.codex)}
        layers={[
          {
            key: "run",
            opacity: 1,
            node: <SeatChip name={cx.name} model={cx.model} adapter={cx.adapter} status="running" frame={clock} elapsedSec={codexElapsed} width={SEAT_W} orbit />,
          },
          { key: "err", opacity: codexFail, node: <SeatChip name={cx.name} model={cx.model} adapter={cx.adapter} status="error" frame={clock} width={SEAT_W} /> },
          {
            key: "errLine",
            opacity: codexFailLine,
            node: <SeatChip name={cx.name} model={cx.model} adapter={cx.adapter} status="error" frame={clock} failure={FAILURE} width={SEAT_W} />,
          },
        ]}
      />
      {/* Conductor · Claude: idle -> running, elapsed from 0s */}
      <SeatStack
        y={top(SEAT_Y.claude)}
        layers={[
          { key: "idle", opacity: 1, node: <SeatChip name={cc.name} model={cc.model} adapter={cc.adapter} status="idle" frame={clock} width={SEAT_W} /> },
          {
            key: "run",
            opacity: claudeLive,
            node: (
              <SeatChip name={cc.name} model={cc.model} adapter={cc.adapter} status="running" frame={clock} elapsedSec={claudeElapsed} width={SEAT_W} orbit orbitPhase={0.9} />
            ),
          },
        ]}
      />
    </Box>
  );
};

// ConductorPanel.svelte model chip: rounded-[6px] border px-1.5 py-px mono 9px
// dim. The model rolls vertically when the board hands the Conductor seat over.
const CHAR = 9 * 0.6; // JetBrains Mono advance at 9px
const ModelChip: React.FC<{ from: string; to: string; p: number }> = ({ from, to, p }) => {
  // the chip opens a touch ahead of the incoming text so the roll never clips it
  const pw = TRAVEL(Math.min(1, p * 1.5));
  const tw = from.length * CHAR + (to.length * CHAR - from.length * CHAR) * pw;
  const lift = 13;
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        flexShrink: 0,
        boxSizing: "border-box",
        width: tw + 14,
        height: 17.5,
        border: `1px solid ${MONO.border}`,
        borderRadius: 6,
        overflow: "hidden",
        fontSize: 9,
        lineHeight: "13.5px",
        color: MONO.text3,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ position: "absolute", left: 6, top: 1, transform: `translateY(${(-p * lift).toFixed(3)}px)`, opacity: 1 - p }}>{from}</span>
      <span style={{ position: "absolute", left: 6, top: 1, transform: `translateY(${((1 - p) * lift).toFixed(3)}px)`, opacity: p }}>{to}</span>
    </span>
  );
};

// The Conductor dock header (capture 06b/07b) as its own panel: emblem,
// CONDUCTOR + model chip, "seeing: Usage", clear, X.
export const DockHeader: React.FC<{ clock: number; roll: number }> = ({ clock, roll }) => (
  <Box
    y={DH_Y}
    h={DH_H}
    style={{
      border: `1px solid ${MONO.borderStrong}`,
      borderRadius: 10,
      background: MONO.bg,
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "12px 16px",
    }}
  >
    <ConductorEmblem size={32} frame={clock} thinking={1} />
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: MONO.text, fontSize: 12.5, fontWeight: 700, letterSpacing: "1.5px", lineHeight: "18.75px" }}>CONDUCTOR</span>
        <ModelChip from={CONDUCTORS.codex.model} to={CONDUCTORS.claude.model} p={roll} />
      </div>
      <div style={{ color: MONO.text3, fontSize: 9.5, lineHeight: "14.25px", letterSpacing: "0.2375px", textTransform: "uppercase", whiteSpace: "nowrap" }}>
        seeing: Usage
      </div>
    </div>
    <span style={{ flexShrink: 0, color: MONO.text3, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 6px" }}>clear</span>
    <span style={{ flexShrink: 0, color: MONO.text3, padding: 4 }}>
      <OsIcon name="X" size={16} />
    </span>
  </Box>
);

// kit chipClass(): rounded-full px-4 py-1.5 text-[12.5px]; on = solid accent, semibold.
const Chip: React.FC<{ on?: boolean; children: React.ReactNode }> = ({ on = false, children }) => (
  <span
    style={{
      borderRadius: 999,
      padding: "6px 16px",
      fontSize: 12.5,
      lineHeight: "18.75px",
      whiteSpace: "nowrap",
      border: `1px solid ${on ? MONO.accent : MONO.border}`,
      background: on ? MONO.accent : "transparent",
      color: on ? MONO.bg : MONO.text2,
      fontWeight: on ? 600 : 400,
    }}
  >
    {children}
  </span>
);

type CardProps = Omit<React.ComponentProps<typeof PlanCard>, "title" | "plan" | "width">;

// SlabCard "Plans · 3 providers" with its chips (wrapped under the title at
// this width), the plan cards stacked in the real order (Claude selected,
// ChatGPT · Codex, Ollama empty). Only the top of it is ever in shot.
export const PlansSlab: React.FC<{ codex: CardProps; claude: CardProps; codexClass?: string }> = ({ codex, claude, codexClass }) => (
  <Box y={PLANS_Y} h={1300} style={{ border: `1px solid ${MONO.border}`, borderRadius: 12, background: MONO.surface }}>
    <div style={{ position: "absolute", left: 24, top: 20, display: "flex", alignItems: "baseline", gap: 8 }}>
      <span style={{ color: MONO.text, fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: "28.5px" }}>Plans</span>
      <span style={{ color: MONO.text3, fontSize: 12 }}>3 providers</span>
    </div>
    <div style={{ position: "absolute", left: 24, top: 60.5, display: "flex", gap: 8 }}>
      <Chip on>Claude</Chip>
      <Chip>ChatGPT · Codex</Chip>
      <Chip>Ollama</Chip>
    </div>
    <div style={{ position: "absolute", left: 24, top: PLANS_CARD_Y, width: CARD_W, display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <PlanCard title={PLANS.claude.title} plan={PLANS.claude.plan} width={CARD_W} selected {...claude} />
      </div>
      <div className={codexClass}>
        <PlanCard title={PLANS.codex.title} plan={PLANS.codex.plan} width={CARD_W} {...codex} />
      </div>
      <div style={{ boxSizing: "border-box", height: CARD_H, borderRadius: 12, border: `1px dashed ${MONO.border}`, padding: 20, fontSize: 12.5, color: MONO.text3 }}>
        <span style={{ color: MONO.text2, fontSize: 15, fontWeight: 600 }}>Ollama</span>
        <p style={{ margin: "8px 0 0" }}>no machine has reported Ollama yet</p>
      </div>
    </div>
  </Box>
);

/** The column's transformed root: camera (cx, cy = page point at the canvas
 * centre 540,960; s = canvas px per css px) and the hatch phase. */
export const Column: React.FC<{ cam: Cam; hatchX: number; scope: string; css?: string; children: React.ReactNode }> = ({
  cam,
  hatchX,
  scope,
  css = "",
  children,
}) => (
  <AbsoluteFill style={{ backgroundColor: MONO.bg, overflow: "hidden" }}>
    <style>{hatchCss(`.${scope}`) + css}</style>
    <div
      className={scope}
      style={
        {
          position: "absolute",
          left: 0,
          top: 0,
          width: COL,
          height: 1,
          transform: `translate(${540 - cam.cx * cam.s}px, ${960 - cam.cy * cam.s}px) scale(${cam.s})`,
          transformOrigin: "0 0",
          fontFamily: FONT_MONO,
          lineHeight: 1.5,
          color: MONO.text,
          "--hx": `${(hatchX % HATCH_P).toFixed(3)}px`,
        } as React.CSSProperties
      }
    >
      <PageSlab />
      {children}
    </div>
  </AbsoluteFill>
);

// ================================================================== camera
export type Cam = { cx: number; cy: number; s: number };
export type Seg = { f0: number; f1: number; to: Cam; ease: (t: number) => number };
/** Piecewise camera: each segment eases from the previous segment's target
 * (log-space zoom so the scale change reads even). */
export const runCam = (start: Cam, segs: Seg[], f: number): Cam => {
  let from = start;
  for (const g of segs) {
    if (f <= g.f1) {
      const p = g.ease(Math.max(0, Math.min(1, (f - g.f0) / (g.f1 - g.f0))));
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
/** page y held at the centre of the Reels safe zone (y 230..1500 -> 865). */
export const atSafe = (y: number, s: number, cx = COL / 2): Cam => ({ cx, cy: y + (960 - 865) / s, s });

// Tight on the Codex · weekly row (label 13.5px, value 14px -> >= 44px on
// canvas: s 3.3 at f0 up to 3.6). The hero row sits in the lower middle of the safe zone
// (canvas ~1100) with the cascade rows above it.
const HERO_Y = PL_ROW_Y(3) + 19.5; // Codex · weekly row centre
const heroAt = (cx: number, s: number, canvasY: number): Cam => ({ cx, cy: HERO_Y - (canvasY - 960) / s, s });
const START = heroAt(126, 3.22, 1070); // virtual, before f0: drifting in
const LABEL_SIDE = heroAt(154, 3.38, 1102); // "Codex · weekly" framed at the left
const VALUE_SIDE = heroAt(256, 3.6, 1110); // "87% · resets in 2d" framed right
// then drifts back along the amber fill until "Codex · weekly" and "87%" share
// the frame (label at the safe edge), just before "more than Opus".
const ALONG_FILL = heroAt(152, 3.58, 1118);
// "more than Opus": the four official gauges, Claude weekly over Codex weekly.
// s 2.53 keeps the 357 css meter rows inside the safe width (x 86..994).
export const P07_END_A = atSafe(PL_H / 2, 2.53);
const P07_END_B: Cam = { cx: COL / 2, cy: P07_END_A.cy - 0.6, s: 2.525 };

const PULL = { f0: F_OPUS - 6, f1: F_OPUS + 20 } as const; // 92..118
// The pan leaves the label side as the cascade reaches Codex 5h and arrives
// on the value side by "87%" (f44), so the readout holds still on the word
// while the fill keeps settling into 87.
const FOLLOW = { f0: F_CODEX - 10, f1: F_CODEX + 11 } as const; // 24..45
const ALONG = { f0: F_CODEX + 16, f1: PULL.f0 - 2 } as const; // 50..90
const SEGS: Seg[] = [
  { f0: -6, f1: FOLLOW.f0, to: LABEL_SIDE, ease: DECEL }, // opens mid-move, settles as the cascade runs
  { f0: FOLLOW.f0, f1: FOLLOW.f1, to: VALUE_SIDE, ease: GLIDE }, // across to the value with the sweep, pushing in
  { f0: FOLLOW.f1, f1: ALONG.f0, to: VALUE_SIDE, ease: TRAVEL }, // holds on 87% while the fill settles
  { f0: ALONG.f0, f1: ALONG.f1, to: ALONG_FILL, ease: GLIDE }, // slow drift back along the fill
  { f0: ALONG.f1, f1: PULL.f0, to: ALONG_FILL, ease: TRAVEL },
  { f0: PULL.f0, f1: PULL.f1, to: P07_END_A, ease: GLIDE }, // "more than Opus"
  { f0: PULL.f1, f1: BCP07_DURATION, to: P07_END_B, ease: TRAVEL }, // end hold, tiny drift
];
export const p07Cam = (f: number) => runCam(START, SEGS, f);

// ================================================================== data
// The page mounts just before f0; VolumeMeter's own entrance (1.2s,
// cubic-bezier(.2,.7,.2,1)) plays on the real delays: PlanCard session 0 /
// weekly 150ms, Plan Limits MeterStack 700ms + i * 150ms. Codex · weekly
// (i = 3) starts at f32, so it is moving on "Codex" (f34).
const MOUNT = F_CODEX - 2 - (0.7 + 3 * 0.15) * 30; // -2.5
const plSweep = (f: number, i: number) => meterSweep(f, MOUNT + (0.7 + i * 0.15) * 30);
// The 10s poll on "week": Codex session 60 -> 61.
const POLL = F_WEEK;
// Conductor · Codex: 2m31 into its run on P07's last frame (P08 continues).
export const CODEX_ELAPSED_AT_CUT = 151;

const Page: React.FC = () => {
  const f = useCurrentFrame();
  const fi = Math.floor(f); // text steps on whole frames (blur sub-samples never smear digits)
  const cam = p07Cam(f);

  const creep = interpolate(fi, [POLL - 2, POLL + 10], [0, 1], { ...clamp, easing: HOUSE });
  const session = USAGE.codexSessionA + creep;
  const sessionM = limitMeterProps("session", Math.round(session), USAGE.codexSessionReset);
  const rows: Row[] = [
    { ...limitMeterProps("session", USAGE.claudeSessionA, USAGE.claudeSessionReset), label: "Claude · 5h session", sweep: plSweep(f, 0) },
    { ...limitMeterProps("weekly", USAGE.claudeWeeklyA, USAGE.claudeWeeklyReset), label: "Claude · weekly", sweep: plSweep(f, 1) },
    { ...sessionM, frac: session / 100, label: "Codex · 5h session", sweep: plSweep(f, 2) },
    { ...limitMeterProps("weekly", USAGE.codexWeeklyA, USAGE.codexWeeklyReset), label: "Codex · weekly", sweep: plSweep(f, 3) },
  ];

  const cardSweep = { sessionSweep: meterSweep(f, MOUNT), weeklySweep: meterSweep(f, MOUNT + 4.5) };
  const cx = PLAN_DATA.codexA;
  const cl = PLAN_DATA.claudeA;
  // "last activity Ns ago": Codex resets when the poll lands, Claude ages.
  const codexAgo = fi < POLL ? 4 + Math.floor((fi + 15) / 30) : Math.floor((fi - POLL) / 30);
  const claudeAgo = 25 + Math.floor((fi + 15) / 30);

  return (
    <Column cam={cam} hatchX={f * HATCH_SPEED} scope="p07-page">
      <DockHeader clock={f} roll={0} />
      <BoardStrip
        clock={f}
        running={14}
        codexElapsed={CODEX_ELAPSED_AT_CUT + (fi - P07_LAST) / 30}
        codexFail={0}
        codexFailLine={0}
        claudeLive={0}
        claudeElapsed={0}
      />
      <PlanLimits rows={rows} />
      <PlansSlab
        codex={{
          sessionPct: session,
          weeklyPct: USAGE.codexWeeklyA,
          sessionReset: USAGE.codexSessionReset,
          weeklyReset: USAGE.codexWeeklyReset,
          burns: cx.burns,
          pctOfWeek: cx.pctOfWeek,
          lanes: cx.lanes,
          machines: cx.machines,
          lastActivity: `${codexAgo}s ago`,
          ...cardSweep,
        }}
        claude={{
          sessionPct: USAGE.claudeSessionA,
          weeklyPct: USAGE.claudeWeeklyA,
          sessionReset: USAGE.claudeSessionReset,
          weeklyReset: USAGE.claudeWeeklyReset,
          burns: cl.burns,
          pctOfWeek: cl.pctOfWeek,
          lanes: cl.lanes,
          machines: cl.machines,
          lastActivity: `${claudeAgo}s ago`,
          ...cardSweep,
        }}
      />
    </Column>
  );
};

// MoveBlur windows (12 samples there, plain frames elsewhere): the opening
// drift, the follow-pan and the pull-back. Holds render plain.
const MOVES: [number, number][] = [
  [0, 14],
  [FOLLOW.f0, FOLLOW.f1],
  [ALONG.f0, ALONG.f1],
  [PULL.f0, PULL.f1],
];

export const BcP07CodexAt87: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: MRD.bg }}>
    <MoveBlur moves={MOVES}>
      <Page />
    </MoveBlur>
  </AbsoluteFill>
);
