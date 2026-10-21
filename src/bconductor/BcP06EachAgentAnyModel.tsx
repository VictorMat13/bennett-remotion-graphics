import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { CONDUCTORS, EASE, FONT_MONO, MONO, MRD, OS_EASE, PARTS, sec } from "./theme";
import { MoveBlur, OsChrome, OsIcon, SeatChip } from "./ui";

// ===========================================================================
// BcP06EachAgentAnyModel: 1080x960 (9:8) @ 30fps, wrapped in the Holo safe
// frame by Root. VO (never on screen): "And I set each agent up with whatever
// model I want. The conductors being Opus 5.5 and GPT-6 Astra."
// Word frames: each agent 12, whatever model 37, model 49, conductors 84,
// Opus 5.5 109-138, GPT-6 Astra 162-189, end 198.
//
// No cursor, no picker (FounderOS sets models on the Paperclip board). The
// result is shown landing across the real Agents page "Board live" panel
// (capture 04 / 04h), laid out at a wide window (like 04h/04j) so every
// "model · adapter" line reads in full. Same seats as P04 (Client Reporting
// left out so the board holds the canon 37); the two Conductors head the first
// column, stacked, so the camera can hold the pair big. The summary line is
// the real modelSummary() of that board: haiku x19 · sonnet x13 · astra x3 ·
// opus x2 (same as P04).
//
// ONE continuous camera, no cuts:
//   -6..14   already moving, settles on the top-left of Board live: header,
//            model summary, stat cells, the two Conductor seats; every seat
//            with no model yet prints the real chip's fallback "unconfigured"
//   12..51   "each agent / whatever model": the seat model lines type on in a
//            diagonal wave (3f per diagonal; "unconfigured" dissolves out over
//            the 4f before), each glyph settling into its tone; the summary
//            line counts up in parallel (tabular)
//   28..50   the camera glides down the first columns with the wave
//   50..82   drifts toward the Conductor column; a 4s board poll lands
//            (DMFlow MCP picks up a run, Stack Monitor's run ends)
//   82..106  "conductors": push in on the stacked Conductor pair (~3.4x,
//            model lines ~30px); f96..106 the rest of the page falls back like
//            depth of field (45% opacity + ~1.8px blur, a camera device, not UI)
//  106..148  "Opus 5.5": a long slow lean (<= 4 px/f) toward Conductor ·
//            Claude while it types claude-opus-5-5 · claude_local and its
//            crown settles to its tone; a lateral drift (98..192, out and
//            back) carries the camera through the turn between the two leans
//            so it never stops (>= ~1 px/f from 106 to 190)
//  136..140  next poll under the pair: Postly's run ends, Stack Monitor starts
//  148..170  "GPT-6 Astra": leans toward Conductor · Codex; it types
//            gpt-6-astra · codex_local and goes live (spinner, timer from 0s,
//            live orbit); "14 running", RUNNING NOW 14
//  174..192  eases back out; the running seats under the pair (Stack Monitor,
//            DMFlow MCP) come back into focus
//  192..210  near-still hold
// ===========================================================================

export const BCP06_DURATION = 210;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const TRAVEL = Easing.bezier(...EASE.travel);
const DECEL = Easing.bezier(...EASE.decel);
const LENS = Easing.bezier(...OS_EASE.lens);
// Camera glide for the push onto the Conductors: a softer in-out than
// EASE.travel (peak speed 1.6x the average instead of 2.9x).
const GLIDE = Easing.bezier(0.37, 0, 0.63, 1);

const W = 1080;
const H = 960;
const NBSP = " ";

// --------------------------------------------------------------- timing
const WD = PARTS.P06.words;
const F = {
  each: sec(WD.eachAgent), // 12
  cond: sec(WD.conductors), // 84
  opus: sec(WD.opus), // 109
  astra: sec(WD.astra), // 162
} as const;

const T = {
  waveStep: 3,
  type: 12,
  claudeType: F.opus + 1, // 110
  codexType: F.astra + 1, // 163
  codexLive: F.astra + 9, // 171
  pollOn: 60, // DMFlow MCP picks up a run
  pollOff: 66, // Stack Monitor's run ends
  poll2Off: 136, // Postly Publisher's run ends
  poll2On: 140, // Stack Monitor picks up its next run
} as const;

