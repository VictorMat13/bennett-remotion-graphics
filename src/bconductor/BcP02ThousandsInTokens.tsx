import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { API_PRICING, EASE, FONT_MONO, MONO, MRD, OS_EASE } from "./theme";
import { Dot, MoveBlur, SeatChip, fmtTokens } from "./ui";

// ===========================================================================
// BcP02ThousandsInTokens: 1080x960 (9:8) @ 30fps, wrapped in the Holo safe
// frame by Root. VO (never on screen): "Most people running multiple agents
// pay thousands of dollars a month in API tokens."
// Word frames: agents 46, pay 59, thousands 67, dollars 87, month 99,
// API tokens 109-135, end 135.
//
// The pay-as-you-go picture, Monolith style, unbranded ("most people", not a
// product): a column of running SeatChips (real seat names) on the LEFT; each
// run sends a token tally ("+640.2k tok") out of its seat along a faint
// hairline into its row of a per-token "Usage" statement on the RIGHT (agent ·
// tokens in · tokens out · rate · cost), a month-to-date total and a
// day-of-month strip (Oct 1 .. Oct 31) underneath. The statement is a month
// in time-lapse: the strip fills day by day and every row (and the total, the
// sum of the rows) counts in whole dollars at the real list rate.
//   total: $190 at f0, crosses $1,000 at f68 ("thousands") and accelerates,
//   $3,096 at f99 ("month"), still ticking at the end ($4,849 at f150).
//
//   -6..32  opens tight on one running seat (Brand Deal Agent), already
//           easing back to the seat column: every seat running, tallies flowing
//   39..78  "pay": travel right along the flow down to the total (it is all
//           but landed as the total crosses $1,000 on "thousands", f68)
//   86..122 "month": pull back to the whole picture (seats + flow + statement
//           + the day strip), settling on the total on "API tokens"
//  122..end near-still hold, total still ticking, seats + tallies alive
// No cursor. No narration text: only field labels, names, numbers.
// ===========================================================================

export const BCP02_DURATION = 150;

const W = 1080;
const H = 960;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const TRAVEL = Easing.bezier(...EASE.travel);
const DECEL = Easing.bezier(...EASE.decel);
const ENTER = Easing.bezier(...EASE.enter);
const HOUSE = Easing.bezier(...OS_EASE.ease);

// ------------------------------------------------------------------- rates
// Real list prices, $ per 1M tokens. Opus 5.5 from theme.ts; Sonnet 5.5 from
// the Claude API pricing table ($2 in / $10 out).
const RATES = {
  "claude-opus-5-5": { inPerM: API_PRICING.opus55.inPerM, outPerM: API_PRICING.opus55.outPerM, text: "$4 / $20" },
  "claude-sonnet-5-5": { inPerM: 2, outPerM: 10, text: "$2 / $10" },
} as const;
type Model = keyof typeof RATES;

// ------------------------------------------------------------------ agents
// Real seat names (theme.ts SEATS / the P04 board). w0/w1: share of the day's
// spend on Oct 1 / Oct 31; pIn: share of the agent's cost that is input.
const AGENTS: { name: string; model: Model; w0: number; w1: number; pIn: number; since: number }[] = [
  { name: "Sales Agent", model: "claude-opus-5-5", w0: 0.18, w1: 0.16, pIn: 0.68, since: 146 },
  { name: "Comms Agent", model: "claude-sonnet-5-5", w0: 0.07, w1: 0.08, pIn: 0.64, since: 61 },
  { name: "Reelkit Editor", model: "claude-opus-5-5", w0: 0.17, w1: 0.19, pIn: 0.62, since: 211 },
  { name: "Brand Deal Agent", model: "claude-opus-5-5", w0: 0.22, w1: 0.2, pIn: 0.7, since: 42 },
  { name: "Social Agent", model: "claude-sonnet-5-5", w0: 0.08, w1: 0.07, pIn: 0.6, since: 35 },
  { name: "Data Agent", model: "claude-opus-5-5", w0: 0.17, w1: 0.18, pIn: 0.72, since: 101 },
  { name: "Newsletter Agent", model: "claude-sonnet-5-5", w0: 0.11, w1: 0.12, pIn: 0.66, since: 216 },
];
const HERO = 3; // the seat the part opens on

