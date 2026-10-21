import React from "react";
import { AbsoluteFill, Easing, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { MANUS_FONT, MRD, MRD_GRADIENT, MRD_GRID } from "./theme";

// ===========================================================================
// Bennett x Manus 2.0 v2.1, PART A: cold open (BRIEF-v3.md). 9:16, 2.5s.
// The hook plays as VO over it. The finished Reel is already playing in a
// phone frame; the raw clips (same footage, ungraded, no captions) deal in on
// the left; a quiet line + arrowhead connects them (the brand's "→" made
// physical); the only text Manus asked for rises in underneath.
//
// Flat 2D on the Merydian ground (MbFlat recipe). Bezier easing only, zero
// overshoot, no glows. Safe zone: 5% sides, below top 10%, above bottom 12%,
// checked with the camera push at its 1.03 end scale.
// ===========================================================================

export const MBP0_DURATION = 75;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ENTER = Easing.bezier(0.05, 0.7, 0.1, 1);
const TRAVEL = Easing.bezier(0.65, 0, 0.35, 1);

// ---- layout (1080x1920 frame px) ----
// Revision 2 (coordinator): pile on the left ~45%, smaller phone pushed right (edge at 1026 - 20),
// >= 110px gap carrying a real arrow. Cards would be 400x225 by the note, but 400px at 7deg is ~424px wide
// and 424 + 110 + 440 > 944 (the 972px safe width at the 1.03 push), so the cards are the largest 16:9
// size that fits: 340x191.
const PHONE = { x: 566, y: 489, w: 440, h: 782, r: 48 }; // right edge 1006
const MID_Y = PHONE.y + PHONE.h / 2; // 880: stack, line and phone share this axis
const CARD = { w: 340, h: 191, r: 14 }; // 16:9
const STACK_CX = 259;
// a loose pile: y 44px apart (~360px tall), x offsets spanning 34px, later cards land on top
const CLIPS = [
  { src: "manus2/ig/raw-4.8.jpg", dx: -10, dy: -66, rot: -7 },
  { src: "manus2/ig/raw-8.6.jpg", dx: 18, dy: -22, rot: 4 },
  { src: "manus2/ig/raw-16.9.jpg", dx: -16, dy: 22, rot: -3 },
  { src: "manus2/ig/raw-1.2.jpg", dx: 12, dy: 66, rot: 6 },
] as const;

// horizontal extent of the pile at rest (rotated card corners)
const halfExtent = (rot: number) => {
  const a = (Math.abs(rot) * Math.PI) / 180;
  return (CARD.w / 2) * Math.cos(a) + (CARD.h / 2) * Math.sin(a);
};
const STACK_RIGHT = Math.max(...CLIPS.map((c) => STACK_CX + c.dx + halfExtent(c.rot)));
const STACK_LEFT = Math.min(...CLIPS.map((c) => STACK_CX + c.dx - halfExtent(c.rot)));

// the connector spans the pile -> phone gap: 2px shaft, 16x8 solid arrowhead landing just short of the phone
const LINE = { x0: STACK_RIGHT + 12, tip: PHONE.x - 14, head: 16, halfW: 8 };

const TEXT_TOP = PHONE.y + PHONE.h + 90 - 8; // 90px visible gap: the cap top sits ~8px inside the 56px line box
const GROUP_CX = (STACK_LEFT + PHONE.x + PHONE.w) / 2;
// push origin: left of the group centre so both group edges stay inside x 54..1026 at 1.03
const ORIGIN = { x: 420, y: 957 };

// ---- beats ----
const CARD_AT = [-2, 1, 4, 7]; // staggered 3f; card 0 is already in flight at frame 0
const CARD_LEN = 17;
const CARD_TRAVEL = 60;
const LINE_DRAW = [18, 36] as const;
const HEAD_LAND = [33, 40] as const;
const TEXT_IN = [26, 44] as const;

const camScale = (frame: number) => interpolate(frame, [0, MBP0_DURATION - 1], [1, 1.03], { ...clamp, easing: TRAVEL });

const Ground: React.FC = () => (
  <>
    <AbsoluteFill style={{ backgroundImage: MRD_GRADIENT.ground }} />
    <AbsoluteFill
      style={{
        backgroundImage: `repeating-linear-gradient(90deg, ${MRD_GRID.color} 0px, ${MRD_GRID.color} 1px, transparent 1px, transparent ${MRD_GRID.spacing}px)`,
      }}
    />
  </>
);

// The finished Reel, already playing. Kept outside the motion-blur samples (the
// 3% push moves its edges < 0.5px/frame, so blur would be invisible and would
// only multiply video decoding); it rides the identical camera transform.
const Phone: React.FC = () => {
  const frame = useCurrentFrame();
  const s = camScale(frame);
  return (
    <AbsoluteFill style={{ transform: `scale(${s})`, transformOrigin: `${ORIGIN.x}px ${ORIGIN.y}px` }}>
      <div
        style={{
          position: "absolute",
          left: PHONE.x,
          top: PHONE.y,
          width: PHONE.w,
          height: PHONE.h,
          borderRadius: PHONE.r,
          overflow: "hidden",
          backgroundColor: MRD.card,
          boxShadow: `${MRD.panelShadow}, 0 0 0 1px ${MRD.hairline}`,
        }}
      >
        <OffthreadVideo
          src={staticFile("manus2/ig/final-reel.mp4")}
          muted
          trimBefore={30}
          style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    </AbsoluteFill>
  );
};

const ClipCard: React.FC<{ i: number; frame: number }> = ({ i, frame }) => {
  const c = CLIPS[i];
  const at = CARD_AT[i];
  const u = interpolate(frame, [at, at + CARD_LEN], [0, 1], { ...clamp, easing: ENTER });
  const o = interpolate(frame, [at, at + 9], [0, 1], { ...clamp, easing: ENTER });
  const cx = STACK_CX + c.dx - (1 - u) * CARD_TRAVEL;
  const cy = MID_Y + c.dy;
  return (
    <div
      style={{
        position: "absolute",
        left: cx - CARD.w / 2,
        top: cy - CARD.h / 2,
        width: CARD.w,
        height: CARD.h,
        borderRadius: CARD.r,
        overflow: "hidden",
        backgroundColor: MRD.cardSoft,
        transform: `rotate(${c.rot - (1 - u) * 3}deg)`, // dealt in: a 3deg swing that settles, no overshoot
        boxShadow: `0 0 0 1px ${MRD.hairline}, 0 2px 5px rgba(0,0,0,0.55), 0 14px 30px rgba(0,0,0,0.45)`,
        opacity: o,
      }}
    >
      <Img src={staticFile(c.src)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    </div>
  );
};

const Connector: React.FC<{ frame: number }> = ({ frame }) => {
  const p = interpolate(frame, [...LINE_DRAW], [0, 1], { ...clamp, easing: TRAVEL });
  const ho = interpolate(frame, [...HEAD_LAND], [0, 1], { ...clamp, easing: ENTER });
  const hx = interpolate(frame, [...HEAD_LAND], [-6, 0], { ...clamp, easing: ENTER });
  if (p <= 0) return null;
  const shaftEnd = LINE.tip - LINE.head + 2; // tucks 2px under the head's base
  const x1 = LINE.x0 + (shaftEnd - LINE.x0) * p;
  const baseX = LINE.tip - LINE.head + hx;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <g opacity={0.6}>
        <line x1={LINE.x0} y1={MID_Y} x2={x1} y2={MID_Y} stroke={MRD.text} strokeWidth={2} strokeLinecap="butt" />
        {ho > 0 ? (
          <path
            d={`M ${baseX} ${MID_Y - LINE.halfW} L ${LINE.tip + hx} ${MID_Y} L ${baseX} ${MID_Y + LINE.halfW} Z`}
            fill={MRD.text}
            opacity={ho}
          />
        ) : null}
      </g>
    </svg>
  );
};

const Caption: React.FC<{ frame: number }> = ({ frame }) => {
  const u = interpolate(frame, [...TEXT_IN], [0, 1], { ...clamp, easing: ENTER });
  const o = interpolate(frame, [TEXT_IN[0], TEXT_IN[0] + 12], [0, 1], { ...clamp, easing: ENTER });
  if (o <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: GROUP_CX - 540,
        width: 1080,
        top: TEXT_TOP + (1 - u) * 16,
        textAlign: "center",
        fontFamily: MANUS_FONT,
        fontWeight: 600,
        fontSize: 56,
        lineHeight: 1,
        letterSpacing: -0.5,
        color: MRD.text,
        whiteSpace: "nowrap",
        opacity: o,
      }}
    >
      Raw clips → ready-to-post Reel
    </div>
  );
};

// Everything that moves on its own: the dealt clips, the connector, the text.
const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const s = camScale(frame);
  const drift = interpolate(frame, [20, MBP0_DURATION - 1], [0, -2], { ...clamp, easing: TRAVEL }); // hold micro-motion
  return (
    <AbsoluteFill style={{ transform: `scale(${s})`, transformOrigin: `${ORIGIN.x}px ${ORIGIN.y}px` }}>
      <AbsoluteFill style={{ transform: `translateY(${drift}px)` }}>
        {CLIPS.map((_, i) => (
          <ClipCard key={i} i={i} frame={frame} />
        ))}
      </AbsoluteFill>
      <Connector frame={frame} />
      <Caption frame={frame} />
    </AbsoluteFill>
  );
};

export const MbP0RawClipsToReel: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: MRD.bg, overflow: "hidden" }}>
    <Ground />
    <Phone />
    <CameraMotionBlur shutterAngle={180} samples={8}>
      <Scene />
    </CameraMotionBlur>
  </AbsoluteFill>
);