// ============================================================ the board
// The real Agents page (capture 04 / 04h) at a wide (2150px) window: chips
// 256px, wide enough for every full "model · adapter" line (04j), 8px
// gutters, the Conductor rail 24px right of the board panel.
const PAGE_W = 2150;
const PAGE_H = 1000;
const CHIP = { w: 256, h: 46, dx: 264, dy: 54, x0: 17, y0: 149.5 } as const;
const PANEL = { x: 306, y: 133, w: CHIP.x0 * 2 + 4 * CHIP.dx + CHIP.w, h: 759 } as const;
const STAT = { y: 73.5, h: 59.2 } as const;
const FEED = { x: 17, y: 612, w: 192, row: 21 } as const;
const LANES = { x: 225, y: 612, w: PANEL.w - 225 - 18 } as const;
const RAIL_X = PANEL.x + PANEL.w + 24;

type Status = "running" | "idle" | "paused";
type SeatRow = { name: string; model: string; adapter: string; status: Status; since?: number };
const sonnet = "claude-sonnet-5-5";
const haiku = "claude-haiku-5-5";
const opus = "claude-opus-5-5";
const astra = "gpt-6-astra";
const CL = "claude_local";
const CX = "codex_local";

// P04's board (capture 04j order, Client Reporting out), timers carried on
// from P04's end (+10s). The two Conductors head the first column, stacked
// (Codex row 0, Claude row 1), so the camera can hold the pair big and
// readable; every other seat keeps P04's order (rows 2+ are identical). Conductor · Codex is between
// heartbeats here and starts its run on "GPT-6 Astra"; Data Agent's run ended
// and Stack Monitor's began in P04.
const BOARD: SeatRow[] = [
  { name: CONDUCTORS.codex.name, model: CONDUCTORS.codex.model, adapter: CONDUCTORS.codex.adapter, status: "idle" },
  { name: "Comms Agent", model: sonnet, adapter: CL, status: "running", since: 83 },
  { name: "Social Agent", model: sonnet, adapter: CL, status: "running", since: 45 },
  { name: "Sales Agent", model: sonnet, adapter: CL, status: "running", since: 76 },
  { name: "Data Agent", model: sonnet, adapter: CL, status: "idle" },
  { name: CONDUCTORS.claude.name, model: CONDUCTORS.claude.model, adapter: CONDUCTORS.claude.adapter, status: "idle" },
  { name: "Client Roster", model: sonnet, adapter: CL, status: "running", since: 30 },
  { name: "Comms Digest", model: sonnet, adapter: CL, status: "running", since: 127 },
  { name: "Brand Deal Agent", model: opus, adapter: CL, status: "running", since: 52 },
  { name: "Newsletter Agent", model: sonnet, adapter: CL, status: "running", since: 226 },
  { name: "Stack Monitor", model: haiku, adapter: CL, status: "running", since: 6 },
  { name: "Postly Publisher", model: haiku, adapter: CL, status: "running", since: 253 },
  { name: "Adsmith Creative", model: sonnet, adapter: CL, status: "idle" },
  { name: "Reelkit Editor", model: sonnet, adapter: CL, status: "running", since: 221 },
  { name: "Renderly Creative", model: sonnet, adapter: CL, status: "idle" },
  { name: "DMFlow MCP", model: haiku, adapter: CL, status: "idle" },
  { name: "Social Pulse", model: haiku, adapter: CL, status: "idle" },
  { name: "Ledger CRM", model: haiku, adapter: CL, status: "running", since: 139 },
  { name: "Sales Calls Data", model: haiku, adapter: CL, status: "idle" },
  { name: "Launchpad Cohort", model: haiku, adapter: CL, status: "idle" },
  { name: "Vantage", model: haiku, adapter: CL, status: "idle" },
  { name: "Vantage PayKit", model: haiku, adapter: CL, status: "idle" },
  { name: "Payments Pulse", model: haiku, adapter: CL, status: "idle" },
  { name: "Stripe", model: haiku, adapter: CL, status: "idle" },
  { name: "PayKit", model: haiku, adapter: CL, status: "idle" },
  { name: "Processor Confirm", model: haiku, adapter: CL, status: "idle" },
  { name: "FlexPay Financing", model: haiku, adapter: CL, status: "idle" },
  { name: "Markdown Auditor", model: astra, adapter: CX, status: "running", since: 172 },
  { name: "Vector Auditor", model: astra, adapter: CX, status: "idle" },
  { name: "Notion Sync", model: haiku, adapter: CL, status: "idle" },
  { name: "Brain Librarian", model: sonnet, adapter: CL, status: "idle" },
  { name: "Gmail Worker", model: haiku, adapter: CL, status: "idle" },
  { name: "WhatsApp Worker", model: haiku, adapter: CL, status: "running", since: 223 },
  { name: "Slack Worker", model: haiku, adapter: CL, status: "paused" },
  { name: "Calendar Worker", model: haiku, adapter: CL, status: "idle" },
  { name: "Onboarding Agent", model: sonnet, adapter: CL, status: "idle" },
  { name: "Client Success", model: sonnet, adapter: CL, status: "idle" },
];
const CODEX_I = 0;
const CLAUDE_I = 5;
const isConductor = (i: number) => i === CODEX_I || i === CLAUDE_I;