// ------------------------------------------------------- the month (spend)
// $ per day, Oct 1 .. Oct 31 (agents run every day; weekends dip a little).
const DAILY = [
  59.6, 64.2, 66.8, 70.2, 92.5, 96.3, 110.9, 108.8, 121.9, 113.1, 113.1, 147.4, 147.7, 167.4, 157.5, 176.5, 155.8,
  158.6, 203.3, 203.1, 225, 211.7, 232.2, 205.6, 202.8, 260.2, 258, 283.7, 265.2, 288.9, 251.9,
];
const MAX_DAY = Math.max(...DAILY);
// per-agent $ per day: the day's spend split by each agent's drifting share
const AGENT_DAY: number[][] = (() => {
  const out = AGENTS.map(() => new Array(31).fill(0));
  for (let k = 0; k < 31; k++) {
    const w = AGENTS.map((a, i) => (a.w0 + (a.w1 - a.w0) * (k / 30)) * (1 + 0.12 * Math.sin(k * 1.7 + i * 2.3)));
    const sum = w.reduce((s, v) => s + v, 0);
    w.forEach((v, i) => (out[i][k] = (DAILY[k] * v) / sum));
  }
  return out;
})();
const cumOf = (days: number[], D: number) => {
  let s = 0;
  for (let k = 0; k < 31; k++) {
    if (k + 1 <= D) s += days[k];
    else if (k < D) s += days[k] * (D - k);
  }
  return s;
};
const dayOf = (T: number) => {
  let lo = 0;
  let hi = 31;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (cumOf(DAILY, m) < T) lo = m;
    else hi = m;
  }
  return lo;
};

// The pace of the time-lapse: month-to-date $ per frame. Slow at the open,
// ramps up through "thousands", peaks through "dollars"/"month", eases to a
// slow tick for the end hold. Integrated once into a per-frame table.
const smoother = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * t * (t * (6 * t - 15) + 10);
};
const PACE = { T0: 190, lo: 6.2, peak: 69, tail: 3.6, up: [47, 78], down: [97, 149] } as const;
const pace = (f: number) => {
  const s1 = smoother(PACE.up[0], PACE.up[1], f);
  const s2 = smoother(PACE.down[0], PACE.down[1], f);
  return PACE.lo * (1 - s1) + PACE.peak * s1 * (1 - s2) + PACE.tail * s2;
};
const F_MIN = -40;
const F_MAX = 200;
const D_TABLE: number[] = (() => {
  const T: number[] = [];
  const integ = (a: number, b: number) => {
    let s = 0;
    const n = 16;
    for (let i = 0; i < n; i++) s += pace(a + ((b - a) * (i + 0.5)) / n) * ((b - a) / n);
    return s;
  };
  T[-F_MIN] = PACE.T0;
  for (let f = 1; f <= F_MAX; f++) T[f - F_MIN] = T[f - 1 - F_MIN] + integ(f - 1, f);
  for (let f = -1; f >= F_MIN; f--) T[f - F_MIN] = Math.max(0, T[f + 1 - F_MIN] - integ(f, f + 1));
  return T.map((v) => dayOf(v));
})();
const dayAt = (fi: number) => D_TABLE[Math.max(F_MIN, Math.min(F_MAX, fi)) - F_MIN];

const rowsAt = (fi: number) => {
  const D = dayAt(fi);
  return AGENTS.map((a, i) => {
    const cost = cumOf(AGENT_DAY[i], D);
    const r = RATES[a.model];
    return {
      cost: Math.round(cost),
      tokIn: ((cost * a.pIn) / r.inPerM) * 1e6,
      tokOut: ((cost * (1 - a.pIn)) / r.outPerM) * 1e6,
    };
  });
};
const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

// ----------------------------------------------------------------- layout
// Page px (the app's CSS px). Seats column | flow | statement card.
const SEAT = { w: 220, h: 46, pitch: 62 } as const;
const CARD = { x: 400, y: 0, w: 520, h: 690 } as const;
const ROW = { y0: 100, h: 50 } as const; // card-relative
const COL = { agent: 24, inR: 252, outR: 336, rateR: 402, costR: 496 } as const; // card-relative
const TOT = { rule: 470, label: 486, value: 508, size: 60 } as const;
const STRIP = { y: 596, h: 50, labels: 654 } as const;
const seatCY = (i: number) => 275 + (i - HERO) * SEAT.pitch;
const rowCY = (i: number) => CARD.y + ROW.y0 + ROW.h / 2 + i * ROW.h;

// <camera> ==================================================================
// cx/cy: page point at the frame centre; s: frame px per page px.
type Cam = { cx: number; cy: number; s: number };
type Seg = { f0: number; f1: number; to: Cam; ease: (t: number) => number };

const lerpCam = (a: Cam, b: Cam, p: number): Cam => ({
  cx: a.cx + (b.cx - a.cx) * p,
  cy: a.cy + (b.cy - a.cy) * p,
  s: Math.exp(Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * p),
});

