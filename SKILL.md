---
name: bennett-style
description: Build Remotion videos in the Bennett "Anthropic-Matrix" aesthetic — coral on near-black, code rain, glowing Claude branding, monospace+sans typography. Use when Victor asks for a Bennett-style video, Claude/Anthropic-themed reel, Matrix-coral graphic, or anything in the look of the 4-claude-tricks reels (plan-mode, self-healing, etc.). Triggers on phrases like "bennett style", "matrix coral", "claude reel", "anthropic matrix", or when continuing the 4-claude-tricks series.
---

# Bennett Style

The visual language Victor uses for the Bennett brand-deal-driven Claude educational content. Coral-on-near-black "Anthropic-Matrix" aesthetic with Matrix-style code rain underneath everything.

Reference videos (all in the original "4 claude tricks" series, not included here):
- `plan-mode.mp4` (move 1)
- `self-healing.mp4` (move 3)
- `4-claude-tricks-hook.mp4` (4:3 hook)

Project source: the `templates/` folder in this repo (ported from the original matrix-graphic project)

---

## CORE AESTHETIC

- **Background**: Near-black `#0A0806` with deep matte `#000000` underneath
- **Primary accent**: Anthropic coral `#CC785C` and brighter `#E89A7E`
- **Text**: Cream `#F5E6D8` for primary, muted gray for settled UI
- **Atmosphere**: Matrix code rain in coral, subtle vignette, scanlines, corner brackets
- **Typography**: JetBrains Mono for code/UI, Inter for headlines, Playfair Display for big numbers
- **Motion**: Frame-based via `interpolate()` and `spring()` — never CSS animations. Snappy springs (`damping: 200`), no bounce.

---

## CANVAS SIZES

- **Reel** (TikTok/Reels/Shorts): 1080 × 1920, 9:16, 30fps
- **Hook/landscape** (Twitter/Web): 1440 × 1080, 4:3, 30fps
- Always 30fps.

---

## REEL STRUCTURE (~14s)

```
0.0 - 1.5s    OPENER       "> THE MOVE" eyebrow + giant serif number + italic title
1.5 - 9.5s    DEMO         Terminal mockup OR file mockup OR custom UI demo
9.5 - 14.0s   PUNCHLINE    Giant italic word + small supporting line
```

Don't add a kinetic-text "instruction" scene if the demo already shows the action — text repetition makes it feel padded. Let the demo carry the meaning.

End on the punchline. No outro card or "MOVE X / Y" framing — feels episodic and tedious.

---

## DESIGN SYSTEM

```typescript
// colors.ts
export const C = {
  bg:        '#0A0806',
  bgDeep:    '#000000',
  coral:     '#CC785C',
  coralBright:'#E89A7E',
  coralDim:  'rgba(204, 120, 92, 0.45)',
  coralFaint:'rgba(204, 120, 92, 0.18)',
  cream:     '#F5E6D8',
  ink:       '#0A0806',
  mono:      '"JetBrains Mono", "SF Mono", "Menlo", monospace',
  sans:      '"Inter", "Helvetica Neue", -apple-system, sans-serif',
  serif:     '"Playfair Display", "Georgia", serif',
};
```

Type scale (typical):
- Number opener: 560px serif coral, lineHeight 1.0, letterSpacing -10
- Subtitle ("Plan mode."): 84px italic sans cream
- Eyebrow ("> THE MOVE"): 28px mono coral, letterSpacing 10, uppercase
- Punchline word: 138-220px italic sans coralBright, lineHeight 1.15
- Punchline subtext: 50-64px sans cream
- Body in mockups: 21-28px mono

---

## REQUIRED LAYERS (every composition)

Build in this z-order, bottom to top:

