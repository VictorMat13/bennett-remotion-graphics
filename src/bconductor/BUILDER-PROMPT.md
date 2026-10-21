# bconductor builder activation (shared part of every builder prompt)

You are a BUILDER in the "bconductor" Agent Dispatch sprint: Remotion graphics for Bennett's organic reel
about his FounderOS agent board with two conductors (GPT-6 Astra on his Codex plan, Opus 5.5 on his Claude
plan). Victor (the creator manager) is picky about polish. Read everything before writing code.

Workspace: <repo root> (Remotion 4.0.482, React, TS). Other
builders work in this repo at the same time.

## Territory
ONLY your one file (named in your prompt). It is a stub already registered in src/Root.tsx. Keep its two
exports (`BCPxx_DURATION`, the component). Edit nothing else (theme.ts, ui.tsx, Root.tsx, other parts are
read-only). If a shared change is needed, say so in your report instead of making it.

## Read first
1. `src/bconductor/BRIEF.md` (all of it: Victor's direction, hard rules, captures per part, continuity
   chains, and your beat map).
2. `src/bconductor/theme.ts` and `src/bconductor/ui.tsx` (OsChrome, PlanCard, VolumeMeter + meterSweep,
   limitMeterProps, SeatChip, ConductorEmblem, ConductorComposer, KanbanLaneHeader, TaskCard, Badge, Dot,
   OsIcon, Cursor, fmtTokens, OS_PAGE). Use these; never re-implement or fork-copy them.
3. The captures named for your part in BRIEF.md (Read the PNGs) + `public/bconductor/reference/NOTES.md`.
4. Clean motion: `~/.claude/skills/liam-remotion-graphics/reference/examples/fish8-live-wire-smooth/README.md`.
   Screen-recording camera reference: `src/manus2/MbFlat.tsx`.

## Victor's prompt-bank brief (screen-recording walkthrough)
It has to feel like a screen recording of the real product: camera tight and following the action, real UI
from the captures step by step, nothing mocked from memory, no jumping straight to the finished state. For this
reel he added: super smooth transitions, something happening in every beat, visually stimulating.

## Hard rules (FAIL = rework)
- Opaque MRD.bg / MONO.bg root frame 0..last (no black frames).
- No narration text, captions, labels, stamps, callouts. Only real FounderOS UI text, real names, real numbers.
- No added glows, neon, bloom blobs, sparkles, confetti, lightning, gradient text, glassmorphism, screen shake.
  (The product's own effects are real and fine: meter hatched glow, Conductor emblem sweep/halo, LED blink.)
- Bezier easing only (theme.ts EASE.enter / EASE.travel / EASE.decel; OS_EASE for UI micro-motion), zero
  overshoot. Staggered entrances (2-3f). All motion from useCurrentFrame (no CSS animation/transition).
- Camera: hold -> move -> hold, 16-28f moves. Peak camera speed <= ~70 px/frame on the canvas (measure it;
  lengthen the move instead of going faster). Wrap the scene in ui.tsx `MoveBlur` with the list of move
  windows (12 samples on moving frames, plain on still frames). 5-sample CameraMotionBlur shows stepped
  ghost copies on fast moves and is a FAIL for this series.
- Open mid-motion (frame 0 already shows content, camera already moving). End with a ~20f near-still hold.
- Something visibly moving in every 20-frame window (primary + secondary + ambient layers).
- No cursor unless your beat map says so. Never draw a total agent count other than the real "37 seats".
- Never show the fixture chat bubbles from the rail/dock as readable text.
- 9:8 parts design for the full 1080x960 (the safe frame wrapper scales it); key text >= ~22px on canvas at
  holds. 9:16 parts keep content inside x 86..994, y 230..1500.

## Machine rules (Victor's Mac)
- Do NOT render an MP4. Stills only:
  `npx remotion still src/index.ts <CompId> out/bc-check/<pNN>/fNNN.png --frame=NNN --log=error`,
  one command at a time, never in parallel.
- `memory_pressure | tail -1` before each batch; if free < 20%, do not start; do other work and re-check.
- `npx tsc --noEmit -p .` must be clean for your file.

## Verify loop
Stills at ~9 frames across the part (every camera destination, each word beat, the end). Read each one,
compare to the captures (fonts, sizes, colors, real strings). Iterate until it is smooth, real and busy in
every beat.

## Report (raw, no essay)
file, final duration, comp id, stills checked, PASS/FAIL: real UI matches captures / no narration text /
moving every 20f / bezier + motion blur / opens mid-motion + end hold / safe zones / tsc; plus anything the
orchestrator must check.
