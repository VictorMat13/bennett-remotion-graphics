import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { MRD, MRD_GRADIENT, MRD_GRID } from "../fishos/theme";

// ===========================================================================
// Social safe-zone wrapper for every Holo part (Victor 2026-09-30).
// The 9:8 graphic sits in the TOP half of Bennett's 9:16 Reel, so the Reels
// header covers its top edge and the side edges get cropped. The whole part
// renders scaled into an inset "screen" (10% sides, 15% top, 5% bottom) that
// floats on the full-bleed Merydian ground. The ground is the only thing that
// reaches the frame edges.
// ===========================================================================

export const SAFE = { side: 0.1, top: 0.15 } as const;
const RADIUS = 28;

export const withSafeFrame = (Comp: React.FC) => {
  const Wrapped: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const t = frame / fps;
    const k = 1 - SAFE.side * 2;
    const left = width * SAFE.side;
    const top = height * SAFE.top;
    return (
      <AbsoluteFill style={{ backgroundColor: MRD.bg }}>
        <AbsoluteFill style={{ backgroundImage: MRD_GRADIENT.ground }} />
        <AbsoluteFill
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, ${MRD_GRID.color} 0px, ${MRD_GRID.color} 1px, transparent 1px, transparent ${MRD_GRID.spacing}px)`,
          }}
        />
        {[
          { x: 0.1, w: 150, o: 0.5 },
          { x: 0.5, w: 120, o: 0.3 },
          { x: 0.9, w: 150, o: 0.45 },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: s.x * width - s.w / 2,
              top: -120,
              width: s.w,
              height: height * 0.86,
              backgroundImage: MRD_GRADIENT.streak,
              opacity: s.o * (0.7 + 0.25 * Math.sin(t * 0.55 * Math.PI + i * 1.7)),
              filter: "blur(26px)",
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            left,
            top,
            width: width * k,
            height: height * k,
            borderRadius: RADIUS,
            overflow: "hidden",
            border: `1px solid ${MRD.hairline}`,
            boxShadow: MRD.panelShadow,
            backgroundColor: MRD.bg,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width,
              height,
              transform: `scale(${k})`,
              transformOrigin: "0 0",
            }}
          >
            <Comp />
          </div>
        </div>
      </AbsoluteFill>
    );
  };
  return Wrapped;
};
