# manus2 v2 series: shared builder brief (Bennett x Manus 2.0, "My agency got so busy", Oct 2026)

The reel was re-centered on the Manus Studio Video Editor. The old MaP1-MaP6 parts (2 a.m. lead story) are retired
but stay on disk: never edit or delete them. Three new parts cover the TALKING-HEAD beats only. The product demo beats
are Bennett's real screen recording, so these graphics must look like the same app the viewer sees seconds later, and
must NOT re-enact the first cut being built or the refine prompts being typed.

You are one of three parallel builder agents. Other agents are working in this repo RIGHT NOW. **Edit only the comp
file named in your prompt.** It is already registered in Root.tsx (never touch Root.tsx, theme.ts, studio.ts, this
brief or any other file). Keep the file's two exports (component + `<NAME>_DURATION`). You may change your DURATION.

Project root (run everything here): `<repo root>`

## Read ALL of this before coding
1. `~/.claude/skills/liam-remotion-graphics/SKILL.md`
2. `~/.claude/skills/liam-remotion-graphics/reference/upstream/cinematic-camera.md`
3. `~/.claude/skills/liam-remotion-graphics/reference/examples/fish8-live-wire-smooth/README.md`
   (Victor's approved "very clean" motion baseline: bezier easing, no glows, staggered entrances, follow camera).
4. `src/manus2/studio.ts` (READ-ONLY): Studio palette via `studio()`, logo via `studioLogo()`, window geometry
   `STUDIO_WIN`, every real UI string, `STUDIO_ASSETS.clipFrame`. Also `src/manus2/theme.ts` (READ-ONLY; re-exports
   `src/fishos/theme.ts`): `MRD`, `MRD_GRADIENT`, `MRD_GRID`, `SPRINGS`, `MANUS_FONT`, `MANUS_SERIF`,
   `loadManusFont()` (call it at module top).
5. Bennett's approved series look, which THIS REEL MUST MATCH: `src/holo/BRIEF.md`, `src/holo/HoP5OnTheCalendar.tsx`
   and `src/holo/HoP0bBuriedInClientWork.tsx` (Merydian dark ground, green world light, faint vertical rules, ONE light
   app panel floating on the dark with a big soft shadow, keyframed camera following a cursor). LOOK at the renders:
   extract 3 frames each from 2 MP4s in `<creators-folder>/bennet/reels/brand deals/holo/graphics/`
   and Read them. You MAY import these generic helpers from `../holo/HoP5OnTheCalendar` (read-only): `Ground`,
   `WorldRules`, `makeCam`, `cursorAt`, `pressAt`, `clampOpts`, type `CK`. Do NOT use its `CursorLayer`, `Sidebar` or
   `AppWindow` (Claude chip, coral ripples, Holo UI). The old `src/manus2/MaP3TeamOfAgents.tsx` has a clean plain
   arrow `Cursor` with a neutral ripple and a Manus `Sidebar` you may copy code from (copy, do not import).
6. THE STORYBOARD (real Manus Studio desktop app, Bennett's account, captured Oct 1 2026):
   `public/manus2/studio/*.png` are 1512x982 at 1x CSS; `raw-latest-2x.png` and `raw-t660-2x.png` are full Retina for
   detail. Full-res originals of every frame:
   `<creators-folder>/bennet/reels/brand deals/MANUS/manus 2.0/capture/studio/ui-refs/`.
   READ every screenshot your part uses and crop into the regions you rebuild (PIL or sips) to see detail.
   Rebuild those screens in React (real layout, spacing, radius, icons, fonts) in the Studio window's own coordinates
   (`STUDIO_WIN`: the window is 1289x898 CSS px), then let the camera zoom in. Do NOT paste a screenshot as a flat
   image. Need another state? Pull frames from the raw screen recording yourself:
   `ffmpeg -ss <sec> -i ".../capture/studio/studio-walkthrough-raw.mp4" -frames:v 1 out/tmp-x.png` (about 12 minutes
   long; steps: 0:03 open Create, 0:54 attach clip, 1:04 type brief, 1:27 send, then the editor run).

## Light panel, real layout
The live app is in dark appearance. The series look is a LIGHT Manus panel on the Merydian dark ground, so render
with `const S = studio();` (light by default). Take EVERY Studio color from `S` so the palette can flip to dark with
one switch: no hardcoded hex inside the Manus window (macOS traffic lights excepted). Geometry, spacing, type sizes,
strings and icons come from the captures. The video preview canvas stays black, and video thumbnails use the real
frame `STUDIO_ASSETS.clipFrame` (`<Img src={staticFile(...)}>`), never an invented picture.
Before you finish, temporarily call `studio("dark")` + `studioLogo("dark")`, render one still, confirm it reads, then
switch back to the default. Report that still path.

## Safe frame (important for sizing)
Root.tsx wraps your comp in `withSafeFrame` (`src/holo/SafeFrame.tsx`): your 1080x960 canvas is rendered scaled to
80% inside an inset rounded screen (10% sides, 15% top) on the Merydian ground. So: design a full 1080x960 frame with
an opaque `MRD.bg` root; do not add your own outer safe padding beyond ~40px; and remember everything shrinks to 80%,
so frame TIGHT. UI text the viewer should read must be at least ~30px tall on your canvas at the camera's hold zoom.
Render stills/MP4 from the registered comp id (already wrapped) so you judge the real output.

## Series rules
- Canvas 1080x960 (9:8), 30fps.
- IT MUST FEEL LIKE A SCREEN RECORDING of Bennett's Manus Studio: a plain macOS arrow cursor moves (eased, slightly
  curved paths), clicks (press scale + neutral ripple, white or `S.brand` tint), text types character by character
  with a caret (string slicing), states change the way they do in the app. Never jump straight to a finished result.
- No Claude/Opus driver chip, no third-party brands, logos or model names anywhere (Manus brief). Official Manus
  logo only via `studioLogo()`: black inside the light panel, white on the dark ground. Never recolor or distort it.
- NO vibe-coded graphics: no stamps, badges, callout labels, arrows with captions, sparkles, glows, bloom, gradient
  text, glassmorphism, confetti, screen shake, or anything that narrates the visual. One idea per beat. Soft, smooth
  motion. Zero overshoot on entrances.
- No narration-echo text: never put Bennett's spoken words on screen. Only real UI strings from studio.ts, plus
  in-world UI data where the beat map explicitly allows it.
- Easing: bezier only, never linear. Entrances `Easing.bezier(0.05,0.7,0.1,1)`, on-screen travel
  `Easing.bezier(0.65,0,0.35,1)`, decel `Easing.bezier(0.2,0,0,1)`. Stagger inner elements 2-4 frames.
- Camera: tight on the action, following the cursor like a zoomed screen recording (hold, move, hold; 14 to 24 frame
  moves). Open with something already in motion at frame 0. Micro-motion during holds (caret blink, cursor drift,
  Working dot pulse). End with a ~25 frame clean hold.
- No em dashes or en dashes on screen. Never render anything in `DO_NOT_RENDER_STUDIO` / `DO_NOT_RENDER_MANUS`, the
  macOS desktop, menu bar, widgets or Dock. Privacy: no real email addresses, no file-system paths.
- All motion via useCurrentFrame / interpolate / spring. Opaque background frame 0 to last.

## Build-verify loop
```bash
npx tsc --noEmit
npx remotion still <CompId> --frame <N> "out/<CompId>-f<N>.png"   # every beat; LOOK at each with Read next to the capture
npx remotion render <CompId> "out/<CompId>.mp4" --concurrency=3
npm run check:black -- "out/<CompId>.mp4"
```
Not done until tsc passes (for YOUR file; ignore errors in other agents' in-progress files but report them),
check:black passes, and you have compared stills to the matching captures and to the Holo renders. If a still looks
like a cheaper system than the Holo parts, rework before reporting.

## Return format (raw data, no prose)
comp id, final duration frames, mp4 absolute path, PASS/FAIL for tsc / check:black / margins / no-echo-text /
matches-captures / no-hardcoded-studio-colors, 3 light still paths + 1 dark still path, flags for the checker.
