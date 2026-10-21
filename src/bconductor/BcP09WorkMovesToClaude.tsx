import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { CONDUCTORS, EASE, FONT_MONO, MONO, MRD, OS_EASE, PLAN_DATA, PLANS, USAGE } from "./theme";
import { MoveBlur, OsChrome, OsIcon, PlanCard, SeatChip } from "./ui";

// ===========================================================================
// BcP09WorkMovesToClaude: 1080x960 (9:8) @ 30fps, wrapped in the Holo safe
// frame by Root. VO (never on screen): "And the work just moves over to my
// Claude plan and the agents don't even notice."
// Word frames: work 21, moves over 43, Claude plan 75-93, agents 109,
// don't even notice 117-150.
//
// ONE world: the real Agents page in state C (capture 05*, at P04's 1950px
// window so it is the same board object: chips 216 wide, 5 columns), with
// the two PlanCards (state C) lifted over the board's right side (seat
// columns 3-4, idle rows 3-7), Claude in front with the product's own pop
// shadow, Codex dimmed behind it at 100% red. The cards ride a touch nearer
// the lens (parallax) so they read as a layer over the board.
//
//    0..22   opens mid-move on the board: stat cells, both Conductor seats
//            (column 0: Codex red ✗, Claude live on claude-opus-5-5 below it)
//            and the running seats; the camera scrolls down the left of the grid
//   22..41   settles on the run feed + bottom rows (slow push); the 4s board
//            poll lands (f38): Gmail Worker + Onboarding Agent start
//            ("running 0s ago" rows land on top of the feed), Comms Digest's
//            run finishes (✓)
//   41..74   "moves over": van Wijk zoom-pan across the board to the cards
//            (Codex dims, Claude lifts on the way in)
//   74..97   "Claude plan": the usage poll lands (f75): session 33 -> 36,
//            weekly 41 -> 43, the Agent board lane widens, the window strip
//            counts up (tabular), last activity resets
//   97..142  "agents / don't even notice": one van Wijk glide back across the
//            board and in on the two Conductors (Claude on claude-opus-5-5,
//            timer ticking, orbit going) with Client Roster running beside
//            them and the stat cells on top; the next poll (f126) lands:
//            Sales Agent finishes, RUNNING NOW 15 -> 14
//  142..165  near-still hold
// Every camera move peaks <= 70 px/frame on the 1080 canvas (GLIDE ease).
//
// Seat timers tick every second for the whole part and never reset (the
// SeatChip's own 1s clock); feed stamps update on the polls (BoardLive
// re-renders on each poll, as the product does).
// ===========================================================================

export const BCP09_DURATION = 165;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const TRAVEL = Easing.bezier(...EASE.travel);
const DECEL = Easing.bezier(...EASE.decel);
const HOUSE = Easing.bezier(...OS_EASE.ease);
const LENS = Easing.bezier(...OS_EASE.lens);
const METER = Easing.bezier(...OS_EASE.meterIn);
// kit/format.ts countFrame(): 1 - (1 - t)^3 (CountUp, 900ms)
const COUNT = Easing.bezier(0.33, 1, 0.68, 1);
// Camera glide for the long moves: a softer in-out than EASE.travel (its peak
// speed is 1.6x the average instead of 2.9x), so a long move stays smooth.
const GLIDE = Easing.bezier(0.37, 0, 0.63, 1);

const W = 1080;
const H = 960;

// P08 ends on its frame 224; this part's frame 0 is P08's 225.
const P08_NEXT = 225;

// ------------------------------------------------------------------ timing
const T = {
  poll1: 38, // board poll: two runs start, one finishes
  usage: 75, // usage poll on "Claude plan"
  poll2: 126, // board poll: one run finishes
  lift0: 50,
  lift1: 70,
} as const;
// the board polls this part shows (the one before f0 sets the feed stamps)
const POLLS = [-40, T.poll1, T.poll2] as const;
const XF = 6; // seat / feed-row state crossfade

// ============================================================ the board
// The real Agents page at P04's 1950px window (same rows, same geometry).
const PAGE_W = 1950;
const PANEL = { x: 306, y: 133, w: 1146, h: 759 } as const;
const CHIP = { w: 216, h: 46, dx: 224, dy: 54, x0: 17, y0: 149.5 } as const;
const STAT = { y: 73.5, h: 59.2 } as const;
// the feed and the lanes scroll inside the panel (p-4): clipped at y 743
const FEED = { x: 17, y: 612, w: 192, row: 21, h: 131 } as const;
const LANES = { x: 225, y: 612, w: 903 } as const;
const RAIL_X = PANEL.x + PANEL.w + 24; // 1476

const sonnet = "claude-sonnet-5-5";
const haiku = "claude-haiku-5-5";
const opus = "claude-opus-5-5";
const astra = "gpt-6-astra";
const FAILURE = "run failed · You've hit your usage limit.";

