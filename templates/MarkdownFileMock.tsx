import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { C } from '../shared/colors';
import { fadeIn } from '../shared/utils';

interface MarkdownFileMockProps {
  localFrame: number;
  fps: number;
  sceneFrames: number;
}

// Three bullets that type in successively. Each one increments a counter and pulses a save.
const BULLETS = [
  'Verify webhook signatures before JSON.parse',
  'Lock dep versions in CI to avoid drift',
  'Always paginate — default page size is 10',
];

// Counter starts here and climbs (jumps after each save to suggest history)
const COUNTER_KEYFRAMES: { atSec: number; value: number }[] = [
  { atSec: 0.0,  value: 47 },
  { atSec: 1.6,  value: 48 },  // first save lands
  { atSec: 3.2,  value: 49 },  // second
  { atSec: 4.8,  value: 50 },  // third
  { atSec: 5.4,  value: 124 }, // jump — implies time passing / many saves
  { atSec: 6.2,  value: 312 },
  { atSec: 7.0,  value: 528 },
];

export const MarkdownFileMock: React.FC<MarkdownFileMockProps> = ({
  localFrame,
  fps,
}) => {
  const frame = localFrame;

  // File entrance
  const enterOpacity = fadeIn(frame, fps, 0, 0.3);
  const enterY = interpolate(enterOpacity, [0, 1], [40, 0]);

  // Heading
  const headingOpacity = fadeIn(frame, fps, 0.3, 0.25);

  // Bullet #1 timing (in seconds, scene-local)
  const BULLET_SCHEDULE = [
    { typeStart: 0.50, typeEnd: 1.45, saveAt: 1.50 },
    { typeStart: 1.95, typeEnd: 2.95, saveAt: 3.00 },
    { typeStart: 3.45, typeEnd: 4.55, saveAt: 4.60 },
  ];

  // Compute counter (snaps with brief easing between keyframes)
  const t = frame / fps;
  let counterValue = COUNTER_KEYFRAMES[0].value;
  for (let i = 0; i < COUNTER_KEYFRAMES.length; i++) {
    const kf = COUNTER_KEYFRAMES[i];
    if (t >= kf.atSec) counterValue = kf.value;
  }
  // Counter pop animation when it changes — find nearest keyframe in past 0.3s
  const recentKf = COUNTER_KEYFRAMES.find(
    (kf) => Math.abs(t - kf.atSec) < 0.25 && t >= kf.atSec - 0.05
  );
  const counterPop = recentKf
    ? interpolate(
        t,
        [recentKf.atSec, recentKf.atSec + 0.12, recentKf.atSec + 0.3],
        [1, 1.18, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      )
    : 1;

  // Aggregate save pulse: max of all bullet saves
  const savePulses = BULLET_SCHEDULE.map((sch) =>
    interpolate(
      frame,
      [sch.saveAt * fps, (sch.saveAt + 0.12) * fps, (sch.saveAt + 0.45) * fps],
      [0, 1, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    )
  );
  // Final time-jump pulses for keyframes past the bullet phase
  const lateKfPulses = COUNTER_KEYFRAMES.filter((kf) => kf.atSec > 5.0).map((kf) =>
    interpolate(
      t,
      [kf.atSec, kf.atSec + 0.1, kf.atSec + 0.4],
      [0, 1, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    )
  );
  const savePulse = Math.max(0, ...savePulses, ...lateKfPulses);

  return (
    <div
      style={{
        opacity: enterOpacity,
        transform: `translateY(${enterY}px)`,
        width: 900,
        background: 'rgba(8, 6, 4, 0.96)',
        borderRadius: 16,
        border: `1.5px solid ${C.coralDim}`,
        boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 ${60 + savePulse * 60}px rgba(204,120,92,${0.18 + savePulse * 0.5})`,
        overflow: 'hidden',
        fontFamily: C.mono,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '14px 18px',
          background: 'rgba(20, 14, 10, 0.85)',
          borderBottom: `1px solid ${C.coralFaint}`,
          gap: 8,
        }}
      >
        <div style={{ width: 12, height: 12, borderRadius: 6, background: '#FF5F57' }} />
        <div style={{ width: 12, height: 12, borderRadius: 6, background: '#FEBC2E' }} />
        <div style={{ width: 12, height: 12, borderRadius: 6, background: '#28C840' }} />
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 16 }}>📄</span>
          <span
            style={{
              color: C.coral,
              fontSize: 16,
              letterSpacing: 3,
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            CLAUDE.md
          </span>
        </div>
        {/* Counter pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: `rgba(204, 120, 92, ${0.12 + savePulse * 0.4})`,
            border: `1px solid ${C.coral}`,
            borderRadius: 14,
            padding: '4px 12px',
            boxShadow: savePulse > 0 ? `0 0 ${10 + savePulse * 20}px ${C.coral}` : 'none',
          }}
        >
          <span style={{ fontSize: 11, color: C.coralDim, letterSpacing: 2, textTransform: 'uppercase' }}>
            saved
          </span>
          <span
            style={{
              fontSize: 18,
              color: C.coralBright,
              fontWeight: 700,
              fontFamily: C.mono,
              transform: `scale(${counterPop})`,
              display: 'inline-block',
              minWidth: 42,
              textAlign: 'right',
              textShadow: `0 0 8px ${C.coral}`,
            }}
          >
            {counterValue}
          </span>
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          padding: '28px 36px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          minHeight: 480,
        }}
      >
        {/* Heading */}
        <div
          style={{
            opacity: headingOpacity,
            display: 'flex',
            alignItems: 'baseline',
            gap: 14,
            marginBottom: 6,
          }}
        >
          <span style={{ color: C.coralDim, fontSize: 26, fontWeight: 700 }}>##</span>
          <span style={{ color: C.cream, fontSize: 28, fontWeight: 700, letterSpacing: 0.2 }}>
            Lessons
          </span>
        </div>

        {/* Bullets typing in */}
        {BULLETS.map((bullet, i) => {
          const sch = BULLET_SCHEDULE[i];
          const charCount = Math.floor(
            interpolate(
              frame,
              [sch.typeStart * fps, sch.typeEnd * fps],
              [0, bullet.length],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            )
          );
          const visibleChars = bullet.slice(0, charCount);
          const cursorBlink = Math.floor(frame / 14) % 2 === 0;
          const isActive = frame >= sch.typeStart * fps - 4;
          const isComplete = charCount >= bullet.length;
          // Settled state — drops the heavy left-border once next bullet starts typing
          const nextBulletStarts = BULLET_SCHEDULE[i + 1]?.typeStart ?? Infinity;
          const isSettled = t >= nextBulletStarts;

          // Per-bullet save pulse
          const ownPulse = interpolate(
            frame,
            [sch.saveAt * fps, (sch.saveAt + 0.12) * fps, (sch.saveAt + 0.4) * fps],
            [0, 1, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );

          if (!isActive) return null;

          return (
            <div
              key={i}
              style={{
                marginLeft: -14,
                padding: '8px 14px',
                borderLeft: isSettled
                  ? `2px solid ${C.coralFaint}`
                  : `3px solid ${C.coral}`,
                background: isSettled
                  ? 'transparent'
                  : `rgba(204, 120, 92, ${0.08 + ownPulse * 0.22})`,
                borderRadius: '0 8px 8px 0',
                boxShadow: ownPulse > 0
                  ? `0 0 ${20 + ownPulse * 24}px rgba(204,120,92,${ownPulse * 0.5})`
                  : 'none',
                fontFamily: C.mono,
                fontSize: 21,
                color: isSettled ? '#B5A89A' : C.coralBright,
                letterSpacing: 0.2,
                lineHeight: 1.4,
                textShadow: isSettled ? 'none' : `0 0 10px ${C.coralDim}`,
                minHeight: 32,
              }}
            >
              {'- '}
              {visibleChars}
              {!isComplete && (
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 22,
                    marginLeft: 3,
                    marginBottom: -3,
                    background: cursorBlink ? C.coralBright : 'transparent',
                    boxShadow: cursorBlink ? `0 0 10px ${C.coral}` : 'none',
                    verticalAlign: 'middle',
                  }}
                />
              )}
            </div>
          );
        })}

        {/* "..." indicator after final bullet — implies more accumulating */}
        {t > 4.7 && (
          <div
            style={{
              opacity: fadeIn(frame, fps, 4.8, 0.3),
              marginLeft: -14,
              padding: '6px 14px',
              fontFamily: C.mono,
              fontSize: 21,
              color: C.coralDim,
              letterSpacing: 4,
            }}
          >
            ...
          </div>
        )}
      </div>
    </div>
  );
};
