// ===========================================================================
// Bennett organic reel: "Agent board, two conductors" (Oct 2026).
// Shared series DNA. READ-ONLY for builder agents: import from here and from
// ./ui, build your own layout in your own comp file. Never edit this file
// from a part build.
//
// THE WORLD is Merydian dark (Bennett's agency), reused verbatim from the
// approved Fish OS series (src/fishos/theme.ts): near-black ground, faint
// grid, spring-green world light. Green is LIGHT ON THE WORLD only, never a
// recolor of the product UI.
//
// THE PRODUCT is Bennett's real FounderOS (github.com/Bennettxai/FounderOS),
// Monolith theme: monochrome, JetBrains Mono, hairline borders, three status
// colors (ok / warn / err). Its pages are captured in
// public/bconductor/reference/ (run locally from the repo with fixture data)
// and its components are ported 1:1 into ./ui.tsx.
//
// THE STORY: Bennett runs his agents on two flat subscriptions (Codex on
// ChatGPT Pro, Claude on Claude Max 20x) through a Paperclip agent board.
// Two Conductors hold the board: GPT-6 Astra on Codex, Opus 5.5 on Claude.
// When Codex hits its weekly cap, the Conductor seat hands over to Opus 5.5
// and every agent keeps running on the Claude plan.
// ===========================================================================

export {
  MRD,
  MRD_GRADIENT,
  MRD_GRID,
  FO,
  OS_MARK,
  FONT_MONO,
  FONT_UI,
  SPRINGS,
  safePadX,
} from "../fishos/theme";

// --------------------------------------------- FounderOS Monolith (verbatim)
// frontend/src/lib/founderos/theme/monolith.css  :root[data-founderos-theme='mono']
export const MONO = {
  bg: "#0a0a0a",
  surface: "#0a0a0a",
  surface2: "#141414",
  surface3: "#1c1c1c",
  border: "#242424",
  borderStrong: "#3a3a3a",
  text: "#f2f2f2",
  text2: "#9c9c9c",
  text3: "#5c5c5c",
  accent: "#f2f2f2",
  accent2: "#d4d4d4",
  accentSoft: "rgba(242,242,242,0.06)",
  accentLine: "rgba(242,242,242,0.25)",
  ok: "#2fd36f",
  warn: "#ffb000",
  err: "#ff2d3f",
  hairline: "#1c1c1c",
  brain1: "#f2f2f2",
  brain2: "#9c9c9c",
  brain3: "#5c5c5c",
} as const;

// FounderOS v1 radius scale (monolith.css --bn-r-*).
export const RADII = {
  chip: 5,
  ctl: 6,
  card: 8,
  panel: 10,
  tile: 12, // plan cards (usage/ui.ts planCardClass rounded-[12px])
  slab: 28,
} as const;

// kit.css motion constants. The product's own easing, use them for UI moves.
export const OS_EASE = {
  ease: [0.32, 0.72, 0, 1] as const, // --bn-ease
  lens: [0.22, 0.61, 0.36, 1] as const, // --bn-ease-lens
  meterIn: [0.2, 0.7, 0.2, 1] as const, // VolumeMeter sweep, 1.2s
} as const;

// Victor-approved clean-motion easing (fish8 reference README).
export const EASE = {
  enter: [0.05, 0.7, 0.1, 1] as const,
  travel: [0.65, 0, 0.35, 1] as const,
  decel: [0.2, 0, 0, 1] as const,
} as const;

// usage.ts pctTone(): >= 90 err, >= 70 warn, else ok.
export const pctTone = (p: number): "ok" | "warn" | "err" =>
  p >= 90 ? "err" : p >= 70 ? "warn" : "ok";
export const toneColor = (t: "ok" | "warn" | "err") => MONO[t];

// ---------------------------------------------------------------- The plans
// Real plan names as FounderOS prints them (usage/fixtures.ts) + real prices.
export const PLANS = {
  codex: {
    title: "ChatGPT · Codex", // the real card title on /os/usage
    plan: "ChatGPT Pro", // badge reads "ChatGPT Pro · active"
    priceMonthly: 200,
    machine: "Codex · mini",
    logo: "bconductor/logos/codex-openai-blossom.svg", // official OpenAI blossom (black ink)
    logoWhite: "bconductor/logos/openai-white.svg",
  },
  claude: {
    title: "Claude",
    plan: "Claude Max 20x",
    priceMonthly: 200,
    machine: "Claude · mbp",
    logo: "bconductor/logos/claude-logo.png", // official Claude spark (coral)
  },
} as const;

