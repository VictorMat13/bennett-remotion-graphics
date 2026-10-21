import React from "react";
import { AbsoluteFill, Easing, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { MRD, MRD_GRADIENT, MRD_GRID } from "./theme";
import { LowerThird } from "./LowerThird";

// ===========================================================================
// Bennett x Manus 2.0 v2: the walkthrough beats as a LITERAL screen recording
// (Victor, Oct 2 2026: no floor, no 3D camera, no depth of field). The real
// Manus Studio window footage plays flat and frontal; a 2D camera only zooms
// and pans (eased, no tilt) to follow the action. Where the zoom leaves room
// around the window, the Merydian ground shows.
//
// Footage: public/manus2/rec (cut by out/mb-check/subcut.py from
// capture/studio/clips-merydian; window-only, desktop and off-app stretches
// removed). Camera keys are in window CSS px (the window is 1289x898).
// ===========================================================================

const WIN = { w: 1289, h: 898 } as const;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const MOVE = Easing.bezier(0.65, 0, 0.35, 1);

// cx/cy: the window point held at the frame's anchor. s: scale (frame px per window CSS px).
type Key = { f: number; cx: number; cy: number; s: number };
type Part = { src: string; frames: number; anchorY: number; keys: Key[]; drop?: boolean };

// Lengths cover each spoken line at talking speed (Victor, Oct 2): the real footage plays longer / slower, and
// every part ends on a settled hold.
const PARTS = {
  // 9:16, 3.5s  "It's the video editor inside Manus Studio."  Create panel > Video > the Video page
  a3: {
    src: "manus2/rec/f3a.mp4",
    frames: 105,
    anchorY: 0.47,
    keys: [
      { f: 0, cx: 765, cy: 470, s: 1.3 }, // the whole Create panel
      { f: 18, cx: 765, cy: 478, s: 1.37 },
      { f: 42, cx: 690, cy: 565, s: 1.95 }, // Media row: the Video tile being picked
      { f: 60, cx: 682, cy: 575, s: 2.0 },
      { f: 80, cx: 765, cy: 449, s: 1.62 }, // "Every idea has a film in it."
      { f: 105, cx: 765, cy: 449, s: 1.66 },
    ],
  },
  // 9:8, 7.0s  "I drop my clips in, tell it what the video's about, and it puts together the first cut."
  // 0-36 empty prompt box, the clip drops in (3D card over the flat recording) and lands where the real
  // attachment chip appears; 36-100 brief typed; 100-155 the cut lands on the timeline; 155-210 first cut plays.
  b3: {
    src: "manus2/rec/p3b.mp4",
    frames: 210,
    anchorY: 0.5,
    drop: true,
    keys: [
      { f: 0, cx: 765, cy: 535, s: 1.25 },
      { f: 36, cx: 765, cy: 540, s: 1.3 },
      { f: 96, cx: 765, cy: 545, s: 1.32 },
      { f: 100, cx: 765, cy: 545, s: 1.32 },
      { f: 116, cx: 985, cy: 625, s: 1.7 }, // the cut landing on the timeline
      { f: 152, cx: 990, cy: 632, s: 1.8 },
      { f: 168, cx: 1000, cy: 400, s: 1.75 }, // the first cut playing
      { f: 210, cx: 1005, cy: 395, s: 1.84 },
    ],
  },
  // 9:16, 3.5s  "I just tell it what needs to change."  the chat column: prompt typed, sent, Manus answers
  a5: {
    src: "manus2/rec/f5a.mp4",
    frames: 105,
    anchorY: 0.5,
    keys: [
      { f: 0, cx: 503, cy: 449, s: 2.04 }, // the chat column fills the frame
      { f: 62, cx: 503, cy: 455, s: 2.1 }, // prompt typed and sent
      { f: 80, cx: 503, cy: 449, s: 2.08 }, // reply arriving
      { f: 105, cx: 503, cy: 449, s: 2.1 },
    ],
  },
  // 9:8, 5.0s  "Center the captions, make them bigger, and make the music quieter."
  // The preview shows Manus's real exported reels at the same instant (0:05.5), so only the caption changes:
  // lower third (first cut) -> dead centre -> bigger. Then the reply: music lowered by 6 dB.
  b5: {
    src: "manus2/rec/p5b.mp4",
    frames: 150,
    anchorY: 0.5,
    keys: [
      { f: 0, cx: 1000, cy: 400, s: 1.72 },
      { f: 106, cx: 1005, cy: 400, s: 1.95 },
      { f: 113, cx: 1005, cy: 400, s: 1.95 },
      { f: 128, cx: 345, cy: 250, s: 1.5 }, // the reply: music lowered by 6 dB
      { f: 150, cx: 345, cy: 250, s: 1.55 },
    ],
  },
} satisfies Record<string, Part>;

// ---- the dropped clip (only this card is 3D; the screen stays a flat recording) ----
const DROP = { start: 3, land: 34, gone: 41 } as const; // frames: flight, then hand-off to the real chip (footage swaps at 36)
const CHIP = { x: 392, y: 707, w: 278, h: 52 } as const; // the real "C1107.MP4" attachment card, window CSS px
const CARD = { w: 112, h: 63 } as const; // 16:9 thumbnail, at rest inside the chip
const FLY = Easing.bezier(0.45, 0, 0.15, 1); // stays big and close for the first beats, then a soft landing, zero overshoot

const DropCard: React.FC<{ left: number; top: number; s: number }> = ({ left, top, s }) => {
  const frame = useCurrentFrame();
  if (frame < DROP.start - 1 || frame > DROP.gone) return null;
  const u = interpolate(frame, [DROP.start, DROP.land], [0, 1], { ...clamp, easing: FLY });
  const out = interpolate(frame, [DROP.land + 2, DROP.gone], [1, 0], clamp);
  // rest position: left end of the chip, vertically centred in it
  const rx = left + (CHIP.x + 8 + CARD.w / 2) * s;
  const ry = top + (CHIP.y + CHIP.h / 2) * s;
  const x = rx + (1 - u) * 620;
  const y = ry - (1 - u) * 700;
  const sc = s * (1 + (1 - u) * 6.5);
  const w = CARD.w;
  const h = CARD.h;
  return (
    <AbsoluteFill style={{ perspective: "1100px", perspectiveOrigin: "50% 50%", pointerEvents: "none" }}>
      {/* soft contact shadow on the prompt box, tightening as the card lands */}
      <div
        style={{
          position: "absolute",
          left: rx - (w * s) / 2 - 6,
          top: ry - (h * s) / 2 + 6 + (1 - u) * 26,
          width: w * s + 12,
          height: h * s + 8,
          borderRadius: 12 * s,
          background: "rgba(0,0,0,0.55)",
          filter: `blur(${Math.round(8 + (1 - u) * 26)}px)`,
          opacity: u * u * out,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x - w / 2,
          top: y - h / 2,
          width: w,
          height: h,
          transform: `rotateX(${(1 - u) * 34}deg) rotateY(${(1 - u) * -28}deg) rotateZ(${(1 - u) * 11}deg) scale(${sc})`,
          borderRadius: 7,
          overflow: "hidden",
          boxShadow: "0 2px 10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.14)",
          opacity: interpolate(frame, [DROP.start - 1, DROP.start + 2], [0, 1], clamp) * out,
        }}
      >
        <Img src={staticFile("manus2/studio/clip-frame.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    </AbsoluteFill>
  );
};

export const MBFLAT3A_DURATION = PARTS.a3.frames;
export const MBFLAT3B_DURATION = PARTS.b3.frames;
export const MBFLAT5A_DURATION = PARTS.a5.frames;
export const MBFLAT5B_DURATION = PARTS.b5.frames;

const make = (part: Part): React.FC => {
  const C: React.FC = () => {
    const frame = useCurrentFrame();
    const { width, height } = useVideoConfig();
    const fs = part.keys.map((k) => k.f);
    const v = (pick: (k: Key) => number) => interpolate(frame, fs, part.keys.map(pick), { ...clamp, easing: MOVE });
    const s = v((k) => k.s);
    const left = width / 2 - v((k) => k.cx) * s;
    const top = height * part.anchorY - v((k) => k.cy) * s;
    return (
      <AbsoluteFill style={{ backgroundColor: MRD.bg, overflow: "hidden" }}>
        <AbsoluteFill style={{ backgroundImage: MRD_GRADIENT.ground }} />
        <AbsoluteFill
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, ${MRD_GRID.color} 0px, ${MRD_GRID.color} 1px, transparent 1px, transparent ${MRD_GRID.spacing}px)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left,
            top,
            width: WIN.w * s,
            height: WIN.h * s,
            borderRadius: 12 * s,
            overflow: "hidden",
            backgroundColor: "#121414",
            boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px ${MRD.hairline}`,
          }}
        >
          <OffthreadVideo src={staticFile(part.src)} muted style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }} />
        </div>
        {/* lower-third (Manus v2.1 ask): its own layer above the window, under the dropped clip */}
        <CameraMotionBlur shutterAngle={180} samples={8}>
          <LowerThird />
        </CameraMotionBlur>
        {part.drop ? (
          <CameraMotionBlur shutterAngle={180} samples={5}>
            <DropCard left={left} top={top} s={s} />
          </CameraMotionBlur>
        ) : null}
      </AbsoluteFill>
    );
  };
  return C;
};

export const MbFlat3aVideoEditorInside = make(PARTS.a3);
export const MbFlat3bDropMyClipsIn = make(PARTS.b3);
export const MbFlat5aTellItWhatToChange = make(PARTS.a5);
export const MbFlat5bCenterBiggerQuieter = make(PARTS.b5);