// started `s` seconds before frame 0 (timers as captured in 05j, state C)
const ago0 = (s: number) => -Math.round(s * 30);

type SeatDef = {
  name: string;
  model: string;
  adapter: string;
  /** status when it has no open run */
  rest: "idle" | "paused" | "error";
  /** frame its current run started (negative = before f0) */
  startF?: number;
  /** frame that run finished (the board shows it on the next poll) */
  endF?: number;
  failure?: string;
};

// P04's board order (capture 04j: the Conductor seat is two Conductors,
// stacked at the head of column 0 (Codex row 0, Claude row 1, as in P04 and
// P06); Client Reporting left out so the board holds the canon 37), in state C:
// the Codex Conductor's run hit the limit, the Claude Conductor runs on
// Opus (started at P08 f80), Markdown Auditor idle, Adsmith running.
const BOARD: SeatDef[] = [
  { name: CONDUCTORS.codex.name, model: CONDUCTORS.codex.model, adapter: CONDUCTORS.codex.adapter, rest: "error", failure: FAILURE },
  { name: "Comms Agent", model: sonnet, adapter: "claude_local", rest: "idle", startF: ago0(73) },
  { name: "Social Agent", model: sonnet, adapter: "claude_local", rest: "idle", startF: ago0(35) },
  { name: "Sales Agent", model: sonnet, adapter: "claude_local", rest: "idle", startF: ago0(147), endF: T.poll2 - 15 },
  { name: "Data Agent", model: sonnet, adapter: "claude_local", rest: "idle", startF: ago0(66) },
  { name: CONDUCTORS.claude.name, model: CONDUCTORS.claude.model, adapter: CONDUCTORS.claude.adapter, rest: "idle", startF: 80 - P08_NEXT },
  { name: "Client Roster", model: sonnet, adapter: "claude_local", rest: "idle", startF: ago0(101) },
  // its 21s run finishes just before the f38 poll (the ✓ lands in the feed)
  { name: "Comms Digest", model: sonnet, adapter: "claude_local", rest: "idle", startF: ago0(20), endF: T.poll1 - 9 },
  { name: "Brand Deal Agent", model: opus, adapter: "claude_local", rest: "idle", startF: ago0(117) },
  { name: "Newsletter Agent", model: sonnet, adapter: "claude_local", rest: "idle", startF: ago0(42) },
  { name: "Stack Monitor", model: haiku, adapter: "claude_local", rest: "idle" },
  { name: "Postly Publisher", model: haiku, adapter: "claude_local", rest: "idle", startF: ago0(215) },
  { name: "Adsmith Creative", model: sonnet, adapter: "claude_local", rest: "idle", startF: ago0(243) },
  { name: "Reelkit Editor", model: sonnet, adapter: "claude_local", rest: "idle", startF: ago0(211) },
  { name: "Renderly Creative", model: sonnet, adapter: "claude_local", rest: "idle" },
  { name: "DMFlow MCP", model: haiku, adapter: "claude_local", rest: "idle" },
  { name: "Social Pulse", model: haiku, adapter: "claude_local", rest: "idle" },
  { name: "Ledger CRM", model: haiku, adapter: "claude_local", rest: "idle", startF: ago0(129) },
  { name: "Sales Calls Data", model: haiku, adapter: "claude_local", rest: "idle" },
  { name: "Launchpad Cohort", model: haiku, adapter: "claude_local", rest: "idle" },
  { name: "Vantage", model: haiku, adapter: "claude_local", rest: "idle" },
  { name: "Vantage PayKit", model: haiku, adapter: "claude_local", rest: "idle" },
  { name: "Payments Pulse", model: haiku, adapter: "claude_local", rest: "idle" },
  { name: "Stripe", model: haiku, adapter: "claude_local", rest: "idle" },
  { name: "PayKit", model: haiku, adapter: "claude_local", rest: "idle" },
  { name: "Processor Confirm", model: haiku, adapter: "claude_local", rest: "idle" },
  { name: "FlexPay Financing", model: haiku, adapter: "claude_local", rest: "idle" },
  { name: "Markdown Auditor", model: astra, adapter: "codex_local", rest: "idle" },
  { name: "Vector Auditor", model: astra, adapter: "codex_local", rest: "idle" },
  { name: "Notion Sync", model: haiku, adapter: "claude_local", rest: "idle" },
  { name: "Brain Librarian", model: sonnet, adapter: "claude_local", rest: "idle" },
  // starts on the f38 poll (its run began 0.6s before that poll)
  { name: "Gmail Worker", model: haiku, adapter: "claude_local", rest: "idle", startF: T.poll1 - 18 },
  { name: "WhatsApp Worker", model: haiku, adapter: "claude_local", rest: "idle", startF: ago0(162) },
  { name: "Slack Worker", model: haiku, adapter: "claude_local", rest: "paused" },
  { name: "Calendar Worker", model: haiku, adapter: "claude_local", rest: "idle" },
  // starts on the f38 poll too (0.2s before it)
  { name: "Onboarding Agent", model: sonnet, adapter: "claude_local", rest: "idle", startF: T.poll1 - 6 },
  { name: "Client Success", model: sonnet, adapter: "claude_local", rest: "idle" },
];