// Story numbers. MATCH THE CAPTURES (reference/NOTES.md fixture table).
// Every part that shows a meter uses THESE values so cuts match.
export const USAGE = {
  // State A, before the switch (P05, P07).
  codexWeeklyA: 87, // the line: "codex is at 87% on the week" (amber, pctTone >= 70)
  codexSessionA: 60,
  claudeWeeklyA: 34,
  claudeSessionA: 20,
  // State B, Codex maxed (P08): both Codex meters 100% (red).
  codexWeeklyMax: 100,
  codexSessionMax: 100,
  // State C, after the switch, Claude takes the load (P09).
  claudeWeeklyC: 41,
  claudeSessionC: 33,
  codexSessionReset: "resets in 2h",
  codexWeeklyReset: "resets in 2d",
  claudeSessionReset: "resets in 3h",
  claudeWeeklyReset: "resets in 3d",
  sessionReset: "resets in 2h", // kept for older imports; prefer the per-plan keys
} as const;

// PlanCard data exactly as captured (01a/01b, 03b). burns = [last hour, 5h
// session, today, 7 days] tokens; pctOfWeek = the "≈x% of wk" sub-lines.
export const PLAN_DATA = {
  claudeA: {
    burns: [650_000, 2_600_000, 5_300_000, 62_300_000] as [number, number, number, number],
    pctOfWeek: [0.4, 1.4, 2.9, 34] as [number, number, number, number],
    lanes: { board: 58, sessions: 20, terminal: 12, automation: 10 },
    machines: 2,
    lastActivity: "25s ago",
  },
  claudeC: {
    burns: [1_400_000, 4_100_000, 9_600_000, 66_600_000] as [number, number, number, number],
    pctOfWeek: [0.9, 2.5, 5.9, 41] as [number, number, number, number],
    lanes: { board: 66, sessions: 16, terminal: 10, automation: 8 },
    machines: 2,
    lastActivity: "now",
  },
  codexA: {
    burns: [330_000, 1_200_000, 2_600_000, 24_600_000] as [number, number, number, number],
    pctOfWeek: [1.2, 4.2, 9.2, 87] as [number, number, number, number],
    lanes: { board: 76, sessions: 0, terminal: 18, automation: 6 },
    machines: 1,
    lastActivity: "30s ago",
  },
  codexMax: {
    burns: [0, 1_600_000, 3_900_000, 25_900_000] as [number, number, number, number],
    pctOfWeek: [0, 6.2, 15, 100] as [number, number, number, number],
    lanes: { board: 76, sessions: 0, terminal: 18, automation: 6 },
    machines: 1,
    lastActivity: "11m ago",
  },
} as const;

// --------------------------------------------------------------- Conductors
// SeatChip model line format: `${model} · ${adapterType}` (Paperclip adapters).
// The capture fixture had ONE "Conductor" seat whose model flips; the reel
// tells it as two conductors, so the board shows two Conductor seats (same
// real SeatChip, Crown glyph) and the Conductor rail/dock chip names the model
// holding the board: "board · gpt-6-astra" -> "board · claude-opus-5-5".
export const CONDUCTORS = {
  codex: {
    name: "Conductor · Codex",
    model: "gpt-6-astra",
    display: "GPT-6 Astra",
    adapter: "codex_local",
    plan: "codex" as const,
  },
  claude: {
    name: "Conductor · Claude",
    model: "claude-opus-5-5",
    display: "Opus 5.5",
    adapter: "claude_local",
    plan: "claude" as const,
  },
} as const;