// Run state changes inside the part (the board polls every 4s).
type Ev = { at: number; to: Status };
const seatIx = (name: string) => BOARD.findIndex((b) => b.name === name);
const EVENTS: Record<number, Ev[]> = {
  [CODEX_I]: [{ at: T.codexLive, to: "running" }],
  [seatIx("DMFlow MCP")]: [{ at: T.pollOn, to: "running" }],
  [seatIx("Stack Monitor")]: [
    { at: T.pollOff, to: "idle" },
    { at: T.poll2On, to: "running" },
  ],
  [seatIx("Postly Publisher")]: [{ at: T.poll2Off, to: "idle" }],
};
// the latest event at/before frame f (fractional ok), and the status before it
const lastEvent = (i: number, f: number) => {
  const evs = EVENTS[i] ?? [];
  let prev: Status = BOARD[i].status;
  let last: Ev | null = null;
  for (const e of evs) {
    if (f >= e.at) {
      if (last) prev = last.to;
      last = e;
    }
  }
  return { last, prev };
};
const statusAt = (i: number, fi: number): Status => lastEvent(i, fi).last?.to ?? BOARD[i].status;

// When each seat's model line types on: a diagonal wave from the top-left
// (row + col), 3f per diagonal; the Conductors wait for their words.
const typeStart = (i: number) => {
  if (i === CLAUDE_I) return T.claudeType;
  if (i === CODEX_I) return T.codexType;
  const d = Math.floor(i / 5) + (i % 5);
  return F.each + T.waveStep * (d - 1);
};
const modelLine = (i: number) => `${BOARD[i].model} · ${BOARD[i].adapter}`;
// SeatChip.svelte modelLine: `model ?? adapterType ?? 'unconfigured'`. A seat
// whose model is not set yet prints the real fallback, never an empty line.
const UNSET = "unconfigured";
const typedChars = (i: number, fi: number) => {
  const full = modelLine(i);
  const p = interpolate(fi, [typeStart(i), typeStart(i) + T.type], [0, 1], { ...clamp, easing: LENS });
  return Math.round(full.length * p);
};

// board.ts modelSummary(): count per model, by count desc then name. The
// line counts up with the wave (tabular), reaching the board's real summary
// as the last lines land; while counting it keeps the real sort order.
const SUMMARY = (() => {
  const final = new Map<string, number>();
  BOARD.forEach((b) => final.set(b.model, (final.get(b.model) ?? 0) + 1));
  return [...final.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([model, n]) => ({ model, final: n }));
})();
const WAVE_SEATS = BOARD.map((_, i) => i).filter((i) => !isConductor(i));
const summaryAt = (fi: number) => {
  const landed = WAVE_SEATS.filter((i) => fi >= typeStart(i) + 3).length;
  const p = landed / WAVE_SEATS.length;
  const counts = SUMMARY.map((e) => Math.round(e.final * p));
  // never let a later entry tie/overtake an earlier one (that would re-sort)
  for (let k = 1; k < counts.length; k++) {
    const before = SUMMARY[k].model.localeCompare(SUMMARY[k - 1].model) < 0;
    const cap = before ? counts[k - 1] - 1 : counts[k - 1];
    counts[k] = Math.max(0, Math.min(counts[k], cap));
  }
  // reflowed columns (chars) of each visible entry, separator included
  let col = 0;
  const cols = counts.map((n, k) => {
    if (n < 1) return null;
    const c = col;
    col += (c > 0 ? 3 : 0) + `${SUMMARY[k].model} x${n}`.length;
    return c;
  });
  return { counts, cols };
};
const SUMMARY_FRAMES = Array.from({ length: BCP06_DURATION + 40 }, (_, fi) => summaryAt(fi));
const summaryFrame = (fi: number) => SUMMARY_FRAMES[Math.max(0, Math.min(SUMMARY_FRAMES.length - 1, fi))];
const SUMMARY_IN = SUMMARY.map((_, k) => SUMMARY_FRAMES.findIndex((s) => s.counts[k] >= 1));

