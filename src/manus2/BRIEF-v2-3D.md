# manus2 v2: 3D ADDENDUM (Victor, Oct 1 2026). This OVERRIDES the flat-camera parts of BRIEF-v2.md.

Victor: the Manus v2 graphics, especially the hook, must match the depth/perspective motion of Ahmed's Fish 8 series.
"Very visually stimulating, not flat 2D panels." A flat pan/zoom over a flat panel is now a FAIL, even a clean one.

## Watch these first (extract ~8 frames each with ffmpeg and Read them; read the sources)
- Approved hook: `<creators-folder>/ahmed/reels/brand deals/fish.audio/fish 8/Almost nobody in sales is.mp4`
  source `src/fish8/F8P01Crowd.tsx` (crane from top-down to eye level over a crowd on a perspective floor, look-at
  camera, depth of field that grows as the camera drops, contact shadows, horizon haze, CameraMotionBlur, whoosh).
- Its continuation: `.../fish 8/I built my team a.mp4`, source `src/fish8/F8P01Team3D.tsx` (same world, keyed
  camera position + look-at target, things part and slide in depth).
- `src/fish8/F8P01Wire3D.tsx` (three.js version; reference only, do not default to three.js).
- Clean-motion rules still apply: `~/.claude/skills/liam-remotion-graphics/reference/examples/fish8-live-wire-smooth/README.md`.

## What "3D" means here
- ONE 3D world per part with a real camera: position + look-at target keyed over time (crane, dolly, push-in through
  depth, orbit arc). The camera never stops evolving: every beat changes position AND angle, then settles for the end hold.
- Layered depth: foreground objects pass close to the lens (large, soft, out of focus), a mid-ground hero, and a
  background that recedes to a hazy horizon. Parallax between the layers must be obvious in any 10-frame window of a move.
- A perspective floor in the Merydian world: `MRD.bg` ground, the faint grid lines of `MRD_GRID` receding to a
  horizon, soft green world light (`MRD.green` at low alpha) only as light on the floor/haze, never as glow on UI.
  Contact shadows under every object that stands on or hovers over the floor.
- Depth of field: blur by distance from the focus plane (CSS `filter: blur()` per layer/object, quantized so it
  renders fast). The hero is always sharp.
- `CameraMotionBlur` from `@remotion/motion-blur` (shutterAngle 180, samples 8) around the scene, as in F8P01Crowd.
  If render time explodes, drop samples to 5 before dropping the blur.

## How to build it (recommended)
Manus UI must stay real DOM (faithful to the captures), so put the UI on PLANES in a CSS 3D scene:
- A stage div with `perspective: <F>px` and `perspective-origin`, containing a world div with
  `transform-style: preserve-3d` whose transform is the inverse camera (rotateX/rotateY then translate3d), computed
  from your keyed camera position + look-at each frame. Every plane (Studio window, calendar sheets, clip cards,
  timeline) is an absolutely positioned div with its own `translate3d(...) rotateX/Y(...)` and
  `backface-visibility: hidden`. Keep `preserve-3d` on every ancestor between stage and planes; do not put
  `overflow: hidden`, `filter` or `opacity < 1` on the preserve-3d ancestors (they flatten the 3D context). Apply
  blur/opacity on the planes themselves or their children.
- Or, for many small repeated objects (a field of calendar blocks), project them by hand exactly like F8P01Crowd
  (`sx = CX + F * x / z` ...) and sort by depth.
- The floor grid: a huge plane rotated `rotateX(90deg)` with a repeating-linear-gradient grid, fading into a haze
  gradient at the horizon.
- The root of the comp stays an opaque `MRD.bg` AbsoluteFill. The safe-frame wrapper scales your whole comp to 80%;
  that is fine for CSS 3D as long as the perspective stage is inside your comp.
- Chrome renders CSS 3D deterministically; check stills at several frames for z-fighting, flicker and clipped planes.

## Rules that do not change
- Manus UI on the planes is faithful to the captures, light palette via `studio()`, official logo via `studioLogo()`.
  The Studio window must end each move near-frontal (at most ~8 degrees of tilt) and large enough to read at the hold.
- Still no labels, stamps, callouts, sparkles, neon, glassmorphism, gradient text, screen shake or anything that
  narrates the visual. Depth, light and camera are the stimulation; the objects stay real.
- No narration-echo text. Plain arrow cursor. No third-party brands. Bezier easing only, zero overshoot.
- The three parts are one world: same floor, same light, same Studio window object standing upright on the floor
  (bottom edge hovering ~20px above the floor with a contact shadow). Part 1 ends pushed in on the Studio window;
  parts 2 and 4 open already close to it, mid-move.

## Extra verification
Render stills every ~12 frames through each camera move and Read them: if two consecutive stills look like the same
picture shifted or scaled, there is not enough depth; add foreground/background layers or more camera angle change.
Add to your report: PASS/FAIL "reads as 3D (parallax + DoF visible)" and the render time.
