import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { C } from '../shared/colors';
import { fadeIn } from '../shared/utils';
import { Keycap } from './Keycap';

interface TerminalMockProps {
  // Local frame (relative to scene start)
  localFrame: number;
  fps: number;
  // Scene duration in frames (so we can time the press window)
  sceneFrames: number;
}

const PROMPT_TEXT = 'Refactor my auth flow into a single hook';

export const TerminalMock: React.FC<TerminalMockProps> = ({
  localFrame,
  fps,
  sceneFrames,
}) => {
  const frame = localFrame;

  // Phase timing within the scene (in seconds, relative to scene start):
  // 0.0-0.2  Terminal slides up
  // 0.2-1.4  Prompt types in
  // 1.4-1.7  Pause
  // 1.7-2.0  shift+tab keys press
  // 2.0-2.5  Status pill flips to "PLAN MODE"
  const TYPE_START = 0.25;
  const TYPE_END = 1.4;
  const PRESS_AT = 1.65;
  const FLIP_AT = 1.95;

  // Terminal entrance
  const enterOpacity = fadeIn(frame, fps, 0, 0.3);
  const enterY = interpolate(enterOpacity, [0, 1], [40, 0]);

  // Prompt typewriter
  const charCount = Math.floor(
    interpolate(
      frame,
      [TYPE_START * fps, TYPE_END * fps],
      [0, PROMPT_TEXT.length],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    )
  );
  const visiblePrompt = PROMPT_TEXT.slice(0, charCount);
  const cursorBlink = Math.floor(frame / 14) % 2 === 0;

  // Shift + Tab press: a quick down-up curve, peaks at PRESS_AT
  const pressShift = interpolate(
    frame,
    [(PRESS_AT - 0.05) * fps, PRESS_AT * fps, (PRESS_AT + 0.18) * fps],
    [0, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const pressTab = interpolate(
    frame,
    [(PRESS_AT) * fps, (PRESS_AT + 0.06) * fps, (PRESS_AT + 0.24) * fps],
    [0, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Status pill flip
  const flipProgress = interpolate(
    frame,
    [FLIP_AT * fps, (FLIP_AT + 0.35) * fps],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Pulse the active pill
  const pillPulse = 0.5 + 0.5 * Math.sin((frame / fps) * 4);
  const pillGlow = flipProgress > 0.5 ? 18 + pillPulse * 14 : 0;

  return (
    <div
      style={{
        opacity: enterOpacity,
        transform: `translateY(${enterY}px)`,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Terminal window */}
      <div
        style={{
          width: 880,
          background: 'rgba(8, 6, 4, 0.96)',
          borderRadius: 16,
          border: `1.5px solid ${C.coralDim}`,
          boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(204,120,92,0.18)`,
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
              textAlign: 'center',
              color: C.coral,
              fontSize: 14,
              letterSpacing: 3,
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            claude
          </div>
          <div style={{ width: 56 }} />
        </div>

        {/* Body */}
        <div
          style={{
            minHeight: 380,
            padding: '32px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          {/* Tip line */}
          <div style={{ color: C.coralDim, fontSize: 16, letterSpacing: 1 }}>
            {'>'} Welcome back, Victor. Tab through modes to plan first.
          </div>
          <div style={{ height: 12 }} />

          {/* Prompt line */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ color: C.coralBright, fontSize: 28, fontWeight: 700 }}>{'>'}</span>
            <span
              style={{
                color: C.cream,
                fontSize: 24,
                letterSpacing: 0.3,
              }}
            >
              {visiblePrompt}
              <span
                style={{
                  display: 'inline-block',
                  width: 12,
                  height: 26,
                  marginLeft: 4,
                  marginBottom: -4,
                  background: cursorBlink ? C.coralBright : 'transparent',
                  boxShadow: cursorBlink ? `0 0 10px ${C.coral}` : 'none',
                  verticalAlign: 'middle',
                }}
              />
            </span>
          </div>

          <div style={{ flex: 1 }} />

          {/* Status pills row */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'flex-start' }}>
            <ModePill
              label="default"
              symbol="◇"
              active={flipProgress < 0.5}
              fading={flipProgress > 0 && flipProgress < 0.5}
              progress={flipProgress}
              glow={0}
            />
            <ModePill
              label="plan mode"
              symbol="⏸"
              active={flipProgress >= 0.5}
              fading={false}
              progress={flipProgress}
              glow={pillGlow}
            />
          </div>
        </div>
      </div>

      {/* Keys below terminal */}
      <div
        style={{
          marginTop: 38,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
        }}
      >
        <Keycap label="shift" symbol="⇧" press={pressShift} />
        <div
          style={{
            color: C.coralDim,
            fontSize: 56,
            fontWeight: 200,
            fontFamily: C.mono,
            transform: 'translateY(-2px)',
          }}
        >
          +
        </div>
        <Keycap label="tab" symbol="↹" press={pressTab} />
      </div>
    </div>
  );
};

const ModePill: React.FC<{
  label: string;
  symbol: string;
  active: boolean;
  fading: boolean;
  progress: number;
  glow: number;
}> = ({ label, symbol, active, glow }) => {
  const opacity = active ? 1 : 0.35;
  const bg = active ? `rgba(204, 120, 92, 0.22)` : `rgba(60, 50, 45, 0.45)`;
  const borderColor = active ? C.coral : 'rgba(120, 110, 100, 0.4)';
  const textColor = active ? C.coralBright : '#888';
  return (
    <div
      style={{
        opacity,
        background: bg,
        border: `1.5px solid ${borderColor}`,
        borderRadius: 100,
        padding: '8px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: C.mono,
        fontSize: 16,
        color: textColor,
        textTransform: 'uppercase',
        letterSpacing: 2,
        fontWeight: 600,
        boxShadow: glow > 0 ? `0 0 ${glow}px ${C.coral}` : 'none',
        transition: 'none',
      }}
    >
      <span style={{ fontSize: 18 }}>{symbol}</span>
      <span>{label}</span>
    </div>
  );
};
