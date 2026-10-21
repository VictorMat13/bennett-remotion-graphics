# Bennett x Manus 2.0 v2.1 — DISPATCH (2026-10-08)

Manus approved the v2 reel (Oct 7) with three asset edits. This sprint ships them.
ORCHESTRATOR: Claude (main session). Builders: three parallel agents (Opus), one file
territory each, same checkout (no worktrees: territories never overlap; Root.tsx is
registered by the orchestrator, builders never touch it). RED TEAM pass + renders by the
orchestrator after every builder reports. Victor approves renders before delivery.

Delivery folder: CREATORS/bennet/reels/brand deals/MANUS/manus 2.0/graphics
Delivered file names = the script's opening words (existing convention).

## Script context (v2.1, locked)
HOOK (VO, never on screen): "My agency got so busy, I didn't have time to make content. So I set up an agent to edit my videos."
  Manus: open with 1-2s of the finished Reel (or raw-clips vs final split) with the line as VO; on-screen text "Raw clips → ready-to-post Reel".
WALKTHROUGH 0:08-0:32 (4 flat screen-recording parts in MbFlat.tsx): lower-third must read "Video Editor · Manus Studio".
PAYOFF (VO): "Even when my agency is slammed, I can still get a polished video ready to post." then the CTA.
  Manus: add a quick export moment, then show the finished video on an Instagram post or profile.

## Shared rules (all builders)
- Read first: src/manus2/MbFlat.tsx (the flat literal-recording pattern), src/manus2/studio.ts (Studio palette; use `studio("dark")` tokens, the real app is dark), src/manus2/theme.ts (MRD ground, MANUS_FONT, MANUS_LOGOS), src/holo/SafeFrame.tsx.
- Approved motion bar: ~/.claude/skills/liam-remotion-graphics/reference/examples/fish8-live-wire-smooth/README.md. Bezier only: entrances (0.05,0.7,0.1,1), travel (0.65,0,0.35,1), decel (0.2,0,0,1). Zero overshoot. No glows, bloom, neon, gradient text, glass. Staggered entrances 2-3f apart. CameraMotionBlur (shutter 180, samples 8) around moving layers.
- NO invented labels, stamps, chat bubbles or captions. The only on-screen text allowed is what Manus asked for (listed per part) plus real in-world UI text.
- Open mid-action (something already moving at frame 0). End on a settled hold (last ~20f near-static, micro-motion only).
- Root <AbsoluteFill> paints MRD.bg opaque at frame 0. No black frames ever.
- Safe zones: 9:16 parts keep content inside 5% sides, below the top 10% and above the bottom 12%. 9:8 parts are wrapped by withSafeFrame in Root (10% sides, 15% top), so build them in plain 1080x960 coords with ~40px inner margins.
- Fonts: MANUS_FONT (system stack) for UI text; call loadManusFont() if you use the serif. Inter via @remotion/google-fonts is fine for the IG mock.
- Real assets only (public/manus2/...). Do not add files to public/. Do not edit Root.tsx, studio.ts, theme.ts, or any file outside your territory.
- Do not render video. Verify with stills only: `npx remotion still src/index.ts <CompId> out/mb3/<CompId>-<f>.png --frame=<f>` at 4-5 frames (0, each beat, last). Look at them. Typecheck: `npx tsc --noEmit -p .` must pass for your file.
- Report: what you built, beat map with frame numbers, the stills you checked, anything you could not verify.