// The Codex Conductor's failed run (P08: 2m31 in at P08 f0, failed at P08 f70).
const P08_FAIL = 70;
const CODEX_FAIL_END = P08_FAIL - P08_NEXT;
const CODEX_FAIL_START = CODEX_FAIL_END - Math.round((151 + P08_FAIL / 30) * 30);

// The poll a frame sees (the board snapshot on screen), and the one before it.
const snapOf = (fi: number) => {
  let k = 0;
  for (let i = 0; i < POLLS.length; i++) if (POLLS[i] <= fi) k = i;
  return { T: POLLS[k] as number, prev: POLLS[Math.max(0, k - 1)] as number, first: k === 0 };
};
const isRunning = (b: SeatDef, T0: number) =>
  b.startF !== undefined && b.startF <= T0 && (b.endF === undefined || b.endF > T0);
const runningCount = (T0: number) => BOARD.filter((b) => isRunning(b, T0)).length;
const runningSet = (T0: number) => new Set(BOARD.filter((b) => isRunning(b, T0)).map((b) => b.name));

// board.ts modelSummary(): count per model, by count desc then name.
const MODEL_SUMMARY = (() => {
  const counts = new Map<string, number>();
  for (const b of BOARD) counts.set(b.model, (counts.get(b.model) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([m, n]) => `${m} x${n}`)
    .join(" · ");
})();

// board.ts ago() / runDuration()
const agoTxt = (s: number) => (s < 60 ? `${Math.floor(s)}s ago` : `${Math.floor(s / 60)}m ago`);
const durTxt = (s: number) => {
  const r = Math.round(s);
  return r < 60 ? `${r}s` : `${Math.floor(r / 60)}m ${String(r % 60).padStart(2, "0")}s`;
};

// Task lanes as captured (04h / 05a).
const LANE_ROWS: { status: string; dot: string; count: number; cards: [string, string][] }[] = [
  {
    status: "in progress",
    dot: MONO.ok,
    count: 9,
    cards: [
      ["Cut the sales-call highlight reel", "Reelkit Editor"],
      ["Schedule this week's cross-platform posts", "Postly Publisher"],
      ["Qualify 12 new DMs from the campaign", "Comms Agent"],
    ],
  },
  {
    status: "in review",
    dot: MONO.warn,
    count: 3,
    cards: [
      ["Draft 3 IG hooks for the Vantage launch", "Social Agent"],
      ["Generate 5 UGC variants for the new offer", "Adsmith Creative"],
      ["Weekly pipeline summary for Vantage", "Sales Agent"],
    ],
  },
  {
    status: "todo",
    dot: MONO.text2,
    count: 8,
    cards: [
      ["Triage overnight inbound across 4 inboxes", "Comms Agent"],
      ["Follow up on 6 unreplied warm leads", "Gmail Worker"],
      ["Audit pgvector index health", "Vector Auditor"],
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
      ["Sync follower counts across 6 platforms", "Postly Publisher"],
    ],
  },
];

const mix = (c: string, pct: number, other = "transparent") => `color-mix(in oklab, ${c} ${pct}%, ${other})`;

// kit.css bn-enter: 0.3s lens ease, from translateY(6px), opacity 0.
const enter = (f: number, start: number): React.CSSProperties => {
  const t = interpolate(f, [start, start + 9], [0, 1], { ...clamp, easing: LENS });
  return { opacity: t, transform: `translateY(${6 * (1 - t)}px)` };
};

const Box: React.FC<{ x: number; y: number; w: number; h: number; style?: React.CSSProperties; children?: React.ReactNode }> = ({
  x,
  y,
  w,
  h,
  style,
  children,
}) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, boxSizing: "border-box", ...style }}>{children}</div>
);

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