1. **Background**: `<AbsoluteFill style={{ background: C.bgDeep }}>`
2. **MatrixRain**: continuous coral katakana rain, runs for entire duration
3. **Vignette**: `radial-gradient(ellipse 70% 65% at 50% 50%, transparent 0%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.92) 100%)`
4. **Scene content** (Sequences for each scene)
5. **Corner brackets**: 72px L-shaped coral brackets at 56px inset, all 4 corners, fade in 0.3s
6. **Scanlines**: `repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0 2px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0) 4px)` with `mixBlendMode: 'overlay'`

The whole composition fades out the last 0.3s.

---

## CORE COMPONENTS

Reusable from `templates/` in this repo:

- **MatrixRain.tsx** — coral katakana rain with optional cutout zone for legibility
- **ClaudeLogo.tsx** — the Anthropic spiral glyph as inline SVG path, configurable size/color/glow
- **TerminalMock.tsx** — Claude Code terminal window with prompt typing in, key animations, status pills
- **MarkdownFileMock.tsx** — CLAUDE.md-style file with bullets typing in, save pulses, counter ticking
- **Keycap.tsx** — keyboard key visualization with press animation
- **shared/colors.ts**, **shared/utils.ts** — palette + animation helpers (`fadeIn`, `springIn`, `blurClear`, `rand`)

---

## ANIMATION PRIMITIVES

```typescript
// utils.ts
export const fadeIn = (frame, fps, delaySec=0, durationSec=0.3) =>
  interpolate(frame, [delaySec*fps, (delaySec+durationSec)*fps], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

export const springIn = (frame, fps, delaySec=0) =>
  spring({ frame: frame - delaySec*fps, fps, config: { damping: 200 } });

export const blurClear = (frame, fps, delaySec=0, durationSec=0.5) =>
  interpolate(frame, [delaySec*fps, (delaySec+durationSec)*fps], [12, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

// Deterministic pseudo-random
export const rand = (seed) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};
```

---

## PUNCHLINE PATTERN

The closing scene always follows this rhythm:

```tsx
<div style={{ fontFamily: C.sans, fontWeight: 900, fontSize: 138-220,
  fontStyle: 'italic', color: C.coralBright, letterSpacing: -3 to -6,
  lineHeight: 1.15,
  textShadow: `0 0 ${30 + pulse*30}px ${C.coral}, 0 0 80px ${C.coralDim}` }}>
  MAIN_WORD
</div>
<div style={{ fontFamily: C.sans, fontSize: 50-64, color: C.cream, marginTop: 18+ }}>
  supporting line.
</div>
```

The pulse: `const pulse = 0.5 + 0.5 * Math.sin((frame / fps) * 4)` — gives a 4Hz breathing glow.

---

## CRITICAL SPACING RULES (MUST FOLLOW)

These rules came from real shipping bugs caught in audits. **Do not skip.**

1. **Giant text needs lineHeight ≥ 1.0**. Anything ≥100px font size with `lineHeight < 1.0` will have descenders/ascenders bleeding outside the line-box. For italic display weights, default to 1.15-1.22.

2. **Glow halos clip 60-100px outside the text**. If you have `textShadow: 0 0 80px coral`, any element above or below needs ≥100-170px clearance — NOT 40px. The glow blur radius is the minimum gap.

3. **Big numbers in the opener**: use `fontSize: 560`, `lineHeight: 1`, `letterSpacing: -10`, `padding: '0 40px'`. Subtitle below needs `marginTop: 56` minimum.

4. **Side margins**: every element ≥120px from left/right edges of canvas. SVG nodes ≥130px from edges. Cap headline width so widest line fits in 840px on 1080-wide canvas. (See feedback_remotion_center_padding memory.)

5. **No em dashes** in any visible copy. Use periods or commas. (See feedback_no_em_dashes memory.)

---

## MANDATORY: FRAME-BY-FRAME AUDIT BEFORE SHIPPING

Spawn an Evidence Collector subagent to render stills at 6-12 representative frames per scene before doing the final video render. This catches collisions, glow bleed, and edge clipping that aren't obvious from the code.

