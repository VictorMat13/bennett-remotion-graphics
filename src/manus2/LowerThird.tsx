import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { MANUS_FONT, MANUS_LOGOS, MRD } from "./theme";

// ===========================================================================
// Bennett x Manus 2.0 v2.1: the lower-third Manus asked for on the walkthrough
// (Oct 7 2026): "Video Editor · Manus Studio". A quiet dark pill with the
// white Manus mark, bottom-left, on its own layer above the screen recording.
// Rises in once and holds to the end of the part (never exits). No glow.
//
// Placement comes from the comp size, so the same component sits correctly in
// the 9:16 parts (1080x1920: 14% up from the bottom, clear of the Reels UI) and
// in the 9:8 parts (1080x960, wrapped by withSafeFrame: 44px up).
// ===========================================================================

export const LOWER_THIRD_TEXT = "Video Editor · Manus Studio"; // real middle dot
const ENTER = Easing.bezier(0.05, 0.7, 0.1, 1);
const ENTER_FRAMES = 14;
const RISE = 14; // px

export const LowerThird: React.FC<{ enterAt?: number }> = ({ enterAt = 8 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = interpolate(frame, [enterAt, enterAt + ENTER_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ENTER,
  });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: width * 0.05,
          bottom: height >= 1500 ? height * 0.13 : 44,
          height: 64,
          padding: "0 22px",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderRadius: 999,
          backgroundColor: MRD.card,
          border: `1px solid ${MRD.hairline}`,
          boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
          opacity: t,
          transform: `translateY(${(1 - t) * RISE}px)`,
        }}
      >
        <Img src={staticFile(MANUS_LOGOS.markWhite)} style={{ width: 28, height: 28, display: "block", flexShrink: 0 }} />
        <span
          style={{
            fontFamily: MANUS_FONT,
            fontWeight: 600,
            fontSize: 26,
            lineHeight: 1,
            color: MRD.text,
            whiteSpace: "nowrap",
          }}
        >
          {LOWER_THIRD_TEXT}
        </span>
      </div>
    </AbsoluteFill>
  );
};