const CAM_START: Cam = { cx: 106, cy: 275, s: 3.45 }; // virtual (f-6): tight on Brand Deal Agent
const SEATS: Cam = { cx: 266, cy: 291, s: 1.68 }; // the column, the flow, the row names
const SEATS_D: Cam = { cx: 265, cy: 292, s: 1.69 };
const TOTAL: Cam = { cx: 514, cy: 532, s: 2.3 }; // the month-to-date total
const TOTAL_D: Cam = { cx: 515, cy: 533, s: 2.33 };
const WIDE: Cam = { cx: 460, cy: 345, s: 1.1 }; // seats + flow + statement + strip
const WIDE_D: Cam = { cx: 463, cy: 350, s: 1.115 };

// Peak screen speed (max over the whole frame, measured): 63 / 67 / 62 px/frame; end hold under 2.
const SEGS: Seg[] = [
  { f0: -6, f1: 32, to: SEATS, ease: TRAVEL },
  { f0: 32, f1: 39, to: SEATS_D, ease: TRAVEL },
  { f0: 39, f1: 78, to: TOTAL, ease: TRAVEL },
  { f0: 78, f1: 86, to: TOTAL_D, ease: TRAVEL },
  { f0: 86, f1: 122, to: WIDE, ease: TRAVEL },
  { f0: 122, f1: 160, to: WIDE_D, ease: DECEL },
];
// camera moves (MoveBlur windows); drifts in between render plain.
const MOVES: [number, number][] = [
  [0, 32],
  [39, 78],
  [86, 122],
];

const camAt = (f: number): Cam => {
  let from = CAM_START;
  for (let k = 0; k < SEGS.length; k++) {
    const g = SEGS[k];
    if (f <= g.f1 || k === SEGS.length - 1) {
      const p = g.ease(Math.max(0, Math.min(1, (f - g.f0) / (g.f1 - g.f0))));
      return lerpCam(from, g.to, p);
    }
    from = g.to;
  }
  return CAM_START;
};
// </camera> =================================================================

// ------------------------------------------------------------ token flow
// Each run's tally rises off the seat's edge onto its hairline and slides
// along it into its row; the card is opaque, so the pill disappears under the
// card's edge (the row lights up for a beat as it lands).
const LIFE = 44;
const T0 = 0.2; // the pill starts here on its curve (left edge at the seat)
const SINK = 44; // px the pill travels under the card's edge
const flowPath = (i: number) => {
  const x0 = SEAT.w;
  const y0 = seatCY(i);
  const x3 = CARD.x;
  const y3 = rowCY(i);
  return { x0, y0, x3, y3, c1: x0 + 90, c2: x3 - 90 };
};
const SPLIT = 0.77; // share of the pill's travel spent on the curve
const pathPoint = (i: number, s: number) => {
  const p = flowPath(i);
  if (s > SPLIT) return { x: p.x3 + SINK * ((s - SPLIT) / (1 - SPLIT)), y: p.y3 };
  const t = T0 + (1 - T0) * (s / SPLIT);
  const u = 1 - t;
  return {
    x: u * u * u * p.x0 + 3 * u * u * t * p.c1 + 3 * u * t * t * p.c2 + t * t * t * p.x3,
    y: u * u * u * p.y0 + 3 * u * u * t * p.y0 + 3 * u * t * t * p.y3 + t * t * t * p.y3,
  };
};
// frames after emission at which the pill is mostly under the card
const ARRIVE = (() => {
  for (let t = 0; t <= LIFE; t += 0.25) if (TRAVEL(t / LIFE) >= 0.86) return t;
  return LIFE;
})();

type Tally = { seat: number; at: number; tok: number };
const TALLIES: Tally[] = (() => {
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const out: Tally[] = [];
  AGENTS.forEach((a, i) => {
    const period = 40 + Math.round(rnd() * 16);
    const opus = a.model === "claude-opus-5-5";
    // the hero seat sends a tally out as the camera starts easing back (f4)
    let at = i === HERO ? 4 : -LIFE + 6 - Math.round(rnd() * period);
    while (at < F_MAX) {
      const tok = opus ? 380_000 + rnd() * 1_300_000 : 120_000 + rnd() * 520_000;
      out.push({ seat: i, at, tok: Math.round(tok / 100) * 100 });
      at += period + Math.round(rnd() * 8);
    }
  });
  return out;
})();

