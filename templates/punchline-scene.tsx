import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { C } from './colors';
import { fadeIn, blurClear, springIn } from './utils';

interface PunchlineSceneProps {
  main: string;   // e.g. "Smarter", "Half my errors gone."
  sub?: string;   // e.g. "every fix."
  // Set to true for stacked multi-line main word (rare). Default false.
  multiline?: boolean;
}

export const PunchlineScene: React.FC<PunchlineSceneProps> = ({ main, sub, multiline = false }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const blur = blurClear(frame, fps, 0, 0.4);
  const opacityMain = fadeIn(frame, fps, 0, 0.3);
  const spring = springIn(frame, fps, 0);
  const scale = interpolate(spring, [0, 1], [0.85, 1]);
  const opacitySub = fadeIn(frame, fps, 0.5, 0.35);

  // Breathing pulse
  const pulse = 0.5 + 0.5 * Math.sin((frame / fps) * 4);

  const exitFade = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: exitFade,
      }}
    >
      <div
        style={{
          opacity: opacityMain,
          filter: `blur(${blur}px)`,
          transform: `scale(${scale})`,
          fontFamily: C.sans,
          fontWeight: 900,
          fontSize: multiline ? 138 : 220,
          fontStyle: 'italic',
          color: C.coralBright,
          letterSpacing: multiline ? -3 : -6,
          lineHeight: 1.15,
          textAlign: 'center',
          textShadow: `0 0 ${36 + pulse * 36}px ${C.coral}, 0 0 96px ${C.coralDim}`,
        }}
      >
        {main}
      </div>
      {sub && (
        <div
          style={{
            opacity: opacitySub,
            fontFamily: C.sans,
            fontSize: 64,
            fontWeight: 600,
            color: C.cream,
            letterSpacing: -0.8,
            marginTop: 18,
            textShadow: `0 2px 12px rgba(0,0,0,0.6)`,
          }}
        >
          {sub}
        </div>
      )}
    </AbsoluteFill>
  );
};