Audit prompt template:
```
Render stills for [composition] at frames [list] using:
  npx remotion still src/index.ts COMP_NAME out/audit-N.png --frame=N

For each frame check:
- Text overlapping other text
- Glyph descenders/ascenders bleeding into adjacent elements
- Glow halos dimming/obscuring small labels
- Elements clipping canvas edges
- Mockup windows extending off-canvas
- Bracket collisions

Default to finding 2-4 issues. Report with frame numbers and severity.
```

Re-render only the flagged frames after fixing, before committing to the full video render.

---

## RENDER COMMANDS

```bash
cd <your-remotion-project>

# Preview studio
npm start

# Single still (for verification)
npx remotion still src/index.ts COMP_NAME out/preview.png --frame=N

# Full video — use --crf=18 for high quality, h264
npx remotion render src/index.ts COMP_NAME out/output.mp4 --codec=h264 --crf=18

# Multiple stills in parallel (for audits)
for f in 30 90 170 280 360; do
  (npx remotion still src/index.ts COMP_NAME out/f${f}.png --frame=${f}) &
done; wait
```

Final delivery dir: `<delivery-folder>/<series-name>/`

---

## COMMON SCENE RECIPES

### Number opener (1.5s)
- Eyebrow `> THE MOVE` mono coral 28px letterSpacing 10
- Big number serif coralBright 560px lineHeight 1
- Subtitle italic sans cream 84px marginTop 56

### Terminal mockup (~5-6s)
- Window: 880-900px wide, dark bg `rgba(8,6,4,0.96)`, border `1.5px coralDim`, rounded 16
- Header: traffic lights + center title in mono coral uppercase letterSpacing 3
- Body min 380-480px tall, padding 32×28-40
- Type prompt with cursor blink (`Math.floor(frame/14) % 2`)
- Key visualizations using Keycap component
- Status pills with active/inactive states + glow pulse

### Markdown file mockup (~6-8s)
- Same window chrome as terminal
- 📄 emoji + filename in header
- Counter pill in header that ticks up (jumps after live phase to imply time passing: 47→48→49→50→124→312→528)
- Heading `## Lessons` with coralDim `##`
- Existing bullets fade in staggered (mute color)
- New bullets type in with coral left-border + glow + save pulse
- Settled bullets fade to muted color when next one starts typing

### Punchline (~3-4s)
- Giant italic word with breathing glow pulse
- Small supporting line below
- No eyebrow if it conflicts with the glow halo

### Visual hook card (2s, 4:3 1440×1080) — minimal text, max motion
For when the brief is "make it visually stimulating with minimal text." Single beat, no demo. Ref: `DoYourWorkHook.tsx` — 60 frames, payoff "do your work."

Layout (explicit absolute positioning — DO NOT rely on AbsoluteFill flex defaults):
- **Logo** in upper third: `position: absolute, top: 180, left: 50%, translateX(-50%)`, size 220, breathing glow 36+22*pulse.
- **Payoff text** anchored bottom: `position: absolute, bottom: 200, left/right: 140, textAlign: center`. Italic 156px, lineHeight 1.22, glow `0 0 (32+28*pulse)px coral, 0 0 (84+32*pulse)px coralDim`.
- **Logo center vs text top must clear the larger glow halo** — at 220px logo with ~58px shadow + 156px italic text with ~84px glow, keep ≥260px vertical gap between logo bottom and text top.

