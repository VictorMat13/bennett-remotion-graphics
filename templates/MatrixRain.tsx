import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { C } from '../shared/colors';
import { rand } from '../shared/utils';

// Glyph palette: katakana half-width + binary + a few latin chars + symbols.
// Mostly katakana for that authentic Matrix feel.
const GLYPHS =
  'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ' +
  '0123456789' +
  '∗⟨⟩{}[]<>∴∵≡≠≈±';

const COL_WIDTH = 26;       // px per column
const CHAR_HEIGHT = 30;     // px per char vertically
const CHAR_FONT_SIZE = 22;

interface MatrixRainProps {
  // Optional cutout zone — characters render with low opacity inside this rect (for headline/logo legibility)
  cutout?: { x: number; y: number; w: number; h: number; opacity?: number };
}

export const MatrixRain: React.FC<MatrixRainProps> = ({ cutout }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  // Build columns once; their per-column properties are deterministic
  const columns = useMemo(() => {
    const cols = Math.ceil(width / COL_WIDTH);
    return Array.from({ length: cols }, (_, i) => {
      const speed = 0.4 + rand(i * 7 + 1) * 1.6;        // chars per frame, ~0.4..2.0
      const length = 8 + Math.floor(rand(i * 13 + 3) * 22); // 8..30 chars long trail
      const startOffset = rand(i * 17 + 5) * 200;       // staggers when each column "starts"
      const charSeed = i * 23 + 11;
      return { speed, length, startOffset, charSeed, x: i * COL_WIDTH };
    });
  }, [width]);

  const totalRows = Math.ceil(height / CHAR_HEIGHT) + 4;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: C.bg,
        fontFamily: C.mono,
        fontSize: CHAR_FONT_SIZE,
        fontWeight: 500,
        userSelect: 'none',
      }}
    >
      {columns.map((col, ci) => {
        // Position of the leading edge (head) of the trail in row units
        const head = ((frame * col.speed + col.startOffset) % (totalRows + col.length + 10)) - col.length;

        return (
          <div
            key={ci}
            style={{
              position: 'absolute',
              left: col.x,
              top: 0,
              width: COL_WIDTH,
              height: '100%',
            }}
          >
            {Array.from({ length: col.length }).map((_, ri) => {
              const rowIdx = Math.floor(head) - ri;
              if (rowIdx < 0 || rowIdx > totalRows) return null;

              // Glyph at this row swaps every ~10 frames using deterministic seed
              const swap = Math.floor((frame + col.charSeed + rowIdx * 3) / 10);
              const glyphIdx = Math.floor(rand(col.charSeed + rowIdx * 31 + swap * 17) * GLYPHS.length);
              const ch = GLYPHS[glyphIdx];

              // Trail brightness: head is brightest white-ish, fades to coral, then dim
              let color = C.coral;
              let opacity = 0;
              const t = ri / col.length;
              if (ri === 0) {
                color = C.cream;
                opacity = 1;
              } else if (ri < 3) {
                color = C.coralBright;
                opacity = 0.95;
              } else {
                color = C.coral;
                opacity = Math.max(0, 1 - t * 1.4);
              }

              const top = rowIdx * CHAR_HEIGHT;
              const left = COL_WIDTH / 2;

              // Cutout zone dimming for legibility behind headline/logo
              if (cutout) {
                const cx = col.x + COL_WIDTH / 2;
                const cy = top + CHAR_HEIGHT / 2;
                const inside =
                  cx >= cutout.x &&
                  cx <= cutout.x + cutout.w &&
                  cy >= cutout.y &&
                  cy <= cutout.y + cutout.h;
                if (inside) opacity *= cutout.opacity ?? 0.18;
              }

              return (
                <span
                  key={ri}
                  style={{
                    position: 'absolute',
                    top,
                    left,
                    transform: 'translateX(-50%)',
                    color,
                    opacity,
                    textShadow: ri === 0
                      ? `0 0 8px ${C.cream}, 0 0 18px ${C.coral}`
                      : ri < 3
                      ? `0 0 6px ${C.coralBright}`
                      : 'none',
                    lineHeight: 1,
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
