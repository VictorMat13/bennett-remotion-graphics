import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { C } from './colors';
import { fadeIn, blurClear, springIn } from './utils';

interface OpenerSceneProps {
  number: string;     // "1", "2", "3", etc
  title: string;      // e.g. "Plan mode.", "Self-healing."
}

export const OpenerScene: React.FC<OpenerSceneProps> = ({ number, title }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const eyebrowOpacity = fadeIn(frame, fps, 0, 0.25);
  const numberOpacity = fadeIn(frame, fps, 0.1, 0.3);
  const numberBlur = blurClear(frame, fps, 0.1, 0.4);
  const numberSpring = springIn(frame, fps, 0.1);
  const numberScale = interpolate(numberSpring, [0, 1], [0.7, 1]);
  const titleOpacity = fadeIn(frame, fps, 0.55, 0.3);

  const exitFade = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
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
          opacity: eyebrowOpacity,
          fontFamily: C.mono,
          fontSize: 28,
          color: C.coral,
          letterSpacing: 10,
          textTransform: 'uppercase',
          marginBottom: 24,
          textShadow: `0 0 18px ${C.coralDim}`,
        }}
      >
        {'> '}the move
      </div>
      <div
        style={{
          opacity: numberOpacity,
          filter: `blur(${numberBlur}px)`,
          transform: `scale(${numberScale})`,
          fontFamily: C.serif,
          fontSize: 560,
          fontWeight: 900,
          color: C.coralBright,
          letterSpacing: -10,
          lineHeight: 1,
          padding: '0 40px',
          textShadow: `0 0 60px ${C.coral}, 0 0 120px ${C.coralDim}`,
        }}
      >
        {number}
      </div>
      <div
        style={{
          opacity: titleOpacity,
          fontFamily: C.sans,
          fontSize: 84,
          fontWeight: 800,
          fontStyle: 'italic',
          color: C.cream,
          letterSpacing: -1.5,
          marginTop: 56,
          textShadow: `0 0 24px rgba(0,0,0,0.6)`,
        }}
      >
        {title}
      </div>
    </AbsoluteFill>
  );
};