Motion stack (z-order from bottom up):
1. Matrix rain with cutout zone (640×440) centered on logo cy.
2. **Pulse rings** — SVG circles emanating from logo center every 0.42s, growing radius 90→610 over 1.05s, opacity (1−localT)*0.85, strokeWidth 2.5+(1−localT)*3.5. Run 3–4 of them.
3. **Counter-rotating tick rings** around logo: radius 170 (cw, 28°/s, 24 ticks) and radius 210 (ccw, 18°/s, 60 dashed ticks). Tick line segments span ±8 (solid) or ±4 (dashed) from radius.
4. **Scan beam** sweeping top→bottom once between 0.20s and 0.75s — a 180px-tall coral gradient + 1.5px-tall bright coral line, `mixBlendMode: 'screen'`, opacity bell curve (0→1 at 15%, 1→0 at 85%).
5. **RGB chromatic split** ghosts on text reveal — two extra copies of the text in coral (`#E89A7E`) and cool (`#7ED3E8`), translated ±14px, fading from 1→0 over 0.35s after main text starts. **MUST gate ghost opacity by `textOpacity * glitchProgress`** so they don't show before the main text fades in.
6. Vignette + scanlines + corner brackets as standard.

Timeline (60 frames @ 30fps):
- 0.00s: brackets fade in
- 0.05s: logo blur-clear + spring scale 0.7→1.0
- 0.20s: scan beam starts sweeping
- 0.55s: payoff text reveals with RGB-split snap-to-clean
- 1.82s: full-comp fadeOut (last 0.18s — keep brief so brackets don't disappear too long)

Why this pattern works: the rings + pulses + scan all activate at different rhythms (rotation, emission, sweep), so even with 3 words of copy the frame feels dense. The RGB split makes the text *land* on a beat instead of fading in passively.

---

## DON'TS

- ❌ Don't use Tailwind animation classes or CSS `transition:`
- ❌ Don't repeat the demo content as kinetic text scene — feels padded
- ❌ Don't add "MOVE X / Y" framing or outro cards — let it end on the punchline
- ❌ Don't use em dashes in any copy
- ❌ Don't use `Math.random()` — always deterministic with seeds
- ❌ Don't ship without the frame-by-frame audit
- ❌ Don't use `lineHeight < 1.0` on any text >80px
- ❌ Don't put glowing text within blur-radius distance of other text

---

## FILE TEMPLATES

See `templates/` directory for ready-to-copy:
- `opener-scene.tsx` — number+title opener
- `punchline-scene.tsx` — closing impact line
- `composition-skeleton.tsx` — full Sequence structure with all required layers

---

## REFERENCE BUILDS (OCT 2026): THE CURRENT BENNETT LOOK

Everything above is the original Matrix-coral look from the "4 claude tricks" reels. Bennett's current reels use a different world, shown by the two shipped series in this repo's `src/`. Build new Bennett work from these first.

- **World: Merydian dark** (Bennett's agency). Near-black ground `#0A0A0A`, faint 96px grid, spring-green `#00FFAB` used only as light on the world, never to recolor a product UI. Tokens in `src/fishos/theme.ts` (`MRD`, `MRD_GRADIENT`, `MRD_GRID`).
- **Product: the real UI, captured.** Conductor ports Bennett's FounderOS components 1:1 into `src/bconductor/ui.tsx`. Manus 2.0 plays real screen recordings on a flat camera (`src/manus2/MbFlat.tsx`).
- **Safe frame.** 9:8 parts sit in the top half of a 9:16 Reel, so they render inside `withSafeFrame` (`src/holo/SafeFrame.tsx`). 9:16 parts are full bleed.
- **Motion.** Bezier easing only, zero overshoot. Camera holds, moves for 16 to 28 frames, then holds. Keep fine text moves under about 40 px per frame. Use `MoveBlur` from `src/bconductor/ui.tsx` (12 samples, moving frames only).
- **No decoration.** No narration text, stamps, labels, glows, neon, gradient text or glass. Only real product text and real numbers.
- **Process.** One shared `theme.ts` and `ui.tsx` per series, one builder per part. The briefs that drove each build are next to the source: `src/bconductor/BRIEF.md`, `src/bconductor/BUILDER-PROMPT.md`, `src/manus2/BRIEF-v2*.md`, `src/manus2/BRIEF-v3.md`.
