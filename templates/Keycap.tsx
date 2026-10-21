import React from 'react';
import { interpolate } from 'remotion';
import { C } from '../shared/colors';

interface KeycapProps {
  label: string;
  symbol?: string;
  // Press progress 0..1 (0 = idle, 1 = pressed)
  press: number;
  width?: number;
  height?: number;
}

export const Keycap: React.FC<KeycapProps> = ({
  label,
  symbol,
  press,
  width = 140,
  height = 110,
}) => {
  // When pressed: scale down, glow up, color shift to coral
  const scale = interpolate(press, [0, 1], [1, 0.94]);
  const glowAlpha = interpolate(press, [0, 1], [0.0, 0.85]);
  const borderAlpha = interpolate(press, [0, 1], [0.35, 1]);
  const bgAlpha = interpolate(press, [0, 1], [0.08, 0.22]);
  const textColor = press > 0.5 ? C.coralBright : C.cream;
  const textGlow = press > 0.5
    ? `0 0 12px ${C.coral}, 0 0 24px ${C.coral}`
    : 'none';

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 14,
        background: `rgba(204, 120, 92, ${bgAlpha})`,
        border: `2px solid rgba(204, 120, 92, ${borderAlpha})`,
        boxShadow: `0 0 ${24 + glowAlpha * 30}px rgba(204, 120, 92, ${glowAlpha}), inset 0 -3px 0 rgba(0,0,0,0.4)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        transform: `scale(${scale})`,
        fontFamily: C.mono,
        color: textColor,
        textShadow: textGlow,
      }}
    >
      {symbol && (
        <div style={{ fontSize: 36, lineHeight: 1, fontWeight: 500 }}>{symbol}</div>
      )}
      <div style={{ fontSize: 18, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </div>
    </div>
  );
};