## Assets (already in public/manus2)
- ig/final-reel.mp4  720x1280 @30, 21.8s, muted. The finished Reel (Holo-safe cut). Loop it if you need more.
- ig/raw-1.2.jpg, raw-4.8.jpg, raw-8.6.jpg, raw-12.4.jpg, raw-16.9.jpg  1080x608 (16:9) frames of the SAME footage with no captions = the raw clips. studio/clip-frame.png (468x262) is the original raw C1107 thumbnail.
- ig/avatar.jpg  320x320 Bennett's real IG profile picture. Handle: bennett.spooner (verified, blue check). Display name: "Bennett Spooner | AI Automation".
- rec/p6.mp4  2578x1796 (2x of the 1289x898 window CSS px), 489f: the real Studio Video Editor at the end of the session, final cut playing, chat shows "Reel with quieter music". rec/p6-last.png = its last frame.
  Window CSS px geometry (divide 2x by 2): Export button x 1221..1278, y 55..83 (text "Export", light pill on dark). Preview video rect x 633..918, y 108..614 (9:16). Play button ~x 779, y 648. Chat column x 0..555.
- logos/manus-mark-white.svg, manus-word-white.svg (use white on the dark ground / dark app).

## PART A — builder A — territory: src/manus2/MbP0RawClipsToReel.tsx (NEW, stub exists)
Comp: MbP0RawClipsToReel, 1080x1920 @30, MBP0_DURATION = 75 (2.5s). Cold open before Bennett appears; the hook line plays as VO over it.
On-screen text (the ONLY text, exactly): Raw clips → ready-to-post Reel
Scene (flat 2D on the Merydian ground; same ground recipe as MbFlat: MRD.bg + MRD_GRADIENT.ground + the vertical MRD_GRID lines):
- Frame 0: the finished Reel is ALREADY playing inside a phone-shaped 9:16 frame (rounded 48px, hairline border MRD.hairline, panelShadow; video ig/final-reel.mp4 via OffthreadVideo muted, start at ~1s in) centred-right, about 520px wide, vertically centred a little above the middle (keep clear of the top 10% / bottom 12%).
- 0-24: four raw clip cards (ig/raw-*.jpg, 16:9, ~300px wide, radius 14, hairline border, slight rotations -6..+5deg) enter from the left edge in a staggered wave (3f apart, ENTER easing, 60px travel + fade), settling as a loose fanned stack on the left third, overlapping the phone's left edge by nothing (gap ~40px). Subtle contact shadow under each card.
- 18-40: one crisp 2px line (MRD.text at 60% opacity, no glow) draws from the stack to the phone's left edge with travel easing; a small solid arrowhead lands last. (This is the "→" of the brand's text made physical; keep it quiet.)
- 26-44: the text rises in below the phone+stack group (one line, MANUS_FONT 600, 56px, MRD.text, letter-spacing -0.5px), ENTER easing, 16px rise + fade. The arrow glyph in the text must be the real "→" character.
- 44-75: hold. Micro-motion only: the reel keeps playing, the stack drifts 2px, the line stays.
Camera: a very slow push (scale 1.00 → 1.03 over the whole part, travel easing) on the whole scene, under CameraMotionBlur. Nothing else moves the camera.
Check stills at 0, 12, 30, 44, 74.

## PART B — builder B — territory: src/manus2/MbFlat.tsx (edit) + src/manus2/LowerThird.tsx (NEW)
Add the lower-third "Video Editor · Manus Studio" to all four flat parts (a3, b3, a5, b5) through the shared `make()`.
- New component LowerThird in LowerThird.tsx: a dark pill (background MRD.card, 1px MRD.hairline border, radius 999, height 64, padding 0 22px, panelShadow softened to "0 10px 30px rgba(0,0,0,0.45)"), containing the Manus mark (logos/manus-mark-white.svg, 28px) then the text "Video Editor · Manus Studio" in MANUS_FONT 600, 26px, MRD.text, with the middle dot as the real "·" character. No glow.
- Placement from useVideoConfig: left = width*0.05 (+ nothing else); bottom margin = height >= 1500 ? height*0.14 : 44. It sits above the Studio window on its own layer (after the window div, before the DropCard layer).
- Enter at frame 8: ENTER easing over 14f, 14px rise + fade 0→1. Hold to the end (never exits).
- Keep every existing camera key, footage, DropCard and duration untouched. The four exports keep their names.
- Make LowerThird accept an optional `enterAt` prop (default 8) and export it so Part C can reuse it.
Check stills at frames 0, 12, 60 for MbFlat3aVideoEditorInside916 and MbFlat3bDropMyClipsIn (the 9:8 one is wrapped by withSafeFrame in Root, so check the wrapped comp id).