const FlowLines: React.FC = () => (
  <svg
    width={CARD.x + 10}
    height={CARD.h}
    style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
  >
    {AGENTS.map((_, i) => {
      const p = flowPath(i);
      return (
        <path
          key={i}
          d={`M ${p.x0} ${p.y0} C ${p.c1} ${p.y0}, ${p.c2} ${p.y3}, ${p.x3} ${p.y3}`}
          fill="none"
          stroke={MONO.border}
          strokeWidth={1}
        />
      );
    })}
  </svg>
);

const Pills: React.FC<{ f: number }> = ({ f }) => (
  <>
    {TALLIES.filter((t) => f >= t.at && f <= t.at + LIFE).map((t) => {
      const s = TRAVEL((f - t.at) / LIFE);
      const pt = pathPoint(t.seat, s);
      const lift = interpolate(s, [0, 0.28], [5, -10], { ...clamp, easing: ENTER });
      const shown = interpolate(s, [0, 0.12], [0, 1], { ...clamp, easing: ENTER });
      return (
        <div
          key={`${t.seat}-${t.at}`}
          style={{
            position: "absolute",
            left: pt.x,
            top: pt.y + lift,
            transform: "translate(-50%, -50%)",
            opacity: shown,
            whiteSpace: "nowrap",
            borderRadius: 999,
            border: `1px solid ${MONO.border}`,
            background: MONO.bg,
            padding: "2px 8px",
            fontSize: 10.5,
            lineHeight: 1.4,
            color: MONO.text2,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span style={{ color: MONO.text }}>{`+${fmtTokens(t.tok)}`}</span>
          {" tok"}
        </div>
      );
    })}
  </>
);

// --------------------------------------------------------------- seats
const Seats: React.FC<{ f: number }> = ({ f }) => (
  <>
    {AGENTS.map((a, i) => (
      <SeatChip
        key={a.name}
        name={a.name}
        model={a.model}
        status="running"
        frame={f}
        elapsedSec={a.since + f / 30}
        width={SEAT.w}
        orbit
        orbitPhase={i * 0.53}
        style={{ position: "absolute", left: 0, top: seatCY(i) - SEAT.h / 2, height: SEAT.h }}
      />
    ))}
  </>
);

// ------------------------------------------------------------ the card
// kit/Label.svelte: mono 10px/700 uppercase, dim.
const Label: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      color: MONO.text3,
      fontSize: 9.5,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.16em",
      whiteSpace: "nowrap",
      lineHeight: 1.4,
      ...style,
    }}
  >
    {children}
  </div>
);

const cellR = (right: number): React.CSSProperties => ({
  position: "absolute",
  right: CARD.w - right,
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
});

