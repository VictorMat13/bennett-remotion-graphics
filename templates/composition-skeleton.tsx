import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';
import { C } from './colors';
import { fadeIn } from './utils';
import { MatrixRain } from './MatrixRain';
// import the demo mockup you need:
// import { TerminalMock } from './TerminalMock';
// import { MarkdownFileMock } from './MarkdownFileMock';

// 14s = 420f at 30fps. Adjust durations per content.
const SCENE = {
  opener: { from: 0,   duration: 45  },  // 0.0 - 1.5s   Number + title
  demo:   { from: 45,  duration: 240 }, // 1.5 - 9.5s   Mockup or demo
  punch:  { from: 285, duration: 135 }, // 9.5 - 14.0s  Punchline
};

export const BennettReel: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const endFade = interpolate(
    frame,
    [durationInFrames - 0.3 * fps, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const vignette = `radial-gradient(ellipse 70% 65% at 50% 50%, transparent 0%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.92) 100%)`;
  const scanlines = `repeating-linear-gradient(
    to bottom,
    rgba(0,0,0,0) 0px,
    rgba(0,0,0,0) 2px,
    rgba(0,0,0,0.18) 3px,
    rgba(0,0,0,0) 4px
  )`;

  return (
    <AbsoluteFill style={{ background: C.bgDeep, opacity: endFade }}>
      <MatrixRain />
      <AbsoluteFill style={{ background: vignette, pointerEvents: 'none' }} />

      <Sequence from={SCENE.opener.from} durationInFrames={SCENE.opener.duration}>
        {/* <OpenerScene number="1" title="Plan mode." /> */}
      </Sequence>

      <Sequence from={SCENE.demo.from} durationInFrames={SCENE.demo.duration}>
        {/* <DemoScene sceneFrames={SCENE.demo.duration} /> */}
      </Sequence>

      <Sequence from={SCENE.punch.from} durationInFrames={SCENE.punch.duration}>
        {/* <PunchlineScene main="Smarter" sub="every fix." /> */}
      </Sequence>

      <CornerBrackets />
      <AbsoluteFill style={{ background: scanlines, pointerEvents: 'none', mixBlendMode: 'overlay' }} />
    </AbsoluteFill>
  );
};

// -------- Persistent corner brackets --------
const CornerBrackets: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const opacity = fadeIn(frame, fps, 0, 0.3);
  const exitFade = interpolate(
    frame,
    [durationInFrames - 0.3 * fps, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <>
      {(['tl', 'tr', 'bl', 'br'] as const).map((p) => (
        <Bracket key={p} pos={p} opacity={opacity * exitFade} />
      ))}
    </>
  );
};

const Bracket: React.FC<{ pos: 'tl' | 'tr' | 'bl' | 'br'; opacity: number }> = ({
  pos,
  opacity,
}) => {
  const SIZE = 72;
  const STROKE = 3;
  const INSET = 56;
  const isTop = pos.startsWith('t');
  const isLeft = pos.endsWith('l');
  const style: React.CSSProperties = {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    opacity,
    borderColor: C.coral,
    borderStyle: 'solid',
    borderWidth: 0,
    boxShadow: `0 0 14px ${C.coralDim}`,
  };
  if (isTop) {
    style.top = INSET;
    style.borderTopWidth = STROKE;
  } else {
    style.bottom = INSET;
    style.borderBottomWidth = STROKE;
  }
  if (isLeft) {
    style.left = INSET;
    style.borderLeftWidth = STROKE;
  } else {
    style.right = INSET;
    style.borderRightWidth = STROKE;
  }
  return <div style={style} />;
};