## PART C — builder C — territory: src/manus2/MbP6SlammedExport.tsx (NEW, stub exists)
Comp: MbP6SlammedExport, 1080x960 @30 (wrapped by withSafeFrame in Root), MBP6_DURATION = 195 (6.5s). Covers "Even when my agency is slammed, I can still get a polished video ready to post."
Beat 1 (0-58) — the export moment, flat literal screen recording (copy MbFlat's pattern: the 1289x898 window plane, OffthreadVideo rec/p6.mp4 muted, 2D camera keys {f,cx,cy,s} with the (0.65,0,0.35,1) easing, Merydian ground showing around the window).
  - The preview rect (x 633..918, y 108..614 window px) must be PATCHED: overlay ig/final-reel.mp4 (muted, object-fit cover, same radius as the preview) playing there for the whole beat, so the preview shows the Holo-safe Reel. Start it at ~2s in.
  - Camera: f0 whole editor (cx 765, cy 470, s 1.25) → f14 hold → f30 ease toward the top-right so the Export button is large and clear (cx ~1120, cy ~120, s ~2.3) → hold through the click.
  - Plain arrow cursor (reuse cursorAt / pressAt from ../holo/HoP5OnTheCalendar, draw the same white arrow with dark outline used in MbP1AgencyGotSoBusy; look at how MbP1 renders the cursor and copy it). Cursor starts near the play button (779,648) at f0, travels to the Export button centre (1249,69) over f16-40 and presses at f44 (pressAt). On press, the real button area gets a 1-frame-soft darken (rgba(0,0,0,0.18) over x1221..1278 y55..83, fading over 8f). Nothing else is invented on the Studio screen: no dialog, no progress bar.
Beat 2 (58-118) — the export becomes the post. The Reel lifts out of the preview rect as a card: a 9:16 card showing final-reel.mp4 (continuous playback, same source time) scales up from the preview rect's screen position and travels to the right half of the frame (decel easing, ~34f), while the Studio window eases away left and down (scale to ~0.78, x -260, opacity to 0.0 by f112, travel easing) under CameraMotionBlur. By f96 the card has settled as the media of an Instagram post card that assembles AROUND it:
  - IG post card (dark mode, Inter): width 560, radius 24, background #000, 1px rgba(255,255,255,0.12) border. Header row (56px): ig/avatar.jpg 36px circle, "bennett.spooner" 600 22px #FAFAFA + a 16px blue verified badge (Instagram's blue #0095F6 rounded 8-point seal with a white check, draw it in SVG), then "•  Original audio" in #A8A8A8 20px, "…" at the right. Media 4:5 (560x700) showing the Reel (object-fit cover). Action row (52px): heart, comment bubble, paper-plane, bookmark as thin 2px white line icons (SVG, 26px). Caption block: "bennett.spooner" 600 then the real caption's first line in 20px #FAFAFA: "My agency got so busy I stopped making content. Now I drop my raw clips into the video editor in Manus Studio…" (ellipsis after "Studio", one line + " more" in #A8A8A8). Below it "#ManusPartner #ad" in #E0F1FF. No like counts, no comments, no timestamps (those would be invented).
  - Assembly order (staggered, 2-3f apart, ENTER easing, 10px rises): header → action icons left-to-right → caption → hashtags. The card's border/background fades in under the media as it lands (f90-100).
  - The post card ends centred, ~0.92 scale so it fits the 9:8 frame with the header and action row visible (the caption may sit near the bottom edge; keep it inside the frame).
Beat 3 (118-195) — hold. The Reel keeps playing inside the post. Camera: a slow 1.00 → 1.02 push. Nothing else.
No on-screen text beyond the IG UI strings above. Check stills at 0, 40, 46, 80, 100, 194.
