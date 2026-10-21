import { Easing, interpolate } from "remotion";

// Cursor helpers shared by the Manus parts. Lifted verbatim from the Holo
// series (holo/HoP5OnTheCalendar.tsx) so this package does not need the Holo
// comp or its licensed app font.

const ease = Easing.inOut(Easing.cubic);

const clampOpts = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

export type CK = { f: number; x: number; y: number };

// Eased, slightly curved cursor path through keys (hold = repeated position).
export const cursorAt = (frame: number, keys: CK[]) => {
  if (frame <= keys[0].f) return { x: keys[0].x, y: keys[0].y };
  const last = keys[keys.length - 1];
  if (frame >= last.f) return { x: last.x, y: last.y };
  let i = 0;
  while (i < keys.length - 1 && frame > keys[i + 1].f) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const t = ease((frame - a.f) / Math.max(1, b.f - a.f));
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  const off = Math.sin(Math.PI * t) * Math.min(26, d * 0.1) * (i % 2 === 0 ? 1 : -1);
  const nx = d > 0 ? -dy / d : 0;
  const ny = d > 0 ? dx / d : 0;
  return { x: a.x + dx * t + nx * off, y: a.y + dy * t + ny * off };
};

export const pressAt = (frame: number, at: number) =>
  interpolate(frame, [at - 3, at, at + 6], [0, 1, 0], clampOpts);