// Seats under the conductors: REAL agent names from Bennett's demo seed
// (desktop/backend-go/internal/founderos/seed/demo/founderos-os.sql).
// The VO canon is 37 agents in six departments: never draw a total count.
export const SEATS = [
  { name: "Comms Agent", dept: "Communications", model: "claude-sonnet-5-5", adapter: "claude_local" },
  { name: "Gmail Worker", dept: "Communications", model: "gpt-6-astra", adapter: "codex_local" },
  { name: "Social Agent", dept: "Marketing/Growth", model: "claude-sonnet-5-5", adapter: "claude_local" },
  { name: "Reelkit Editor", dept: "Marketing/Growth", model: "gpt-6-astra", adapter: "codex_local" },
  { name: "Postly Publisher", dept: "Marketing/Growth", model: "claude-haiku-5-5", adapter: "claude_local" },
  { name: "Adsmith Creative", dept: "Marketing/Growth", model: "gpt-6-astra", adapter: "codex_local" },
  { name: "Sales Agent", dept: "Sales", model: "claude-opus-5-5", adapter: "claude_local" },
  { name: "Brand Deal Agent", dept: "Sales", model: "claude-sonnet-5-5", adapter: "claude_local" },
  { name: "Data Agent", dept: "TECH", model: "gpt-6-astra", adapter: "codex_local" },
  { name: "Stack Monitor", dept: "TECH", model: "claude-haiku-5-5", adapter: "claude_local" },
  { name: "Client Roster", dept: "Clients", model: "claude-sonnet-5-5", adapter: "claude_local" },
  { name: "Payments Pulse", dept: "Finances", model: "claude-haiku-5-5", adapter: "claude_local" },
] as const;

export const DEPARTMENTS = [
  "Sales",
  "Marketing/Growth",
  "TECH",
  "Finances",
  "Communications",
  "Clients",
] as const;

// Tasks page "Local kanban" exactly as captured (reference/08-tasks-kanban.png):
// To do 5 · In progress 4 · In review 2 · Done 4 (header "Local kanban 15").
export const TASKS = {
  todo: [
    { title: "Triage overnight inbound across 4 inboxes", owner: "Comms Agent" },
    { title: "Draft 3 IG hooks for the Vantage launch", owner: "Social Agent" },
    { title: "Follow up on 6 unreplied warm leads", owner: "Gmail Worker" },
    { title: "Generate 5 UGC variants for the new offer", owner: "Adsmith Creative" },
    { title: "Prep the cohort onboarding checklist", owner: "Onboarding Agent" },
  ],
  doing: [
    { title: "Schedule this week's cross-platform posts", owner: "Postly Publisher" },
    { title: "Qualify 12 new DMs from the campaign", owner: "Comms Agent" },
    { title: "Cut the sales-call highlight reel", owner: "Reelkit Editor" },
    { title: "Counter the inbound sponsor at the rate card", owner: "Brand Deal Agent" },
  ],
  review: [
    { title: "Draft the next newsletter issue", owner: "Newsletter Agent" },
    { title: "Render product shots for the cohort page", owner: "Renderly Creative" },
  ],
  done: [
    { title: "Send the Vantage proposal follow-up", owner: "Gmail Worker" },
    { title: "Post the Monday community digest", owner: "WhatsApp Worker" },
    { title: "Publish the Tuesday carousel", owner: "Social Agent" },
    { title: "Sync follower counts across 6 platforms", owner: "Postly Publisher" },
  ],
} as const;

// Real API pricing, for any per-token cost math (Anthropic, Opus 5.5).
export const API_PRICING = {
  opus55: { inPerM: 4, outPerM: 20, cacheReadPerM: 0.2 },
} as const;

// P11 math: two flat bills vs ~$10,000 of API-priced tokens (Bennett's claim).
export const BILLS = {
  flatTotal: 400, // 200 + 200
  apiEquivalent: 10_000, // "around $10,000 worth of API tokens"
} as const;

// Paperclip (paperclipai/paperclip), captured 2026-10-10.
export const PAPERCLIP = {
  repo: "paperclipai / paperclip",
  name: "paperclip",
  about: "The open-source app everyone uses to manage agents at work",
  stars: "99.6k",
  forks: "16.8k",
  site: "paperclip.ing",
  mark: "bconductor/logos/paperclip-favicon.svg", // official mark (white stroke on #0A0A0A tile)
  avatar: "bconductor/logos/paperclip-gh-avatar.png",
  // The mark's path (viewBox 0 0 24 24, stroke 2, round caps), from paperclip.ing/favicon.svg:
  markPath:
    "m16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551",
} as const;