// One seat, crossfading on the poll that changes it (each SeatChip is opaque).
const Seat: React.FC<{ i: number; f: number; fi: number }> = ({ i, f, fi }) => {
  const b = BOARD[i];
  const row = Math.floor(i / 5);
  const col = i % 5;
  const snap = snapOf(fi);
  const was = !snap.first && isRunning(b, snap.prev);
  const now = isRunning(b, snap.T);
  const x = was === now ? 1 : interpolate(f, [snap.T, snap.T + XF], [0, 1], { ...clamp, easing: HOUSE });
  const sf = f + i * 7; // spinners out of phase, as a live board looks
  const elapsed = b.startF !== undefined ? Math.max(0, (Math.min(fi, b.endF ?? Infinity) - b.startF) / 30) : null;
  const chip = (running: boolean) =>
    running ? (
      <SeatChip
        name={b.name}
        model={b.model}
        adapter={b.adapter}
        status="running"
        frame={sf}
        elapsedSec={elapsed}
        width={CHIP.w}
        orbit
        orbitPhase={i * 0.37}
      />
    ) : (
      <SeatChip name={b.name} model={b.model} adapter={b.adapter} status={b.rest} failure={b.failure ?? null} frame={sf} width={CHIP.w} />
    );
  return (
    <div style={{ position: "absolute", left: CHIP.x0 + col * CHIP.dx, top: CHIP.y0 + row * CHIP.dy, width: CHIP.w, height: CHIP.h }}>
      {x < 1 ? <div style={{ position: "absolute", inset: 0 }}>{chip(was)}</div> : null}
      <div style={{ position: "absolute", inset: 0, opacity: x }}>{chip(now)}</div>
    </div>
  );
};

// ---------------------------------------------------------------- run feed
type Run = { key: string; name: string; startF: number; endF?: number; failed?: boolean };
const RUNS: Run[] = [
  ...BOARD.filter((b) => b.startF !== undefined).map((b) => ({ key: b.name, name: b.name, startF: b.startF as number, endF: b.endF })),
  { key: "codex-fail", name: CONDUCTORS.codex.name, startF: CODEX_FAIL_START, endF: CODEX_FAIL_END, failed: true },
];
// orderRuns(): startedAt desc, as of a poll.
const feedAt = (T0: number) => RUNS.filter((r) => r.startF <= T0).sort((a, b) => b.startF - a.startF);

const FeedLine: React.FC<{ r: Run; T0: number; style?: React.CSSProperties }> = ({ r, T0, style }) => {
  const done = r.endF !== undefined && r.endF <= T0;
  const state = !done ? "running" : r.failed ? "failed" : "ok";
  const tone = state === "running" ? MONO.ok : state === "failed" ? MONO.err : MONO.text2;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
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
        background: MONO.surface,
        ...style,
      }}
    >
      <span style={{ fontWeight: 700, color: tone }}>{state === "running" ? "▸" : state === "failed" ? "✕" : "✓"}</span>
      <span style={{ color: MONO.text, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
      {state !== "ok" ? <span style={{ color: tone }}>{state}</span> : null}
      {done ? <span style={{ color: MONO.text3 }}>{durTxt(((r.endF as number) - r.startF) / 30)}</span> : null}
      <span style={{ color: MONO.text3, flexShrink: 0 }}>{agoTxt((T0 - r.startF) / 30)}</span>
    </div>
  );
};

const RunFeed: React.FC<{ f: number; fi: number }> = ({ f, fi }) => {
  const snap = snapOf(fi);
  const rows = feedAt(snap.T);
  const before = snap.first ? rows : feedAt(snap.prev);
  const fresh = new Set(rows.filter((r) => !before.some((o) => o.key === r.key)).map((r) => r.key));
  const nNew = fresh.size;
  // the list makes room for the new runs, then they enter (bn-enter), 3f apart
  const shift = nNew ? interpolate(f, [snap.T, snap.T + 8], [0, 1], { ...clamp, easing: HOUSE }) : 1;
  const flip = interpolate(f, [snap.T, snap.T + XF], [0, 1], { ...clamp, easing: HOUSE });
  let k = 0;
  return (
    <div style={{ position: "absolute", left: FEED.x, top: FEED.y, width: FEED.w, height: FEED.h, overflow: "hidden" }}>
      {rows.map((r, idx) => {
        if (fresh.has(r.key)) {
          const order = nNew - 1 - k++; // the oldest new run lands first
          return (
            <div key={r.key} style={{ position: "absolute", left: 0, top: idx * FEED.row, width: FEED.w, height: 17, ...enter(f, snap.T + 3 + order * 3) }}>
              <FeedLine r={r} T0={snap.T} />
            </div>
          );
        }
        const top = idx * FEED.row - (1 - shift) * nNew * FEED.row;
        const wasDone = r.endF !== undefined && r.endF <= snap.prev;
        const isDone = r.endF !== undefined && r.endF <= snap.T;
        const changed = !snap.first && wasDone !== isDone;
        return (
          <div key={r.key} style={{ position: "absolute", left: 0, top, width: FEED.w, height: 17 }}>
            {changed && flip < 1 ? <FeedLine r={r} T0={snap.prev} /> : null}
            <FeedLine r={r} T0={snap.T} style={changed ? { opacity: flip } : undefined} />
          </div>
        );
      })}
    </div>
  );
};

