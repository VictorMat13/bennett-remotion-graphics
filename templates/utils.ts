import { interpolate, spring } from 'remotion';

export const fadeIn = (
  frame: number, fps: number,
  delaySec = 0, durationSec = 0.3
) =>
  interpolate(frame, [delaySec * fps, (delaySec + durationSec) * fps], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

export const springIn = (frame: number, fps: number, delaySec = 0) =>
  spring({ frame: frame - delaySec * fps, fps, config: { damping: 200 } });

export const blurClear = (frame: number, fps: number, delaySec = 0, durationSec = 0.5) =>
  interpolate(frame, [delaySec * fps, (delaySec + durationSec) * fps], [12, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

// Deterministic pseudo-random in [0, 1) — seeded by integer keys
export const rand = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};