// --------------------------------------------------------- Parts + timings
// Word times are seconds from the start of the line in Bennett's chosen take
// (C0010.MP4, transcribed with whisper word timestamps). Key the motion beats
// to these so the graphic lands on the words.
export const FPS = 30;
export const sec = (s: number) => Math.round(s * FPS);

export const PARTS = {
  P01: {
    line: "I run Astra and Fable side by side with just my subscription.",
    ratio: "9:8 3D",
    words: { Astra: 0.34, Fable: 0.94, side: 1.2, bySide: 1.72, subscription: 2.96, end: 3.4 },
  },
  P02: {
    line: "Most people running multiple agents pay thousands of dollars a month in API tokens.",
    ratio: "9:8",
    words: { agents: 1.52, pay: 1.96, thousands: 2.22, dollars: 2.9, month: 3.3, apiTokens: 3.64, end: 4.5 },
  },
  P03: {
    line: "Or they burn through their plans in less than a day and wonder why they can't get anything done.",
    ratio: "9:8",
    words: { burn: 0.4, plans: 0.9, lessThanADay: 1.4, day: 2.4, wonder: 2.65, done: 4.0, end: 4.4 },
  },
  P04: {
    line: "So I built this agent board with Paperclip, an open source repo.",
    ratio: "9:8",
    words: { built: 1.36, agentBoard: 1.66, paperclip: 2.26, openSource: 3.1, repo: 3.56, end: 4.2 },
  },
  P05: {
    line: "On the left is my Codex plan and on the right is my Claude Max subscription.",
    ratio: "9:8",
    words: { left: 1.46, codex: 2.02, plan: 2.32, right: 2.96, claude: 3.6, max: 3.98, subscription: 4.5, end: 5.0 },
  },
  P06: {
    line: "And I set each agent up with whatever model I want. The conductors being Opus 5.5 and GPT-6 Astra.",
    ratio: "9:8",
    words: { eachAgent: 0.4, whateverModel: 1.22, model: 1.64, conductors: 2.8, opus: 3.64, astra: 5.4, end: 6.6 },
  },
  P07: {
    line: "As you can see, Codex is at 87% on the week, as I've been using it more than Opus.",
    ratio: "9:16",
    words: { codex: 1.12, pct87: 1.46, week: 2.4, usingIt: 2.88, moreThanOpus: 3.28, end: 4.2 },
  },
  P08: {
    line: "And once that maxes out, it automatically switches to my other conductor, which is running Opus 5.5.",
    ratio: "9:16",
    words: { maxesOut: 0.5, automatically: 1.34, switches: 1.8, otherConductor: 2.62, running: 5.96, opus: 6.12, end: 7.0 },
  },
  P09: {
    line: "And the work just moves over to my Claude plan and the agents don't even notice.",
    ratio: "9:8",
    words: { work: 0.7, movesOver: 1.44, claudePlan: 2.5, agents: 3.62, dontEvenNotice: 3.9, end: 5.0 },
  },
  P10: {
    line: "And all of my tasks just keep moving automatically.",
    ratio: "9:8",
    words: { tasks: 0.66, keepMoving: 1.36, automatically: 1.78, end: 2.3 },
  },
  P11: {
    line: "And I only pay two monthly flat bills and I get around $10,000 worth of API tokens for the cost of $400.",
    ratio: "9:8",
    words: { two: 1.78, flatBills: 2.6, tenK: 4.12, apiTokens: 5.5, cost: 6.88, fourHundred: 7.42, end: 8.0 },
  },
} as const;

// Delivery names (opening words of each line), see BRIEF.md.
export const DELIVERY = {
  P01: "I run Astra and Fable (9x8)",
  P02: "Most people running multiple agents (9x8)",
  P03: "Or they burn through their (9x8)",
  P04: "So I built this agent (9x8)",
  P05: "On the left is my (9x8)",
  P06: "And I set each agent (9x8)",
  P07: "As you can see, Codex (9x16)",
  P08: "And once that maxes out (9x16)",
  P09: "And the work just moves (9x8)",
  P10: "And all of my tasks (9x8)",
  P11: "And I only pay two (9x8)",
} as const;