const runningAt = (fi: number) => BOARD.filter((_, i) => statusAt(i, fi) === "running").length;

const STATS: [string, (fi: number) => number][] = [
  ["Seats", () => BOARD.length],
  ["Running now", runningAt],
  ["Open tasks", () => 21],
  ["Runs · 24h", () => 35],
  ["Heartbeats · 24h", () => 33],
];

const ago = (s: number) => (s < 60 ? `${Math.floor(s)}s ago` : `${Math.floor(s / 60)}m ago`);

// Task lanes as captured (04h): status, count, first cards (title, owner).
const LANE_ROWS: { status: string; dot: string; count: number; cards: [string, string][] }[] = [
  {
    status: "in progress",
    dot: MONO.ok,
    count: 9,
    cards: [
      ["Cut the sales-call highlight reel", "Reelkit Editor"],
      ["Schedule this week's cross-platform posts", "Postly Publisher"],
    ],
  },
  {
    status: "in review",
    dot: MONO.warn,
    count: 3,
    cards: [
      ["Draft 3 IG hooks for the Vantage launch", "Social Agent"],
      ["Generate 5 UGC variants for the new offer", "Adsmith Creative"],
    ],
  },
  {
    status: "todo",
    dot: MONO.text2,
    count: 8,
    cards: [
      ["Triage overnight inbound across 4 inboxes", "Comms Agent"],
      ["Follow up on 6 unreplied warm leads", "Gmail Worker"],
    ],
  },
  { status: "blocked", dot: MONO.err, count: 1, cards: [["Connect the Slack workspace digest", "Slack Worker"]] },
  {
    status: "done",
    dot: MONO.text3,
    count: 16,
    cards: [
      ["Send the Vantage proposal follow-up", "Gmail Worker"],
      ["Publish the Tuesday carousel", "Social Agent"],
    ],
  },
];

const mix = (c: string, pct: number, other = "transparent") => `color-mix(in oklab, ${c} ${pct}%, ${other})`;

const Box: React.FC<{ x: number; y: number; w: number; h: number; style?: React.CSSProperties; children?: React.ReactNode }> = ({
  x,
  y,
  w,
  h,
  style,
  children,
}) => <div style={{ position: "absolute", left: x, top: y, width: w, height: h, boxSizing: "border-box", ...style }}>{children}</div>;