const Statement: React.FC<{ f: number; fi: number }> = ({ f, fi }) => {
  const rows = rowsAt(fi);
  const total = rows.reduce((s, r) => s + r.cost, 0);
  const D = dayAt(fi);
  const today = Math.min(30, Math.floor(D));
  // a row lights up for a beat when one of its tallies lands
  const flash = (i: number) => {
    let k = 0;
    for (const t of TALLIES) {
      if (t.seat !== i) continue;
      const d = f - (t.at + ARRIVE);
      if (d >= 0 && d < 18) k = Math.max(k, interpolate(d, [0, 2, 18], [0, 1, 0], { ...clamp, easing: HOUSE }));
    }
    return k;
  };
  const pitch = (CARD.w - 48) / 31;
  return (
    <div
      style={{
        position: "absolute",
        left: CARD.x,
        top: CARD.y,
        width: CARD.w,
        height: CARD.h,
        boxSizing: "border-box",
        border: `1px solid ${MONO.border}`,
        borderRadius: 12,
        background: MONO.surface,
      }}
    >
      {/* head */}
      <div style={{ position: "absolute", left: 24, top: 20, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ color: MONO.text, fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.4 }}>
          Usage
        </span>
        <span style={{ color: MONO.text3, fontSize: 12 }}>October 2026</span>
      </div>
      <div
        style={{
          position: "absolute",
          right: 24,
          top: 28,
          display: "flex",
          alignItems: "center",
          gap: 7,
          color: MONO.text3,
          fontSize: 10.5,
        }}
      >
        <Dot state="ok" blink frame={fi + 23} />
        <span>live</span>
      </div>
      {/* column heads */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 72 }}>
        <Label style={{ position: "absolute", left: COL.agent }}>agent</Label>
        <Label style={cellR(COL.inR)}>tokens in</Label>
        <Label style={cellR(COL.outR)}>tokens out</Label>
        <Label style={cellR(COL.rateR)}>rate</Label>
        <Label style={cellR(COL.costR)}>cost</Label>
      </div>
      {/* rows */}
      {AGENTS.map((a, i) => {
        const r = rows[i];
        const k = flash(i);
        return (
          <div
            key={a.name}
            style={{
              position: "absolute",
              left: 1,
              right: 1,
              top: ROW.y0 + i * ROW.h,
              height: ROW.h,
              boxSizing: "border-box",
              borderTop: `1px solid ${i === 0 ? MONO.border : MONO.hairline}`,
              background: k > 0 ? `color-mix(in oklab, ${MONO.text} ${(4.5 * k).toFixed(2)}%, transparent)` : undefined,
            }}
          >
            <div style={{ position: "absolute", left: COL.agent - 1, top: 8 }}>
              <div style={{ color: MONO.text, fontSize: 12.5, fontWeight: 600, lineHeight: 1.35, whiteSpace: "nowrap" }}>
                {a.name}
              </div>
              <div style={{ color: MONO.text3, fontSize: 9.5, lineHeight: 1.4, whiteSpace: "nowrap" }}>{a.model}</div>
            </div>
            <div style={{ ...cellR(COL.inR - 1), top: 16, fontSize: 12, color: k > 0.5 ? MONO.text : MONO.text2 }}>
              {fmtTokens(r.tokIn)}
            </div>
            <div style={{ ...cellR(COL.outR - 1), top: 16, fontSize: 12, color: k > 0.5 ? MONO.text : MONO.text2 }}>
              {fmtTokens(r.tokOut)}
            </div>
            <div style={{ ...cellR(COL.rateR - 1), top: 17, fontSize: 10.5, color: MONO.text3 }}>
              {RATES[a.model].text}
            </div>
            <div style={{ ...cellR(COL.costR - 1), top: 15, fontSize: 13.5, fontWeight: 600, color: MONO.text }}>
              {usd(r.cost)}
            </div>
          </div>
        );
      })}
      {/* month to date */}
      <div style={{ position: "absolute", left: 24, right: 24, top: TOT.rule, height: 1, background: MONO.border }} />
      <div
        style={{
          position: "absolute",
          left: 24,
          right: 24,
          top: TOT.label,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <Label style={{ fontSize: 10, letterSpacing: "0.26em" }}>month to date</Label>
        <span style={{ color: MONO.text3, fontSize: 10.5, fontVariantNumeric: "tabular-nums" }}>
          {`as of Oct ${today + 1}`}
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 22,
          top: TOT.value,
          color: MONO.text,
          fontSize: TOT.size,
          fontWeight: 600,
          lineHeight: 1,
          letterSpacing: "-0.035em",
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {usd(total)}
      </div>
      {/* day of month: one bar per day, today's grows */}
      {DAILY.map((v, k) => {
        const full = (v / MAX_DAY) * STRIP.h;
        const frac = k < today ? 1 : k === today ? D - today : 0;
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: 24 + k * pitch + (pitch - 9) / 2,
              top: STRIP.y,
              width: 9,
              height: STRIP.h,
              borderRadius: 2,
              background: `color-mix(in oklab, ${MONO.text} 5%, transparent)`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: full * frac,
                borderRadius: 2,
                background: k === today ? MONO.accent : `color-mix(in oklab, ${MONO.text} 40%, transparent)`,
              }}
            />
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 24,
          right: 24,
          top: STRIP.labels,
          display: "flex",
          justifyContent: "space-between",
          color: MONO.text3,
          fontSize: 10.5,
          lineHeight: 1.5,
        }}
      >
        <span>Oct 1</span>
        <span>Oct 31</span>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ scene
const Page: React.FC = () => {
  const f = useCurrentFrame();
  // Counters step on whole frames (as a screen recording shows them); the
  // motion-blur sub-samples all sit inside one frame, so digits never smear.
  const fi = Math.floor(f);
  const cam = camAt(f);
  const left = W / 2 - cam.cx * cam.s;
  const top = H / 2 - cam.cy * cam.s;
  return (
    <AbsoluteFill style={{ backgroundColor: MONO.bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: CARD.x + CARD.w,
          height: CARD.h,
          transform: `translate(${left}px, ${top}px) scale(${cam.s})`,
          transformOrigin: "0 0",
          fontFamily: FONT_MONO,
          lineHeight: 1.5,
          color: MONO.text,
        }}
      >
        <FlowLines />
        <Pills f={f} />
        <Seats f={f} />
        <Statement f={f} fi={fi} />
      </div>
    </AbsoluteFill>
  );
};

export const BcP02ThousandsInTokens: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: MRD.bg }}>
    <AbsoluteFill style={{ backgroundColor: MONO.bg }}>
      <MoveBlur moves={MOVES}>
        <Page />
      </MoveBlur>
    </AbsoluteFill>
  </AbsoluteFill>
);