const BoardPage: React.FC<{ f: number }> = ({ f }) => {
  const fi = Math.floor(f);
  const snap = snapOf(fi);
  const led = 0.75 + 0.25 * Math.cos(((f / 30) % 2) * Math.PI); // animate-pulse 2s
  const breathe = 0.5 - 0.5 * Math.cos((((f / 30) % 1.5) / 1.5) * 2 * Math.PI); // bn-task-breathe 1.5s
  const liveNow = runningSet(snap.T);
  const livePrev = snap.first ? liveNow : runningSet(snap.prev);
  const liveX = interpolate(f, [snap.T, snap.T + XF], [0, 1], { ...clamp, easing: HOUSE });
  const liveAmt = (owner: string) => {
    const a = livePrev.has(owner) ? 1 : 0;
    const b = liveNow.has(owner) ? 1 : 0;
    return a + (b - a) * liveX;
  };

  // RUNNING NOW: CountUp from the previous poll's value (900ms)
  const nNow = runningCount(snap.T);
  const nPrev = snap.first ? nNow : runningCount(snap.prev);
  const cu = interpolate(fi, [snap.T, snap.T + 27], [0, 1], { ...clamp, easing: COUNT });
  const runningShown = Math.round(nPrev + (nNow - nPrev) * cu);
  const STATS: [string, number][] = [
    ["Seats", BOARD.length],
    ["Running now", runningShown],
    ["Open tasks", 21],
    ["Runs · 24h", 36],
    ["Heartbeats · 24h", 33],
  ];

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: PAGE_W,
        height: 1000,
        background: MONO.bg,
        fontFamily: FONT_MONO,
        color: MONO.text,
      }}
    >
      {/* the slab + Roster SlabCard */}
      <Box x={256} y={52} w={1668} h={890} style={{ border: `1px solid ${MONO.border}`, borderRadius: 28, background: MONO.bg }} />
      <Box x={285.6} y={65} w={1610.4} h={848} style={{ border: `1px solid ${MONO.border}`, borderRadius: 20, background: MONO.bg }} />
      {/* AgentsTabs */}
      <Box x={306} y={115} w={600} h={1} style={{ background: MONO.border }} />
      {[
        ["Roster", true],
        ["Needs you", false],
        ["Deliverables", false],
        ["Hermes", false],
      ].map(([label, on], i) => (
        <div
          key={label as string}
          style={{
            position: "absolute",
            left: 306 + i * 150,
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
            color: on ? MONO.text : MONO.text3,
          }}
        >
          {label}
          {i === 1 ? (
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

      {/* Board live */}
      <Box x={PANEL.x} y={PANEL.y} w={PANEL.w} h={PANEL.h} style={{ border: `1px solid ${MONO.border}`, borderRadius: 10, background: MONO.surface }}>
        <div style={{ position: "absolute", left: 17, top: 15.5, width: 6, height: 6, background: MONO.ok, opacity: led }} />
        <Label x={34.5} y={10}>
          Board live
        </Label>
        <div style={{ position: "absolute", left: 133, top: 10, fontSize: 10, lineHeight: "15px", color: MONO.text3 }}>
          {`${BOARD.length} seats · ${nNow} running`}
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
        <div style={{ position: "absolute", left: 17, top: 29, fontSize: 10, lineHeight: "16.25px", color: MONO.text2, whiteSpace: "nowrap" }}>
          {MODEL_SUMMARY}
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
            <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{value}</div>
          </div>
        ))}

        {/* seat grid */}
        {BOARD.map((_, i) => (
          <Seat key={i} i={i} f={f} fi={fi} />
        ))}

        {/* run feed */}
        <Label x={FEED.x} y={FEED.y - 23}>
          Run feed
        </Label>
        <RunFeed f={f} fi={fi} />

        {/* task lanes */}
        <Label x={LANES.x} y={FEED.y - 23}>
          Task lanes
        </Label>
        <div style={{ position: "absolute", left: LANES.x, top: LANES.y, width: LANES.w, height: FEED.h, overflow: "hidden" }}>
        {LANE_ROWS.map((lane, li) => {
          const lw = (LANES.w - 4 * 12) / 5;
          const lx = li * (lw + 12);
          return (
            <div key={lane.status} style={{ position: "absolute", left: lx, top: 0, width: lw }}>
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
                  const lv = liveAmt(owner);
                  const br = breathe * lv;
                  return (
                    <div
                      key={title}
                      style={{
                        boxSizing: "border-box",
                        borderRadius: 6,
                        padding: "6px 8px",
                        border: `1px solid ${lv > 0 ? mix(MONO.ok, (30 + 70 * breathe) * lv, MONO.border) : MONO.border}`,
                        background: lv > 0 ? mix(MONO.ok, 9 * br) : "transparent",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10.5,
                          lineHeight: 1.375,
                          color: MONO.text,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
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
                            background: lv > 0.5 ? MONO.ok : MONO.text2,
                            opacity: lv > 0.5 ? 0.35 + 0.65 * breathe : 1,
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

      {/* Conductor rail, state C (capture 05e: "board · claude-opus-5-5");
          its fixture chat is blurred past reading (and stays out of shot) */}
      <div style={{ position: "absolute", left: RAIL_X - 4, top: PANEL.y - 4, width: 408, height: 769, overflow: "hidden" }}>
        <Img src={staticFile("bconductor/reference/05e-conductor-rail-stateC.png")} style={{ width: 408, height: 769 }} />
        <div style={{ position: "absolute", left: 14, top: 76, width: 380, height: 292, overflow: "hidden" }}>
          <Img
            src={staticFile("bconductor/reference/05e-conductor-rail-stateC.png")}
            style={{ position: "absolute", left: -14, top: -76, width: 408, height: 769, filter: "blur(7px)" }}
          />
        </div>
      </div>

      {/* sticky chrome (real crops); the topbar runs on to the window edge */}
      <Box x={1600} y={0} w={350} h={52} style={{ background: MONO.bg, borderBottom: `1px solid ${MONO.border}` }} />
      <OsChrome page="agents" />
    </div>
  );
};

// ============================================================ plan cards
// The two PlanCards (capture 03a/03b) floated over the board's right side,
// over seat columns 3-4 from row 3 down (idle seats only; clear of the end
// push): Codex dimmed behind at 100% red (title + session meter showing),
// Claude (selected, as captured) in front, lifted with --bn-shadow-pop.
// PlanCard is a fluid grid cell in the product (393 at the 1600 capture);
// here it spans the two seat columns it sits over (440) so no chip slivers
// peek past its edges.
const COLS34_X = PANEL.x + CHIP.x0 + 3 * CHIP.dx; // 995
const CARD_W = 2 * CHIP.dx - 8; // 440
const ROW3_Y = PANEL.y + CHIP.y0 + 3 * CHIP.dy; // 444.5
const CODEX_POS = { x: COLS34_X, y: ROW3_Y } as const;
const CLAUDE_POS = { x: CODEX_POS.x, y: ROW3_Y + 104 } as const;
const CODEX_SCALE = 0.96;

// usage poll on "Claude plan": Claude takes the board's load
const CL = { burnAdd: 1_200_000 } as const;
const lerp4 = (a: readonly number[], b: readonly number[], p: number) =>
  a.map((v, i) => v + (b[i] - v) * p) as [number, number, number, number];

// Hatch drift (P07/P08's ambient layer on the meter fills), continued.
const HATCH_P = 12 * Math.SQRT2;
const HATCH_SPEED = 0.25;
const HATCH_T0 = 137 + P08_NEXT; // P07's last frame + P08's length

// ================================================================ camera
type Cam = { cx: number; cy: number; s: number };
type Seg = { f0: number; f1: number; to: Cam; ease: (t: number) => number; rho?: number; bow?: number };

const lerpCam = (a: Cam, b: Cam, p: number, bow = 0): Cam => ({
  cx: a.cx + (b.cx - a.cx) * p,
  cy: a.cy + (b.cy - a.cy) * p,
  s: Math.exp(Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * p) * (1 - bow * 4 * p * (1 - p)),
});

// van Wijk & Nuij, "Smooth and efficient zooming and panning" (2003): the
// long pans zoom out just enough to keep screen speed even.
const vanWijk = (a: Cam, b: Cam, rho: number) => {
  const w0 = W / a.s;
  const w1 = W / b.s;
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  const u1 = Math.hypot(dx, dy);
  const r2 = rho * rho;
  const r4 = r2 * r2;
  const b0 = (w1 * w1 - w0 * w0 + r4 * u1 * u1) / (2 * w0 * r2 * u1);
  const b1 = (w1 * w1 - w0 * w0 - r4 * u1 * u1) / (2 * w1 * r2 * u1);
  const R0 = Math.log(-b0 + Math.sqrt(b0 * b0 + 1));
  const R1 = Math.log(-b1 + Math.sqrt(b1 * b1 + 1));
  const S = (R1 - R0) / rho;
  return (p: number): Cam => {
    const s = S * p;
    const u = (w0 / r2) * Math.cosh(R0) * Math.tanh(rho * s + R0) - (w0 / r2) * Math.sinh(R0);
    const w = (w0 * Math.cosh(R0)) / Math.cosh(rho * s + R0);
    return { cx: a.cx + (dx * u) / u1, cy: a.cy + (dy * u) / u1, s: W / w };
  };
};

// page px held at the frame centre
const START: Cam = { cx: 662, cy: 330, s: 1.54 }; // virtual, f-8: conductors + stat cells
// run feed + rows 4-7 + the in-progress lane; frame top in the row 3/4 gap,
// then a slow push toward the feed while the poll lands
const FEED_IN: Cam = { cx: 552, cy: 494 + H / 2 / 2.22, s: 2.22 };
const FEED_DRIFT: Cam = { cx: 540, cy: 497 + H / 2 / 2.34, s: 2.34 };
// both cards, row 2 (Adsmith, Reelkit, Renderly) above, the col-2 spinners
// at left, the rail edge at right (its blurred chat stays out of shot); the
// frame top stays in the gap between rows 1 and 2 (y 386)
const CARDS: Cam = { cx: 1180, cy: 665, s: 1.72 };
const CARDS_DRIFT: Cam = { cx: 1178, cy: 386 + H / 2 / 1.76, s: 1.76 };
// "agents" / "don't even notice": one glide back from the cards and in on the
// two Conductors (column 0: Codex failed ✗ above, Claude live on
// claude-opus-5-5 below, its timer running) with Client Roster running beside
// them and the stat cells across the top (RUNNING NOW ticks on the f126 poll)
const PUSH: Cam = { cx: 512, cy: 356, s: 2.8 };
const PUSH_DRIFT: Cam = { cx: 513, cy: 357, s: 2.83 };

// camera move windows (also the MoveBlur windows)
const OPEN = { f0: -5, f1: 22 } as const;
const OVER = { f0: 41, f1: 74 } as const; // "moves over": to the cards
const BACK = { f0: 97, f1: 142 } as const; // "agents / don't even notice": back + in
const SEGS: Seg[] = [
  { f0: OPEN.f0, f1: OPEN.f1, to: FEED_IN, ease: GLIDE, bow: 0.05 },
  { f0: OPEN.f1, f1: OVER.f0, to: FEED_DRIFT, ease: TRAVEL },
  { f0: OVER.f0, f1: OVER.f1, to: CARDS, ease: GLIDE, rho: 1.0 },
  { f0: OVER.f1, f1: BACK.f0, to: CARDS_DRIFT, ease: TRAVEL },
  { f0: BACK.f0, f1: BACK.f1, to: PUSH, ease: GLIDE, rho: 1.0 },
  { f0: BACK.f1, f1: BCP09_DURATION + 3, to: PUSH_DRIFT, ease: DECEL },
];
const PATHS = (() => {
  let from = START;
  return SEGS.map((g) => {
    const a = from;
    from = g.to;
    const vw = g.rho ? vanWijk(a, g.to, g.rho) : null;
    return (p: number) => (vw ? vw(p) : lerpCam(a, g.to, p, g.bow ?? 0));
  });
})();

const camAt = (f: number): Cam => {
  for (let k = 0; k < SEGS.length; k++) {
    const g = SEGS[k];
    if (f <= g.f1 || k === SEGS.length - 1) {
      const p = g.ease(Math.max(0, Math.min(1, (f - g.f0) / (g.f1 - g.f0))));
      return PATHS[k](p);
    }
  }
  return START;
};

// The cards ride a touch nearer the lens: they line up with the board when
// the camera sits on CARDS and lead it (by DEPTH x the camera offset) elsewhere.
const DEPTH = { claude: 0.06, codex: 0.03 } as const;

// ================================================================== scene
const Scene: React.FC = () => {
  const f = useCurrentFrame();
  const fi = Math.floor(f);
  const cam = camAt(f);
  const toScreen = (x: number, y: number, d: number) => ({
    x: W / 2 + (x - cam.cx) * cam.s + d * cam.s * (CARDS.cx - cam.cx),
    y: H / 2 + (y - cam.cy) * cam.s + d * cam.s * (CARDS.cy - cam.cy),
  });

  // ---- Claude takes the load (usage poll on "Claude plan")
  const cc = PLAN_DATA.claudeC;
  const mS = interpolate(fi, [T.usage, T.usage + 20], [0, 1], { ...clamp, easing: METER });
  const mW = interpolate(fi, [T.usage + 3, T.usage + 23], [0, 1], { ...clamp, easing: METER });
  const cnt = interpolate(fi, [T.usage + 1, T.usage + 28], [0, 1], { ...clamp, easing: COUNT });
  const ln = interpolate(f, [T.usage + 2, T.usage + 22], [0, 1], { ...clamp, easing: HOUSE });
  const claudeSession = USAGE.claudeSessionC + 3 * mS; // 33 -> 36
  const claudeWeekly = USAGE.claudeWeeklyC + 2 * mW; // 41 -> 43
  const claudeBurns = lerp4(cc.burns, cc.burns.map((v) => v + CL.burnAdd), cnt);
  const weeklyShown = Math.round(claudeWeekly);
  const claudePct = claudeBurns.map((v, i) =>
    i === 3 ? weeklyShown : Math.round(((v / claudeBurns[3]) * claudeWeekly) * 10) / 10,
  ) as [number, number, number, number];
  const claudeLanes = {
    board: cc.lanes.board + 6 * ln,
    sessions: cc.lanes.sessions - 2 * ln,
    terminal: cc.lanes.terminal - 2 * ln,
    automation: cc.lanes.automation - 2 * ln,
  };
  const claudeAgo = fi < T.usage ? Math.floor((129 + fi) / 30) : Math.floor((fi - T.usage) / 30);
  const codexAgo = Math.floor((P08_NEXT - 16 + fi) / 30);

  const lift = interpolate(f, [T.lift0, T.lift1], [0, 1], { ...clamp, easing: HOUSE });
  const dim = interpolate(f, [T.lift0 - 2, T.lift1 - 2], [0, 1], { ...clamp, easing: HOUSE });
  const hatchX = (((HATCH_T0 + f) * HATCH_SPEED) % HATCH_P).toFixed(3);

  const codexAt = toScreen(CODEX_POS.x, CODEX_POS.y, DEPTH.codex);
  const claudeAt = toScreen(CLAUDE_POS.x, CLAUDE_POS.y, DEPTH.claude);

  return (
    <AbsoluteFill style={{ backgroundColor: MONO.bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: `translate(${W / 2 - cam.cx * cam.s}px, ${H / 2 - cam.cy * cam.s}px) scale(${cam.s})`,
          transformOrigin: "0 0",
        }}
      >
        <BoardPage f={f} />
      </div>

      {/* ambient: the hatched fills' stripe layer drifts (frame-driven) */}
      <style>{`.p09-cards [style*="repeating-linear-gradient"]{background-size:auto,${HATCH_P}px ${HATCH_P}px !important;background-position:0 0,var(--p09-hx) 0 !important;}`}</style>
      <div className="p09-cards" style={{ position: "absolute", inset: 0, "--p09-hx": `${hatchX}px` } as React.CSSProperties}>
        {/* ChatGPT · Codex, maxed, dimmed behind */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: CARD_W,
            transform: `translate(${codexAt.x}px, ${codexAt.y}px) scale(${cam.s}) translate(${(CARD_W * (1 - CODEX_SCALE)) / 2}px, 0px) scale(${CODEX_SCALE})`,
            transformOrigin: "0 0",
          }}
        >
          <PlanCard
            title={PLANS.codex.title}
            plan={PLANS.codex.plan}
            sessionPct={USAGE.codexSessionMax}
            weeklyPct={USAGE.codexWeeklyMax}
            sessionReset={USAGE.codexSessionReset}
            weeklyReset={USAGE.codexWeeklyReset}
            burns={[430_000, PLAN_DATA.codexMax.burns[1], PLAN_DATA.codexMax.burns[2], PLAN_DATA.codexMax.burns[3]]}
            pctOfWeek={[1.7, PLAN_DATA.codexMax.pctOfWeek[1], PLAN_DATA.codexMax.pctOfWeek[2], 100]}
            lanes={PLAN_DATA.codexA.lanes}
            machines={PLAN_DATA.codexA.machines}
            lastActivity={`${codexAgo}s ago`}
            width={CARD_W}
            style={{
              boxShadow: "0 8px 22px rgba(0,0,0,0.6)",
              filter: `brightness(${(1 - 0.48 * dim).toFixed(4)})`,
            }}
          />
        </div>

        {/* Claude (selected), lifted */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: CARD_W,
            transform: `translate(${claudeAt.x}px, ${claudeAt.y}px) scale(${cam.s}) translateY(${(-6 * lift).toFixed(3)}px)`,
            transformOrigin: "0 0",
          }}
        >
          <PlanCard
            title={PLANS.claude.title}
            plan={PLANS.claude.plan}
            sessionPct={claudeSession}
            weeklyPct={claudeWeekly}
            sessionReset={USAGE.claudeSessionReset}
            weeklyReset={USAGE.claudeWeeklyReset}
            burns={claudeBurns}
            pctOfWeek={claudePct}
            lanes={claudeLanes}
            machines={cc.machines}
            lastActivity={`${claudeAgo}s ago`}
            selected
            width={CARD_W}
            style={{ boxShadow: `0 24px 60px rgba(0,0,0,${(0.75 * (0.35 + 0.65 * lift)).toFixed(3)})` }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// MoveBlur windows (12 samples there, plain frames elsewhere): the opening
// glide and the two zoom-pans. The slow pushes in the holds render plain.
const MOVES: [number, number][] = [
  [0, OPEN.f1],
  [OVER.f0, OVER.f1],
  [BACK.f0, BACK.f1],
];

export const BcP09WorkMovesToClaude: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: MRD.bg }}>
    <MoveBlur moves={MOVES}>
      <Scene />
    </MoveBlur>
  </AbsoluteFill>
);