// kit/Label.svelte
const Label: React.FC<{ x: number; y: number; children: React.ReactNode }> = ({ x, y, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      fontSize: 10,
      lineHeight: "15px",
      fontWeight: 700,
      letterSpacing: "0.26em",
      textTransform: "uppercase",
      color: MONO.text3,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </div>
);

// One seat: its model line types on, its glyph settles from muted into its
// tone, and a run state change crossfades (the real chip re-renders on poll).
const Seat: React.FC<{ i: number; f: number; focus?: React.CSSProperties }> = ({ i, f, focus }) => {
  const fi = Math.floor(f);
  const b = BOARD[i];
  const row = Math.floor(i / 5);
  const col = i % 5;
  const t0 = typeStart(i);
  const typed = modelLine(i).slice(0, typedChars(i, fi));
  // "unconfigured" until the model is set: it dissolves out over the 4f
  // before the model line types in (a crossfade of the same chip, so only
  // the line changes)
  const unset = 1 - interpolate(f, [t0 - 4, t0], [0, 1], { ...clamp, easing: LENS });
  const line = typed.length ? typed : unset >= 1 ? UNSET : NBSP;
  const settle = interpolate(fi, [t0 + 2, t0 + 11], [0, 1], { ...clamp, easing: LENS });
  const { last, prev } = lastEvent(i, f);
  const x = last ? interpolate(f, [last.at, last.at + 6], [0, 1], { ...clamp, easing: LENS }) : 1;
  const from: Status = last ? prev : b.status;
  const to: Status = last ? last.to : b.status;
  const elapsedFor = (status: Status) => {
    if (status !== "running") return null;
    const started = [...(EVENTS[i] ?? [])].reverse().find((e) => e.to === "running" && fi >= e.at);
    if (started) return Math.max(0, (fi - started.at) / 30);
    return (b.since ?? 0) + fi / 30;
  };
  const chip = (status: Status, model = line) => (
    <SeatChip
      name={b.name}
      model={model}
      status={status}
      frame={f + i * 7}
      elapsedSec={elapsedFor(status)}
      width={CHIP.w}
      orbit={status === "running"}
      orbitPhase={i * 0.37}
    />
  );
  const shown = x >= 0.5 ? to : from;
  return (
    <div
      style={{
        position: "absolute",
        left: CHIP.x0 + col * CHIP.dx,
        top: CHIP.y0 + row * CHIP.dy,
        width: CHIP.w,
        height: CHIP.h,
        ...focus,
      }}
    >
      {x < 1 ? <div style={{ position: "absolute", inset: 0 }}>{chip(from)}</div> : null}
      {x > 0 ? <div style={{ position: "absolute", inset: 0, opacity: x }}>{chip(to)}</div> : null}
      {unset > 0 && unset < 1 && !typed.length ? (
        <div style={{ position: "absolute", inset: 0, opacity: unset }}>{chip(shown, UNSET)}</div>
      ) : null}
      {settle < 1 ? (
        // the same chip, desaturated and dimmed, clipped to the glyph: fades
        // out as the line lands (the dim layer is the chip's own bg, so only
        // the glyph strokes change)
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 1 - settle,
            clipPath: "inset(7px calc(100% - 29px) calc(100% - 29px) 7px)",
          }}
        >
          <div style={{ position: "absolute", inset: 0, filter: "grayscale(1)" }}>{chip(shown)}</div>
          <div style={{ position: "absolute", inset: 0, background: MONO.bg, opacity: 0.45 }} />
        </div>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------- focus (camera device)
// As the camera lands on the two Conductors, everything else on the page
// falls back like depth of field: 45% opacity + a slight blur (about 1.8px on
// screen, quantized to 0.25px steps). Not UI: no glow, no outline. For the
// end hold the running seats right under the Conductors come back up.
const FOCUS = { in0: 96, in1: 106, out0: 180, out1: 192, dim: 0.55, blurPx: 1.8 } as const;
const focusAmount = (f: number) => interpolate(f, [FOCUS.in0, FOCUS.in1], [0, 1], { ...clamp, easing: LENS });
const focusStyle = (amount: number, camS: number): React.CSSProperties | undefined => {
  if (amount <= 0) return undefined;
  const screenBlur = Math.round((amount * FOCUS.blurPx) / 0.25) * 0.25;
  return {
    opacity: 1 - FOCUS.dim * amount,
    filter: screenBlur > 0 ? `blur(${(screenBlur / camS).toFixed(3)}px)` : undefined,
  };
};
// seats under the Conductors (column 0) that are running come back for the end
const backInFocus = (i: number, fi: number) => i % 5 === 0 && Math.floor(i / 5) >= 2 && statusAt(i, fi) === "running";

const BoardPage: React.FC<{ f: number; camS: number }> = ({ f, camS }) => {
  const fi = Math.floor(f);
  const fa = focusAmount(f);
  const dim = focusStyle(fa, camS);
  const back = interpolate(f, [FOCUS.out0, FOCUS.out1], [0, 1], { ...clamp, easing: LENS });
  const t = fi / 30;
  const led = 0.75 + 0.25 * Math.cos(((f / 30) % 2) * Math.PI); // animate-pulse 2s
  const breathe = 0.5 - 0.5 * Math.cos((((f / 30) % 1.5) / 1.5) * 2 * Math.PI); // bn-task-breathe 1.5s
  const running = runningAt(fi);
  const runningNames = new Set(BOARD.filter((_, i) => statusAt(i, fi) === "running").map((b) => b.name));

  // run feed: running seats, newest first (as captured)
  const feed = BOARD.map((b, i) => ({ b, i }))
    .filter(({ i }) => statusAt(i, fi) === "running")
    .map(({ b, i }) => {
      const started = [...(EVENTS[i] ?? [])].reverse().find((e) => e.to === "running" && fi >= e.at);
      const startedSec = started ? (fi - started.at) / 30 : (b.since ?? 0) + t;
      return { name: b.name, startedSec };
    })
    .sort((a, b) => a.startedSec - b.startedSec);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: PAGE_W,
        height: PAGE_H,
        background: MONO.bg,
        fontFamily: FONT_MONO,
        color: MONO.text,
      }}
    >
      {/* the slab + Roster SlabCard + AgentsTabs (fall back with the focus) */}
      <div style={{ position: "absolute", inset: 0, ...dim }}>
        <Box
          x={256}
          y={52}
          w={PAGE_W - 256 - 26}
          h={890}
          style={{ border: `1px solid ${MONO.border}`, borderRadius: 28, background: MONO.bg }}
        />
        <Box
          x={285.6}
          y={65}
          w={PAGE_W - 285.6 - 54}
          h={848}
          style={{ border: `1px solid ${MONO.border}`, borderRadius: 20, background: MONO.bg }}
        />
        {/* AgentsTabs */}
        <Box x={306} y={115} w={600} h={1} style={{ background: MONO.border }} />
        {(["Roster", "Needs you", "Deliverables", "Hermes"] as const).map((label, k) => (
          <div
            key={label}
            style={{
              position: "absolute",
              left: 306 + k * 150,
              top: 90,
              width: 150,
              height: 19,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: k === 0 ? MONO.text : MONO.text3,
            }}
          >
            {label}
            {k === 1 ? (
              <span
                style={{
                  display: "inline-grid",
                  placeItems: "center",
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  background: MONO.warn,
                  color: MONO.bg,
                  fontSize: 9.5,
                  letterSpacing: 0,
                }}
              >
                2
              </span>
            ) : null}
          </div>
        ))}
        <Box x={306} y={113.5} w={150} h={2} style={{ background: MONO.text }} />
      </div>

      {/* Board live: the panel shell, then its content in focus groups */}
      <Box
        x={PANEL.x}
        y={PANEL.y}
        w={PANEL.w}
        h={PANEL.h}
        style={{ border: `1px solid ${MONO.border}`, borderRadius: 10, background: MONO.surface, ...dim }}
      />
      <Box x={PANEL.x} y={PANEL.y} w={PANEL.w} h={PANEL.h}>
        <div style={{ position: "absolute", inset: 0, ...dim }}>
          <div style={{ position: "absolute", left: 17, top: 15.5, width: 6, height: 6, background: MONO.ok, opacity: led }} />
          <Label x={34.5} y={10}>
            Board live
          </Label>
          <div
            style={{
              position: "absolute",
              left: 133,
              top: 10,
              fontSize: 10,
              lineHeight: "15px",
              color: MONO.text3,
              whiteSpace: "nowrap",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {`${BOARD.length} seats · ${running} running`}
          </div>
          <div
            style={{
              position: "absolute",
              right: 17,
              top: 10,
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              lineHeight: "15px",
              color: MONO.text3,
            }}
          >
            open board <OsIcon name="ArrowUpRight" size={12} />
          </div>
          {/* model summary: counts tick (tabular); when an entry widens, the
            entries after it slide over (eased, 3f) instead of jumping */}
          <div style={{ position: "absolute", left: 17, top: 29, height: 16.25, width: 900 }}>
            {SUMMARY.map((e, k) => {
              const now = summaryFrame(fi);
              const n = now.counts[k];
              const c = now.cols[k];
              if (n < 1 || c == null) return null;
              const hist = [0, 1, 2].map((d) => summaryFrame(fi - d).cols[k] ?? c);
              const sx = (hist[0] * 0.5 + hist[1] * 0.3 + hist[2] * 0.2) * 6;
              const op = interpolate(f, [SUMMARY_IN[k], SUMMARY_IN[k] + 5], [0, 1], { ...clamp, easing: LENS });
              return (
                <span
                  key={e.model}
                  style={{
                    position: "absolute",
                    left: sx,
                    top: 0,
                    fontSize: 10,
                    lineHeight: "16.25px",
                    color: MONO.text2,
                    whiteSpace: "pre",
                    fontVariantNumeric: "tabular-nums",
                    opacity: op,
                  }}
                >
                  {`${c > 0 ? " · " : ""}${e.model} x${n}`}
                </span>
              );
            })}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 56, height: 1, background: MONO.border }} />

          {/* stat cells */}
          {STATS.map(([label, value], k) => (
            <div
              key={label}
              style={{
                position: "absolute",
                left: CHIP.x0 + k * CHIP.dx,
                top: STAT.y,
                width: CHIP.w,
                height: STAT.h,
                boxSizing: "border-box",
                border: `1px solid ${MONO.border}`,
                borderRadius: 6,
                background: MONO.bg,
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div
                style={{
                  minHeight: "1.6em",
                  fontSize: 9.5,
                  fontWeight: 700,
                  lineHeight: 1.3,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: MONO.text3,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                {value(fi)}
              </div>
            </div>
          ))}
        </div>

        {/* seat grid: the two Conductors stay crisp */}
        {BOARD.map((_, i) => (
          <Seat key={i} i={i} f={f} focus={isConductor(i) ? undefined : backInFocus(i, fi) ? focusStyle(fa * (1 - back), camS) : dim} />
        ))}

        <div style={{ position: "absolute", inset: 0, ...dim }}>
          {/* run feed */}
          <Label x={FEED.x} y={FEED.y - 23}>
            Run feed
          </Label>
          <div style={{ position: "absolute", left: FEED.x, top: FEED.y, width: FEED.w, height: 150, overflow: "hidden" }}>
            {feed.map((r, k) => (
              <div
                key={r.name}
                style={{
                  position: "absolute",
                  left: 0,
                  top: k * FEED.row,
                  width: FEED.w,
                  height: 17,
                  boxSizing: "border-box",
                  padding: "2px 4px",
                  display: "flex",
                  alignItems: "baseline",
                  gap: 6,
                  fontSize: 9.5,
                  lineHeight: "13px",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ fontWeight: 700, color: MONO.ok }}>▸</span>
                <span style={{ color: MONO.text, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
                <span style={{ color: MONO.ok }}>running</span>
                <span style={{ color: MONO.text3, flexShrink: 0 }}>{ago(r.startedSec)}</span>
              </div>
            ))}
          </div>

          {/* task lanes */}
          <Label x={LANES.x} y={FEED.y - 23}>
            Task lanes
          </Label>
          {LANE_ROWS.map((lane, li) => {
            const lw = (LANES.w - 4 * 12) / 5;
            const lx = LANES.x + li * (lw + 12);
            return (
              <div key={lane.status} style={{ position: "absolute", left: lx, top: LANES.y, width: lw }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    height: 13.5,
                    marginBottom: 6,
                    fontSize: 9,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: MONO.text3,
                    paddingRight: 4,
                  }}
                >
                  <span style={{ width: 4, height: 4, background: lane.dot, flexShrink: 0 }} />
                  <span>{lane.status}</span>
                  <span style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>{lane.count}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingRight: 4 }}>
                  {lane.cards.map(([title, owner]) => {
                    const live = runningNames.has(owner);
                    return (
                      <div
                        key={title}
                        style={{
                          boxSizing: "border-box",
                          borderRadius: 6,
                          padding: "6px 8px",
                          border: `1px solid ${live ? mix(MONO.ok, 30 + 70 * breathe, MONO.border) : MONO.border}`,
                          background: live ? mix(MONO.ok, 9 * breathe) : "transparent",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10.5,
                            lineHeight: 1.375,
                            color: MONO.text,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {title}
                        </div>
                        <div style={{ marginTop: 2, display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: MONO.text3 }}>
                          <span
                            style={{
                              width: 4,
                              height: 4,
                              flexShrink: 0,
                              background: live ? MONO.ok : MONO.text2,
                              opacity: live ? 0.35 + 0.65 * breathe : 1,
                            }}
                          />
                          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{owner}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Box>

      <div style={{ position: "absolute", inset: 0, ...dim }}>
        {/* Conductor rail (capture 04e); its fixture chat is blurred past reading */}
        <div style={{ position: "absolute", left: RAIL_X - 4, top: PANEL.y - 4, width: 408, height: 769, overflow: "hidden" }}>
          <Img src={staticFile("bconductor/reference/04e-conductor-rail-stateA.png")} style={{ width: 408, height: 769 }} />
          <div style={{ position: "absolute", left: 14, top: 76, width: 380, height: 160, overflow: "hidden" }}>
            <Img
              src={staticFile("bconductor/reference/04e-conductor-rail-stateA.png")}
              style={{ position: "absolute", left: -14, top: -76, width: 408, height: 769, filter: "blur(7px)" }}
            />
          </div>
        </div>

        {/* sticky chrome (real crops); the topbar runs on to the window edge */}
        <Box x={1600} y={0} w={PAGE_W - 1600} h={52} style={{ background: MONO.bg, borderBottom: `1px solid ${MONO.border}` }} />
        <OsChrome page="agents" />
      </div>
    </div>
  );
};

// ================================================================ camera
// Screen-recording camera over the page (css px): hold -> move -> hold, the
// holds drift. Long moves bow the zoom out a little so the travel stays calm.
type Cam = { cx: number; cy: number; s: number };
type Seg = { f0: number; f1: number; to: Cam; ease: (t: number) => number; bow?: number };

const C0: Cam = { cx: 505, cy: 395, s: 1.9 };
// The two-shot: both seat columns (and the whole summary line) edge to edge.
const L: Cam = { cx: 583, cy: 364, s: 2.04 }; // header + summary + Conductors
const L2: Cam = { cx: 583, cy: 366, s: 2.045 };
const M: Cam = { cx: 583, cy: 506, s: 2.04 }; // down the first two columns with the wave
const M2: Cam = { cx: 495, cy: 425, s: 2.2 }; // eases toward the Conductor column
// "conductors": push in on the stacked pair (column 0, rows 0-1, centre 451,332)
const K1: Cam = { cx: 451, cy: 332, s: 3.4 };
const KO: Cam = { cx: 451, cy: 355, s: 3.5 }; // leans toward Conductor · Claude
const KA: Cam = { cx: 451, cy: 312, s: 3.6 }; // leans toward Conductor · Codex
const KA2: Cam = { cx: 451, cy: 311, s: 3.61 };
const E: Cam = { cx: 452, cy: 371, s: 2.8 }; // eases out: running seats come back under the pair
const E2: Cam = { cx: 452, cy: 370, s: 2.81 };

const SEGS: Seg[] = [
  { f0: -6, f1: 14, to: L, ease: DECEL },
  { f0: 14, f1: 28, to: L2, ease: TRAVEL },
  { f0: 28, f1: 50, to: M, ease: TRAVEL },
  { f0: 50, f1: F.cond - 2, to: M2, ease: TRAVEL },
  { f0: F.cond - 2, f1: F.cond + 22, to: K1, ease: GLIDE },
  { f0: F.cond + 22, f1: 148, to: KO, ease: GLIDE },
  { f0: 148, f1: 170, to: KA, ease: TRAVEL },
  { f0: 170, f1: 174, to: KA2, ease: TRAVEL },
  { f0: 174, f1: 192, to: E, ease: TRAVEL },
  { f0: 192, f1: BCP06_DURATION + 2, to: E2, ease: TRAVEL },
];

// Under the two leans onto the pair, a slow lateral drift (page css px, out
// to +16 by f128 and back by f192, GLIDE both ways) so the camera keeps
// moving through the turn between "Opus 5.5" and "GPT-6 Astra": from f106 to
// f190 the frame never moves slower than ~1 px/f, and f132..149 stays <= ~3.3.
const DRIFT = { f0: 98, peak: 128, f1: 192, dx: 16 } as const;
const driftX = (f: number) => {
  if (f <= DRIFT.f0 || f >= DRIFT.f1) return 0;
  return f <= DRIFT.peak
    ? DRIFT.dx * GLIDE((f - DRIFT.f0) / (DRIFT.peak - DRIFT.f0))
    : DRIFT.dx * (1 - GLIDE((f - DRIFT.peak) / (DRIFT.f1 - DRIFT.peak)));
};

const camAt = (f: number): Cam => {
  let from = C0;
  for (const g of SEGS) {
    if (f <= g.f1) {
      const p = g.ease(Math.max(0, Math.min(1, (f - g.f0) / (g.f1 - g.f0))));
      const s = Math.exp(Math.log(from.s) + (Math.log(g.to.s) - Math.log(from.s)) * p) * (1 - (g.bow ?? 0) * Math.sin(Math.PI * p));
      return { cx: from.cx + (g.to.cx - from.cx) * p + driftX(f), cy: from.cy + (g.to.cy - from.cy) * p, s };
    }
    from = g.to;
  }
  return from;
};

const Scene: React.FC = () => {
  const f = useCurrentFrame();
  const c = camAt(f);
  return (
    <AbsoluteFill style={{ backgroundColor: MONO.bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: `translate(${W / 2 - c.cx * c.s}px, ${H / 2 - c.cy * c.s}px) scale(${c.s})`,
          transformOrigin: "0 0",
        }}
      >
        <BoardPage f={f} camS={c.s} />
      </div>
    </AbsoluteFill>
  );
};

// MoveBlur windows (12 samples there, plain frames elsewhere): the opening
// settle, the glide down the columns, the drift to the Conductor column, the
// push onto the pair, the lean to Codex and the ease back out. The leans and
// drifts in the holds (<= 9 px/f) render plain. Every move peaks <= 55 px/f.
const MOVES: [number, number][] = [
  [0, 6],
  [28, 50],
  [50, F.cond - 2],
  [F.cond - 2, F.cond + 22],
  [148, 170],
  [174, 192],
];

export const BcP06EachAgentAnyModel: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: MRD.bg }}>
    <MoveBlur moves={MOVES}>
      <Scene />
    </MoveBlur>
  </AbsoluteFill>
);
