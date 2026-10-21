# DISPATCH: Bennett organic reel "Agent board, two conductors" (bconductor)

Sprint for 11 Remotion graphics. ORCHESTRATOR = the main Claude session. BUILDERS = Opus sub-agents, one
part each, at most TWO running at once (Victor's Mac). RED TEAM = a review pass before delivery.

Script source: Notion "Bennett Reels (organic): Agent board, two conductors". Lines below are what Bennett
ACTUALLY said in the raw take (`CREATORS/bennet/reels/founder-os/Conducter reel/C0010.MP4`), not the
Notion draft. Word times (seconds from line start) are in `theme.ts` PARTS.

## Victor's direction (2026-10-10), non-negotiable
1. **Super smooth.** Every move eased (bezier, zero overshoot), camera motion blur on moves, nothing pops,
   nothing snaps, no hard scene swaps inside a part. Prefer continuous transformation over replacement.
2. **Something is happening in every beat.** No dead stretch longer than ~20 frames anywhere. At any
   moment there are three motion layers: PRIMARY (camera move or hero state change), SECONDARY (UI entering
   or changing state), AMBIENT (live dots, spinners, ticking elapsed timers, meters breathing, run feed
   lines landing, slow camera drift). Holds still drift.
3. **Visually stimulating**, but stimulation comes from real product UI changing state + camera + depth,
   never from stock effects.
4. **P01 is a real 3D render** (perspective camera through a 3D world, depth of field, parallax), 9:8.
5. Ratios: all 9:8 (1080x960, wrapped in the Holo safe frame) EXCEPT P07 and P08 = 9:16 (1080x1920).
6. Look = Bennett dark: Merydian world + FounderOS Monolith UI (the Fish OS series look).

## Hard rules (verbatim from the house rules; a FAIL on any of these = rework)
- Opaque `MRD.bg` root on frame 0 through the last frame. No black frames. `npm run check:black`.
- No narration-echo text. Only real FounderOS UI text, real names, real numbers. Never write the VO line,
  a paraphrase of it, a caption, a label, a stamp or a callout on screen.
- No vibe-coded effects: no rubber stamps, explanatory labels under objects, sparkles, confetti, zigzag
  lightning, neon, bloom blobs, colored halos, glassmorphism, gradient text, screen shake, toy switches.
  (The product's OWN effects are fine because they are real: the VolumeMeter's hatched fill + soft glow,
  the Conductor emblem's sweep/halo when thinking, the LED blink on ok dots.)
- Easing: entrances `EASE.enter` (0.05,0.7,0.1,1), on-screen travel `EASE.travel` (0.65,0,0.35,1),
  decelerations `EASE.decel` (0.2,0,0,1); UI micro-motion may use the product's `OS_EASE.ease`.
  `Easing.bezier(...)` only. Never linear for movement (linear is fine for spinners/tickers).
- Stagger: elements in a group land 2-3 frames apart; trailing parts settle late. Never all at once.
- Camera: hold -> move -> hold. Moves 14-24 frames. Wrap moving scenes in `CameraMotionBlur`
  (`@remotion/motion-blur`, shutterAngle 180, samples <= 5). The action happens during holds; the camera
  goes to the action.
- Open MID-MOTION: frame 0 already shows content and the camera is already moving (no fade from black, no
  empty first frame). End with a ~20 frame near-still hold (tiny drift ok) for a clean editor cut.
- 9:8 parts: your comp renders full 1080x960; Root wraps it in `withSafeFrame` (holo/SafeFrame.tsx) which
  scales it into an inset screen. Design for the full 1080x960, keep text >= 22px at that size.
- 9:16 parts: no wrapper. Keep content inside x 86..994, y 230..1500 (Reels header, right rail, caption).
- Cursor: Bennett's hand only appears in P06 (he sets models). Everywhere else the agents act on their own:
  NO cursor moves cards, flips seats or clicks anything. That is the point of the reel.
- Never draw a total agent count (canon is 37, the board shows a subset).
- Real assets only (`public/bconductor/logos`, captures in `public/bconductor/reference`).
- All motion from `useCurrentFrame()`; no CSS animations/transitions.

## Shared files (READ-ONLY for builders)
- `src/bconductor/theme.ts`: tokens (MRD world, MONO = FounderOS Monolith verbatim), PLANS, USAGE story
  numbers, CONDUCTORS, SEATS, TASKS, PAPERCLIP, PARTS (lines + word times), easing.
- `src/bconductor/ui.tsx`: FounderOS components ported 1:1 from the repo's Svelte source and checked
  against the captures: OsWindow chrome, PlanCard, VolumeMeter, SeatChip, ConductorEmblem, Kanban column +
  card, Badge, Dot, ConductorComposer bar, Cursor. Use these, pass frame-driven props. If you need a variant,
  wrap or compose in YOUR file; do not fork-copy ui.tsx.
- Captures: `public/bconductor/reference/*.png` + `NOTES.md` + `tokens.json`. LOOK at them before building.
- FounderOS source (read for detail): `github.com/Bennettxai/FounderOS, frontend/src/lib/founderos/`

## Captures per part (public/bconductor/reference/, 3200x2000 = 1600x1000 css @2x; read NOTES.md)
- Chrome: `ui.tsx` OsChrome (real sidebar/topbar crops for usage / agents / tasks).
- Usage page: 01-usage-stateA(-top,-full), 01a/01b plan cards, 01c Plan Limits (the four official gauges stacked:
  Claude 5h, Claude weekly, Codex 5h, Codex weekly), 02* Codex maxed, 03* after the switch. In the REAL page the
  Plans row is Claude (selected, white border) | ChatGPT · Codex | Ollama (empty). For P05 put Codex LEFT and
  Claude RIGHT because that is what Bennett says; keep everything else as captured.
- Agents page: 04-agents-board-stateA (Roster tab, Board live header "37 seats · 14 running", model summary line,
  stat cells SEATS / RUNNING NOW / OPEN TASKS / RUNS · 24H / HEARTBEATS · 24H, 5-column seat grid, RUN FEED,
  TASK LANES, Conductor rail on the right with "board · gpt-6-astra"), 04b-04k crops, 04h/04j at 2240 wide (model
  lines not truncated), 05* the same after the switch ("board · claude-opus-5-5").
- Conductor dock: 06*/07* (520 wide versions 06d/07d keep the model label on one line).
- Tasks page: 08-tasks-kanban ("Local kanban 15", To do 5 / In progress 4 / In review 2 / Done 4), 08a/08c crops.
- Org chart: 09* (AI Head row with the Conductor card, live chip "RUNNING · gpt-6-astra").
- Paperclip: 11-paperclip-github-dark.png (repo header, Star 99.6k, Fork 16.8k), 12-paperclip-site.png.
- Do NOT show the fixture chat text in the rail/dock as if Bennett wrote it ("Codex weekly is at 100%..."). Show
  the rail/dock chrome, the chip and the composer; keep chat bubbles out of frame or blurred past reading.
- "37 seats" on the board matches the VO canon (37), so the real header may show it. No other total-agent number.

## Approved references (look before building)
- Clean motion: `~/.claude/skills/liam-remotion-graphics/reference/examples/fish8-live-wire-smooth/README.md`
- 3D world recipe (P01): `src/manus2/BRIEF-v2-3D.md`, `src/fish8/F8P01Crowd.tsx`, `src/manus2/MbP1AgencyGotSoBusy.tsx`
  and the delivered `CREATORS/ahmed/reels/brand deals/fish.audio/fish 8/Almost nobody in sales is.mp4`.
- Bennett series look: `src/fishos/*`, `src/holo/*`, `public/fishos/reference/*.png`.

## Parts (territory: each builder owns exactly ONE file, already registered in Root.tsx)

| Part | File | Ratio | Frames | Line (Bennett) |
|---|---|---|---|---|
| P01 | BcP01RunAstraSideBySide.tsx | 9:8 3D | 135 | I run Astra and Fable side by side with just my subscription. |
| P02 | BcP02ThousandsInTokens.tsx | 9:8 | 150 | Most people running multiple agents pay thousands of dollars a month in API tokens. |
| P03 | BcP03BurnThroughPlans.tsx | 9:8 | 150 | Or they burn through their plans in less than a day and wonder why they can't get anything done. |
| P04 | BcP04BuiltWithPaperclip.tsx | 9:8 | 135 | So I built this agent board with Paperclip, an open source repo. |
| P05 | BcP05LeftCodexRightClaude.tsx | 9:8 | 165 | On the left is my Codex plan and on the right is my Claude Max subscription. |
| P06 | BcP06EachAgentAnyModel.tsx | 9:8 | 210 | And I set each agent up with whatever model I want. The conductors being Opus 5.5 and GPT-6 Astra. |
| P07 | BcP07CodexAt87.tsx | 9:16 | 135 | As you can see, Codex is at 87% on the week, as I've been using it more than Opus. |
| P08 | BcP08SwitchesConductor.tsx | 9:16 | 225 | And once that maxes out, it automatically switches to my other conductor, which is running Opus 5.5. |
| P09 | BcP09WorkMovesToClaude.tsx | 9:8 | 165 | And the work just moves over to my Claude plan and the agents don't even notice. |
| P10 | BcP10TasksKeepMoving.tsx | 9:8 | 90 | And all of my tasks just keep moving automatically. |
| P11 | BcP11TwoFlatBills.tsx | 9:8 | 255 | And I only pay two monthly flat bills and I get around $10,000 worth of API tokens for the cost of $400. |

Builders may change their own `*_DURATION` export (+/- 30 frames) if the beat map needs it; Root reads it.

### Continuity chains (cuts must feel like one system)
- Usage chain: P05 -> P07 -> P08 -> P09 use the SAME PlanCard objects with the SAME numbers from USAGE.
  P07 opens where P05's Codex card ends; P08 opens on P07's end state (Codex weekly 87%).
- Board chain: P04 -> P06 -> P09 use the same Agents board (Board live + seats + conductors).
- P10 uses the Tasks kanban with the seeded tasks.

## Beat maps (frame numbers at 30fps; key to the word times in PARTS)

**P01 (3D, 9:8). "I run Astra and Fable side by side with just my subscription."**
One 3D world on the Merydian perspective floor (grid receding to a haze horizon, green world light low on
the floor only). Two upright FounderOS PlanCard planes stand side by side: LEFT = Codex (badge
"ChatGPT Pro · active", official OpenAI blossom as a small mark beside the title), RIGHT = Claude ("Claude Max
20x · active", official Claude spark). Each card's meters are live (session filling, burn ticking). In front
of each card a ConductorEmblem disc hovers (thinking: sweep + breathe), with its seat line under it
("gpt-6-astra · codex_local" / "claude-opus-5-5 · claude_local"). Between and around them, seeded task cards
(TASKS) glide along two floor lanes toward the two plans, passing close to the lens (big + soft DoF blur).
Camera: f0 already moving, low and tight behind a foreground task card (blurred) -> "Astra" (f10) the LEFT
emblem's sweep ignites and the camera favors left -> "Fable" (f28) RIGHT emblem ignites -> "side by side"
(f36-57) crane up + arc to a centered three-quarter view revealing both standing side by side, parallax
obvious -> "subscription" (f89) push in to a near-frontal two-shot where both badges read, settle, hold to
end. DoF: focus plane on the cards, foreground cards blurred, horizon hazy. Contact shadows under every
plane. No text other than the real card UI.

**P02 (9:8). "Most people running multiple agents pay thousands of dollars a month in API tokens."**
The pay-as-you-go picture: a column of running agent SeatChips (real seat names, green spinners, ticking
elapsed) on the left, each run emitting token tallies that flow into an unbranded, Monolith-styled
"usage-based" statement panel on the right: one row per agent (`claude-opus-5-5`, tokens in/out, $ at the
REAL API rate $4/M in, $20/M out), a month-to-date total ticking up with tabular numerals. By "thousands"
(f67) the total crosses $1,000 and keeps accelerating; by "month" (f99) it is past $3,000 and still
climbing, a day-of-month strip filling in parallel. Camera: opens pushed in on one seat already running,
pulls back along the flow to the statement, ends tight on the total still ticking. No logos of Anthropic or
OpenAI (this is "most people", not a product), no captions.

**P03 (9:8). "Or they burn through their plans in less than a day and wonder why they can't get anything done."**
Real PlanCard (one plan, Claude Max 20x) with the Session limit meter racing 0 -> 100% through the pctTone
colors (green -> amber at 70 -> red at 90) while the WindowStrip "today" burn counts up; hits 100% around
"day" (f72) with the real reset text ("100% · resets in 4h"). Then the board below/beside it stalls: seat
chips flip one by one (staggered 3f) from green spinners to the error tone (red border) with the real
failure line format "run failed · You've hit your usage limit." and their elapsed timers freeze; In Progress
task cards stop. "wonder why" (f80-132): camera drifts slowly across the frozen seats, the only things moving
are the red LED states settling and the Session meter's 100% fill, then a slow push onto one frozen card.
Keep it smooth and quiet, not dramatic. No stamps, no "LIMIT" text beyond the real UI line.

**P04 (9:8). "So I built this agent board with Paperclip, an open source repo."**
Opens on the REAL Paperclip GitHub repo header (capture 11: paperclip mark tile, "paperclip", "Public",
Star 99.6k, Fork 16.8k, the About line) rebuilt as DOM in GitHub dark, camera already drifting in. On
"Paperclip" (f68) the star count ticks up the last digits (99.5k -> 99.6k) and the camera pushes into the
paperclip mark; the mark becomes the doorway (continuous zoom through it, motion blur) into FounderOS's
Agents page "Board live": seats populate in a staggered wave with live spinners, the Conductor rail on the
side. Land on the board on "open source repo" (f93-118), seats running, hold.

**P05 (9:8). "On the left is my Codex plan and on the right is my Claude Max subscription."**
FounderOS Usage page (sidebar + topbar chrome from capture), two PlanCards side by side: LEFT Codex
(ChatGPT Pro), RIGHT Claude (Claude Max 20x), State A numbers. Opens with the page already rising in (the
product's own .bn-rise slide-up). "left" (f44) camera glides to the Codex card, meters sweep in (VolumeMeter
1.2s sweep) to 60% session / 87% weekly; "right" (f89) camera travels right to the Claude card, its meters
sweep to 20% / 34%; "subscription" (f135) pull back to the two-card hold. Ambient: ok-dot blink, burn
numbers ticking, last-activity "now".

**P06 (9:8). "And I set each agent up with whatever model I want. The conductors being Opus 5.5 and GPT-6 Astra."**
Agents board: grid of SeatChips (SEATS). Bennett's plain arrow cursor clicks a seat's model line and picks
a model; across the grid the model lines resolve one after another (each a short type-on of the real slug,
`claude-sonnet-5-5`, `gpt-6-astra`, `claude-haiku-5-5`), staggered on "whatever model" (f37-49). On
"conductors" (f84) the camera rises to the top of the board where the two Conductor seats (Crown glyph,
ConductorEmblem) sit above the grid; on "Opus 5.5" (f109) the Claude conductor's model line resolves to
`claude-opus-5-5 · claude_local` and its emblem breathes; on "GPT-6 Astra" (f162) the Codex conductor
resolves to `gpt-6-astra · codex_local` and its emblem sweeps; hold on both, seats below running.

**P07 (9:16). "As you can see, Codex is at 87% on the week, as I've been using it more than Opus."**
Full-screen Usage view built vertically: the real "Plan Limits · official gauges only" panel (capture 01c, four
stacked gauges) is a natural 9:16 hero, with the two PlanCards stacked below it (Codex on top, Claude below). Tight on the Codex card's
"Weekly limit · 7d" meter: on "Codex" (f34) the weekly fill sweeps up through green into amber and lands on
"87% · resets in 3d" right on "87%" (f44-63); the hatched fill glows amber. "more than Opus" (f98) the
camera pulls back to show the Claude card below at 34% and the two LaneBars/WindowStrips: Codex burn
clearly larger. End hold with the 87% readable.

**P08 (9:16). "And once that maxes out, it automatically switches to my other conductor, which is running Opus 5.5."**
Opens on P07's end state. "maxes out" (f15-36): Codex weekly 87 -> 100%, red, "100% · resets in 3d". On
"automatically switches" (f40-68) the hand-off happens with no cursor: the Conductor dock (ConductorComposer
model label, right edge) shows `gpt-6-astra`; the Codex Conductor seat dims to idle while the Claude
Conductor seat goes live (green), the emblem sweep travels across, and the dock's model label rolls to
`claude-opus-5-5` on "other conductor" (f79-105). Camera follows the hand-off from the Codex card up/down to
the conductor seats to the dock. "running Opus 5.5" (f179-210): the Claude plan card's meters start rising
(34 -> 36%) while the Opus seat's elapsed timer ticks. Hold.

**P09 (9:8). "And the work just moves over to my Claude plan and the agents don't even notice."**
Board + plan in one frame: seats keep running uninterrupted (spinners never stop, elapsed timers keep
counting across the whole part), their run-feed lines keep landing; the "Agent board" lane of the CLAUDE
card's LaneBar grows and its weekly meter keeps climbing from P08's end state (41% -> 43%, session 33% -> 36%) on "Claude plan" (f75-93) while the Codex card
sits at 100% (dimmed, red). On "don't even notice" (f117-150) a slow push into one running seat whose model
line reads claude-opus-5-5 and whose timer just keeps going. Hold.

**P10 (9:8). "And all of my tasks just keep moving automatically."** (90f, fast but smooth)
Tasks page "Local kanban" (To do / In progress / In review / Done, the captured cards + counts from TASKS). No cursor. Cards advance on
their own: an In Progress card lifts, travels to Done and strikes through; a To Do card slides into In
Progress; counts tick (3 -> 2 -> 3, 4 -> 5). Three moves staggered over the line, camera drifting
right with the flow. Done column ends with a fresh struck-through card. Hold ~15f.

**P11 (9:8). "And I only pay two monthly flat bills and I get around $10,000 worth of API tokens for the cost of $400."**
Left: two flat bill cards in Monolith style: "ChatGPT Pro" $200/mo and "Claude Max 20x" $200/mo (with the
official marks), landing on "two monthly flat bills" (f53-99). Right: the month's token volume (real
`fmtTokens` style, e.g. 1.2B tokens) converting at the real API rate into an API-equivalent value that
counts up to ~$10,000 on "$10,000" (f124-147). On "$400" (f223) the two bills sum to $400 and the camera
frames $400 against $10,000 in one shot. The contrast is in the numbers, no captions. Hold.

## Build-verify loop (every builder)
1. Read: this BRIEF, theme.ts, ui.tsx, the captures listed for your part, the clean-motion README.
2. Code your file only. `npx tsc --noEmit` must pass.
3. Stills: `npx remotion still src/index.ts <CompId> out/bc-check/<part>-fNNN.png --frame=NNN` at ~8 frames
   spread over the part (every camera destination + the end). LOOK at each with Read. Compare to captures.
4. Iterate until it is smooth, real, and busy in every beat.
5. Do NOT render the MP4. The orchestrator renders all parts serially (memory pressure rule).
6. Before any still batch: `memory_pressure | tail -1`; only run if free >= 20%. One still at a time.

## Return format (raw, no essay)
- file, final duration, comp id
- still paths you checked
- PASS/FAIL: real UI matches captures / no narration text / something moving in every 20f window /
  smooth bezier + motion blur on moves / opens mid-motion + end hold / safe zones / (P01) reads as 3D
- anything the orchestrator must check

## Waves
- Wave 1 (foundation): CAPTURE agent (FounderOS run locally with fixtures, Playwright captures) +
  ORCHESTRATOR (theme.ts, stubs + Root registration, ui.tsx ported components, this BRIEF). Gate: tsc clean,
  captures present, ui.tsx stills match captures.
- Wave 2: builders P01 + P05 (3D hook + the base Usage view everything else continues from).
- Wave 3: P07 + P08 (the 9:16 switch).  Wave 4: P04 + P06.  Wave 5: P09 + P10.  Wave 6: P02 + P03.
  Wave 7: P11. Each wave gates on the orchestrator viewing stills.
- RED TEAM: one reviewer agent over all stills + MP4s (fidelity to captures, rule violations, continuity).
- SHIP: orchestrator renders serially (concurrency 1, memory gate), check:black, delivers to
  `CREATORS/bennet/reels/founder-os/Conducter reel/graphics/` named by DELIVERY, opens each for Victor.
- Skipped from the framework on purpose: git worktrees (one file per builder in a shared Remotion repo is
  the territory boundary; worktrees would duplicate node_modules and the heavy Remotion cache).
