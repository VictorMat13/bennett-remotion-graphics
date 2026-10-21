import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { API_PRICING, CONDUCTORS, EASE, FONT_MONO, MONO, MRD, OS_EASE, PARTS, PLANS, sec } from "./theme";
import { Badge, Dot, MoveBlur, OsIcon, VolumeMeter, fmtTokens } from "./ui";

// ===========================================================================
// BcP11TwoFlatBills: 1080x960 (9:8) @ 30fps, wrapped in the Holo safe frame
// by Root. VO (never on screen): "And I only pay two monthly flat bills and I
// get around $10,000 worth of API tokens for the cost of $400."
// Word frames: two 53, flat bills 78-99, $10,000 124-147, API tokens 165-186,
// cost 206, $400 223, end 240.
//
// One FounderOS Monolith view (JetBrains Mono, #0a0a0a, hairlines, the kit's
// SlabCard / BigStat / Badge / StepLine / VolumeMeter / CountUp), two tall
// cards side by side in one grid row (gap 16), sized so the punchline frame
// holds both whole cards with the totals at ~78px and no empty band:
//   LEFT  "Plans": ChatGPT Pro $200.00 / mo + Claude Max 20x $200.00 / mo
//         (official marks, "monthly" badges, the conductor seat each plan
//         runs, the tokens each plan carried in 30 days), total $400.00 / mo.
//         Flat bills never count: each price row rises in whole (bn-rise).
//   RIGHT "API price": the 30-day token volume (Token Burn's StepLine, one
//         step per day) priced at the real Opus 5.5 API list rate (theme.ts
//         API_PRICING.opus55), one Burn Volume style meter per lane
//         (tokens x rate = $), total $10,064.40 -> $10,064.80 / mo.
// The token mix (input 301.6M, output 84.9M, cache reads 35.8B = 36.2B)
// prices out exactly: 1,206.40 + 1,698.00 + 7,160.00 = 10,064.40. The plans
// carried 25.9B (Codex, used more than Opus per P07) + 10.3B (Claude) = the
// same 36.2B.
//
//   -10..30 opens mid-move on the Plans card: header + the ChatGPT Pro row
//           (mark, name) already in, its tokens meter mid-sweep, the badge
//           rising, the conductor seat line typing on
//   30..54  slow push toward the price slot; the ok dot blinks (f39-49)
//   48      "two" (f53): $200.00 / mo rises in whole
//   54..82  "flat bills": the camera pans down to the second bill (Claude Max
//           20x), whose row builds on the way; its $200.00 rises f72 (f78)
//   88..136 van Wijk travel to the API price card's lanes + total; the usage
//           poll lands as it arrives (f108): lanes count and sweep, the total
//           counts to $10,064.40 on "$10,000" (lands f147)
//  148..178 "API tokens": tilt up to the token volume + the day steps (the
//           line has drawn, the peak callout lands); the next 10s poll ticks
//           input 301.6M -> 301.7M, so the total settles on $10,064.80 (f200,
//           off frame)
//  184..219 "cost of $400": pull back to both whole cards; the Plans total
//           rule draws, $400.00 counts in and lands on "$400" (f223)
//  219..end near-still hold on stable totals: slow drift, ok dots blink,
//           last-activity stamp ticks
// No cursor. No narration text: only card titles, field labels, numbers.
// ===========================================================================

export const BCP11_DURATION = 255;

const W = 1080;
const H = 960;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const HOUSE = Easing.bezier(...OS_EASE.ease);
const METER = Easing.bezier(...OS_EASE.meterIn); // the kit's cubic-bezier(.2,.7,.2,1)
const ENTER = Easing.bezier(...EASE.enter);

const WORD = PARTS.P11.words;
const F = {
  two: sec(WORD.two), // 53
  tenK: sec(WORD.tenK), // 124
  four: sec(WORD.fourHundred), // 223
} as const;

// ------------------------------------------------------------------ timing
const T = {
  // ChatGPT Pro row: mark + name already in at f0; the meter is mid-sweep at
  // f0 (bright fill on the open frame, blackdetect gate), the badge rises and
  // the seat line types on while the camera settles; the price rises on "two".
  row1Rise: -18,
  row1Meter: -14,
  row1Badge: -6,
  row1Seat: 12,
  row1Price: F.two - 5, // 48: bn-rise is ~80% in by "two" (f53)
  // Claude Max 20x row builds while the camera pans down; price on "flat bills".
  row2Rise: 56,
  row2Meter: 62,
  row2Badge: 64,
  row2Seat: 66,
  row2Price: 72, // ~88% in by "flat bills" (f78)
  poll1: 92, // API price card data lands early so the travel never crosses an empty card (blackdetect f113-116)
  rightTotal: F.tenK - 4, // 120 -> lands f147, the end of "$10,000"
  poll2: 172, // "API tokens": the next 10s poll (input +100k tokens)
  leftRule: 192,
  leftTotal: F.four - 27, // 196 -> lands on "$400"
} as const;
const COUNT = 27; // CountUp 900ms

// ------------------------------------------------------------------- data
const RATE = API_PRICING.opus55; // $ per 1M tokens
type LaneKey = "input" | "output" | "cache";
const LANES: { key: LaneKey; label: string; rate: number; rateText: string }[] = [
  { key: "input", label: "input", rate: RATE.inPerM, rateText: "$4.00" },
  { key: "output", label: "output", rate: RATE.outPerM, rateText: "$20.00" },
  { key: "cache", label: "cache reads", rate: RATE.cacheReadPerM, rateText: "$0.20" },
];
type Tok = Record<LaneKey, number>;
// 30-day token volume per lane, before / after the f172 poll
const TOK0: Tok = { input: 301_600_000, output: 84_900_000, cache: 35_800_000_000 };
const TOK2: Tok = { ...TOK0, input: 301_700_000 };
const priceOf = (t: Tok, k: LaneKey) =>
  Math.round((t[k] / 1e6) * LANES.find((l) => l.key === k)!.rate * 100) / 100;
const totalOf = (t: Tok) => Math.round(LANES.reduce((s, l) => s + priceOf(t, l.key) * 100, 0)) / 100;
const tokSum = (t: Tok) => t.input + t.output + t.cache;

// The tokens each flat plan carried in the same 30 days. Codex carried more
// (VO P07: "I've been using it more than Opus"): 25.9B + 10.3B = 36.2B.
const PLAN_TOKENS = { codex: 25_900_000_000, claude: 10_286_500_000 } as const;
const PLAN_PRICE = { codex: PLANS.codex.priceMonthly, claude: PLANS.claude.priceMonthly } as const; // 200 + 200

// Tokens per day, Sep 11 .. Oct 10 (M tokens; sums to the 36.2B above).
const DAYS = [
  1094, 1009, 930, 1033, 1113, 1151, 1102, 1142, 1085, 1051, 1114, 1159, 1246, 1220, 1205, 1139, 1507, 1219, 1209,
  1317, 1341, 1293, 1185, 1250, 1338, 1277, 1369, 1449, 1402, 1238,
];
const DAY_FIRST = "Sep 11";
const DAY_LAST = "Oct 10";
const PEAK_LABEL = "Sep 27";

// kit/format.ts countFrame(): ease-out cubic, whole numbers on the way, the
// last frame lands exactly (CountUp counts from the number on screen). The
// one exception is a cents-size poll tick, which steps in cents so it never
// dips to .00 on the way (`unit`).
const countFrame = (from: number, to: number, t: number, unit: number) =>
  t >= 1 ? to : t <= 0 ? from : Math.round((from + (to - from) * (1 - Math.pow(1 - t, 3))) / unit) * unit;
// A value that counts in at polls: [frame, target, unit?][]; starts from 0.
const counted = (fi: number, steps: [number, number, number?][]) => {
  let shown = 0;
  for (const [at, to, unit = 1] of steps) {
    if (fi < at) break;
    shown = countFrame(shown, to, (fi - at) / COUNT, unit);
  }
  return shown;
};
const CENT = 0.01;
// kit/format.ts formatCount 'usdCents'
const usdCents = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

// bn-rise: 0.6s on the house ease, from translateY(10px) scale(.992), opacity 0.
const rise = (f: number, start: number): React.CSSProperties => {
  const t = interpolate(f, [start, start + 18], [0, 1], { ...clamp, easing: HOUSE });
  return { opacity: t, transform: `translateY(${10 * (1 - t)}px) scale(${0.992 + 0.008 * t})` };
};
const sweepAt = (f: number, at: number) => interpolate(f, [at, at + 36], [0, 1], { ...clamp, easing: METER });

// ----------------------------------------------------------------- layout
// Page px (the app's CSS px). Two SlabCards in one grid row, gap 16, equal
// height; both total sections sit on the same line.
const CARD_H = 668;
const L = { x: 0, y: 0, w: 336 } as const;
const R = { x: 352, y: 0, w: 444 } as const;
const TOTAL_Y = 542; // the total section's rule, both cards
const TOTAL_SIZE = 60; // the hero total
const ROW = { y0: 68, h: 228 } as const;
const CHART = { y: 104, vbW: 600, vbH: 230 } as const;
const METERS_Y = 316;
const LANE_DY = 70;

// <camera> ==================================================================
// cx/cy: page point at the frame centre; s: frame px per page px.
type Cam = { cx: number; cy: number; s: number };
type Seg = { f0: number; f1: number; to: Cam; ease: (t: number) => number; rho?: number };
const TRAVEL = Easing.bezier(...EASE.travel);
const DECEL = Easing.bezier(...EASE.decel);

const lerpCam = (a: Cam, b: Cam, p: number): Cam => ({
  cx: a.cx + (b.cx - a.cx) * p,
  cy: a.cy + (b.cy - a.cy) * p,
  s: Math.exp(Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * p),
});
// van Wijk & Nuij (2003) smooth zoom-pan: the long travel zooms out just
// enough to keep the screen speed even.
const vanWijk = (a: Cam, b: Cam, rho: number) => {
  const w0 = 1080 / a.s;
  const w1 = 1080 / b.s;
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  const u1 = Math.hypot(dx, dy);
  const r2 = rho * rho;
  const r4 = r2 * r2;
  const b0 = (w1 * w1 - w0 * w0 + r4 * u1 * u1) / (2 * w0 * r2 * u1);
  const b1 = (w1 * w1 - w0 * w0 - r4 * u1 * u1) / (2 * w1 * r2 * u1);
  const R0 = Math.log(-b0 + Math.sqrt(b0 * b0 + 1));
  const R1 = Math.log(-b1 + Math.sqrt(b1 * b1 + 1));
  const S = (R1 - R0) / rho;
  return (p: number): Cam => {
    const sp = S * p;
    const u = (w0 / r2) * Math.cosh(R0) * Math.tanh(rho * sp + R0) - (w0 / r2) * Math.sinh(R0);
    const w = (w0 * Math.cosh(R0)) / Math.cosh(rho * sp + R0);
    return { cx: a.cx + (dx * u) / u1, cy: a.cy + (dy * u) / u1, s: 1080 / w };
  };
};

const CAM_START: Cam = { cx: 128, cy: 116, s: 3.35 }; // virtual (f-10): header + mark + name, moving out
const ROW1: Cam = { cx: 168, cy: 160, s: 2.84 }; // header + the first bill
const ROW1_DRIFT: Cam = { cx: 168, cy: 170, s: 2.92 }; // slow push toward the price slot
const ROW2: Cam = { cx: 168, cy: 392, s: 2.84 }; // the second bill
const ROW2_DRIFT: Cam = { cx: 169, cy: 394, s: 2.86 };
// the API card's three lanes + total (card borders just off frame, the
// chart's date row just above it)
const API: Cam = { cx: 574, cy: 482, s: 2.48 };
const API_DRIFT: Cam = { cx: 574, cy: 482.5, s: 2.495 };
// header + token volume + the day steps + lane 1 (borders just off frame)
const TOKENS: Cam = { cx: 574, cy: 190, s: 2.45 };
const TOKENS_DRIFT: Cam = { cx: 574, cy: 190.5, s: 2.46 };
// both whole cards fill the frame: $400.00 against $10,064.80 at ~78px
const FINAL: Cam = { cx: 398, cy: 334, s: 1.3 };
const FINAL_DRIFT: Cam = { cx: 398, cy: 334, s: 1.312 };

const SEGS: Seg[] = [
  { f0: -10, f1: 30, to: ROW1, ease: DECEL },
  { f0: 30, f1: 54, to: ROW1_DRIFT, ease: TRAVEL },
  { f0: 54, f1: 82, to: ROW2, ease: TRAVEL },
  { f0: 82, f1: 88, to: ROW2_DRIFT, ease: TRAVEL },
  { f0: 88, f1: 136, to: API, ease: TRAVEL, rho: 1.3 },
  { f0: 136, f1: 148, to: API_DRIFT, ease: TRAVEL },
  { f0: 148, f1: 178, to: TOKENS, ease: TRAVEL },
  { f0: 178, f1: 184, to: TOKENS_DRIFT, ease: TRAVEL },
  { f0: 184, f1: 219, to: FINAL, ease: TRAVEL },
  { f0: 219, f1: 258, to: FINAL_DRIFT, ease: DECEL },
];
// camera moves (MoveBlur windows); the drifts in between render plain.
const MOVES: [number, number][] = [
  [0, 30],
  [54, 88],
  [88, 136],
  [148, 178],
  [184, 219],
];

const PATHS = (() => {
  let from = CAM_START;
  return SEGS.map((g) => {
    const a = from;
    from = g.to;
    const vw = g.rho ? vanWijk(a, g.to, g.rho) : null;
    return (p: number) => (vw ? vw(p) : lerpCam(a, g.to, p));
  });
})();

const camAt = (f: number): Cam => {
  for (let k = 0; k < SEGS.length; k++) {
    const g = SEGS[k];
    if (f <= g.f1 || k === SEGS.length - 1) {
      const p = g.ease(Math.max(0, Math.min(1, (f - g.f0) / (g.f1 - g.f0))));
      return PATHS[k](p);
    }
  }
  return CAM_START;
};
// </camera> =================================================================

// ------------------------------------------------------------ kit pieces
// kit/Label.svelte: mono 10px/700 uppercase, tracking .26em, dim.
const Label: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      color: MONO.text3,
      fontSize: 10,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.26em",
      whiteSpace: "nowrap",
      lineHeight: 1.4,
      ...style,
    }}
  >
    {children}
  </div>
);

// kit/BigStat.svelte: count headline, tabular, unit 15px dim. 30 / 50 are
// the kit sizes; the hero totals run larger (TOTAL_SIZE).
const BigStat: React.FC<{ value: string; unit?: string; size?: number; children?: React.ReactNode }> = ({
  value,
  unit,
  size = 50,
  children,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "nowrap" }}>
    <span
      style={{
        color: MONO.text,
        fontSize: size,
        fontWeight: 600,
        lineHeight: 1,
        letterSpacing: size >= 50 ? "-0.035em" : "-0.03em",
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
      }}
    >
      {value}
      {unit ? (
        <span style={{ color: MONO.text3, marginLeft: 6, fontSize: 15, fontWeight: 400, letterSpacing: 0 }}>{unit}</span>
      ) : null}
    </span>
    {children}
  </div>
);

// kit/Chip.svelte: rounded-full px-2.5 py-1 mono 11.5px, hairline border.
const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      border: `1px solid ${MONO.border}`,
      color: MONO.text2,
      padding: "4px 10px",
      fontSize: 11.5,
      fontVariantNumeric: "tabular-nums",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

// SlabCard shell + head (title 19px/600, sub mono 12px dim).
const SlabCard: React.FC<{
  x: number;
  y: number;
  w: number;
  title: string;
  sub?: string;
  children: React.ReactNode;
}> = ({ x, y, w, title, sub, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: CARD_H,
      boxSizing: "border-box",
      border: `1px solid ${MONO.border}`,
      borderRadius: 12,
      background: MONO.surface,
    }}
  >
    <div style={{ position: "absolute", left: 24, top: 20, display: "flex", alignItems: "baseline", gap: 8 }}>
      <span style={{ color: MONO.text, fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.4 }}>
        {title}
      </span>
      {sub ? <span style={{ color: MONO.text3, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{sub}</span> : null}
    </div>
    {children}
  </div>
);

// kit/StepLine.svelte (Token Burn): stepped line over fading pinstripes that
// draws itself (1.6s, .5s in) and pins its peak (dot 1.9s, callout 2s).
const ACTIVITY_HUE = `color-mix(in oklab, ${MONO.brain2} 70%, ${MONO.text})`; // usage.ts ACTIVITY_HUE
const StepLine: React.FC<{ f: number; at: number; width: number }> = ({ f, at, width }) => {
  const { vbW, vbH } = CHART;
  const max = Math.max(...DAYS);
  const stepW = vbW / DAYS.length;
  const pad = Math.round(vbH * 0.4);
  const y = (c: number) => vbH - Math.round(vbH * 0.09) - (c / max) * (vbH - pad);
  let path = `M 0 ${y(DAYS[0])}`;
  DAYS.forEach((_, i) => {
    path += ` H ${(i + 1) * stepW}`;
    if (i < DAYS.length - 1) path += ` V ${y(DAYS[i + 1])}`;
  });
  const area = `${path} V ${vbH} H 0 Z`;
  const peakIdx = DAYS.indexOf(max);
  const py = y(max);
  const draw = interpolate(f, [at + 15, at + 63], [0, 1], { ...clamp, easing: METER });
  const dot = interpolate(f, [at + 57, at + 69], [0, 1], { ...clamp, easing: METER });
  const callout = interpolate(f, [at + 60, at + 75], [0, 1], { ...clamp, easing: METER });
  const svgH = (width - 48) * (vbH / vbW);
  const boxH = svgH + 4 + 16 + 20; // svg + mt-1 + date row + pb-5
  return (
    <div style={{ position: "relative", width, height: boxH }}>
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        style={{ position: "absolute", left: 24, top: 0, width: width - 48, height: svgH, display: "block" }}
      >
        <defs>
          <pattern id="bc11-pins" width="5" height="8" patternUnits="userSpaceOnUse">
            <rect width="1.2" height="8" fill={ACTIVITY_HUE} opacity={0.28} />
          </pattern>
          <linearGradient id="bc11-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={MONO.text} stopOpacity={0.9} />
            <stop offset="1" stopColor={MONO.text} stopOpacity={0.05} />
          </linearGradient>
          <mask id="bc11-mask">
            <rect width={vbW} height={vbH} fill="url(#bc11-fade)" />
          </mask>
        </defs>
        <path d={area} fill="url(#bc11-pins)" mask="url(#bc11-mask)" />
        <path
          d={path}
          fill="none"
          stroke={ACTIVITY_HUE}
          strokeWidth={3}
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - draw}
        />
        <circle cx={(peakIdx + 0.5) * stepW} cy={py} r={4.5} fill={ACTIVITY_HUE} opacity={dot} />
      </svg>
      <div
        style={{
          position: "absolute",
          left: 24 + (width - 48) * ((peakIdx + 0.5) / DAYS.length),
          top: (py / vbH) * boxH,
          transform: "translate(-50%, -140%)",
          whiteSpace: "nowrap",
          borderRadius: 999,
          border: `1px solid ${MONO.border}`,
          padding: "4px 10px",
          fontSize: 11,
          lineHeight: 1.5,
          background: `color-mix(in oklab, ${MONO.bg} 75%, transparent)`,
          opacity: callout,
        }}
      >
        <span style={{ color: ACTIVITY_HUE, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {`${max.toLocaleString("en-US")}M tokens`}
        </span>
        <span style={{ color: MONO.text2 }}>{` on ${PEAK_LABEL}`}</span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 24,
          right: 24,
          top: svgH + 4,
          display: "flex",
          justifyContent: "space-between",
          color: MONO.text3,
          fontSize: 10.5,
          lineHeight: 1.5,
        }}
      >
        <span>{DAY_FIRST}</span>
        <span>{DAY_LAST}</span>
      </div>
    </div>
  );
};

// The total section: a hairline rule that draws, the label, the hero count.
const TotalSection: React.FC<{
  f: number;
  ruleAt: number;
  labelAt: number;
  value: string;
  right?: React.ReactNode;
}> = ({ f, ruleAt, labelAt, value, right }) => {
  const rule = interpolate(f, [ruleAt, ruleAt + 14], [0, 1], { ...clamp, easing: ENTER });
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 24,
          right: 24,
          top: TOTAL_Y,
          height: 1,
          background: MONO.border,
          transform: `scaleX(${rule})`,
          transformOrigin: "0 0",
        }}
      />
      <div style={{ position: "absolute", left: 24, right: 24, top: TOTAL_Y + 18, ...rise(f, labelAt) }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <Label>total</Label>
          {right}
        </div>
      </div>
      <div style={{ position: "absolute", left: 24, top: TOTAL_Y + 42, ...rise(f, labelAt + 2) }}>
        <BigStat value={value} unit="/ mo" size={TOTAL_SIZE} />
      </div>
    </>
  );
};

// ------------------------------------------------------------ Plans card
const MarkTile: React.FC<{ src: string; size?: number }> = ({ src, size = 22 }) => (
  <div
    style={{
      width: 44,
      height: 44,
      boxSizing: "border-box",
      borderRadius: 8,
      border: `1px solid ${MONO.border}`,
      background: MONO.surface2,
      display: "grid",
      placeItems: "center",
      flexShrink: 0,
    }}
  >
    <Img src={staticFile(src)} style={{ width: size, height: size, objectFit: "contain" }} />
  </div>
);

const BillRow: React.FC<{
  f: number;
  fi: number;
  y: number;
  last: boolean;
  logo: string;
  name: string;
  seat: string;
  tokens: number;
  riseAt: number;
  meterAt: number;
  badgeAt: number;
  seatAt: number;
  priceAt: number;
  price: number;
  blinkPhase: number;
}> = ({ f, fi, y, last, logo, name, seat, tokens, riseAt, meterAt, badgeAt, seatAt, priceAt, price, blinkPhase }) => {
  const tok = counted(fi, [[meterAt, tokens]]);
  // the seat line types on (1.5 chars / frame), the Crown glyph lands first
  const typed = seat.slice(0, Math.max(0, Math.min(seat.length, Math.floor((fi - seatAt - 2) * 1.5))));
  return (
    <div
      style={{
        position: "absolute",
        left: 24,
        right: 24,
        top: y,
        height: ROW.h,
        boxSizing: "border-box",
        borderBottom: last ? undefined : `1px solid ${MONO.hairline}`,
      }}
    >
      {/* mark + plan name + billing badge */}
      <div style={{ position: "absolute", left: 0, top: 28, display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={rise(f, riseAt)}>
          <MarkTile src={logo} />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, ...rise(f, riseAt + 2) }}>
            <Dot state="ok" blink frame={fi + blinkPhase} />
            <span style={{ color: MONO.text, fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
              {name}
            </span>
          </div>
          <div style={{ marginTop: 8, ...rise(f, badgeAt) }}>
            <Badge>monthly</Badge>
          </div>
        </div>
      </div>
      {/* the bill: a flat price, so the whole row rises in (bn-rise), no count */}
      <div style={{ position: "absolute", left: 0, top: 92, whiteSpace: "nowrap", ...rise(f, priceAt) }}>
        <span
          style={{
            color: MONO.text,
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {usdCents(price)}
        </span>
        <span style={{ color: MONO.text3, fontSize: 13, marginLeft: 6 }}>/ mo</span>
      </div>
      {/* the conductor seat this plan runs (SeatChip model line) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 136,
          display: "flex",
          alignItems: "center",
          gap: 7,
          color: MONO.text3,
          fontSize: 10.5,
          lineHeight: 1.5,
          whiteSpace: "nowrap",
          ...rise(f, seatAt),
        }}
      >
        <OsIcon name="Crown" size={12} color="#e4efe6" strokeWidth={1.8} />
        <span>{typed}</span>
      </div>
      {/* tokens this plan carried in 30 days (Burn Volume meter) */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 168, ...rise(f, meterAt - 2) }}>
        <VolumeMeter
          label="tokens · 30d"
          frac={tokens / tokSum(TOK0)}
          display={fmtTokens(tok)}
          hue={MONO.accent}
          sweep={sweepAt(f, meterAt)}
        />
      </div>
    </div>
  );
};

const PlansCard: React.FC<{ f: number; fi: number }> = ({ f, fi }) => {
  const total = counted(fi, [[T.leftTotal, PLAN_PRICE.codex + PLAN_PRICE.claude]]);
  return (
    <SlabCard x={L.x} y={L.y} w={L.w} title="Plans">
      <BillRow
        f={f}
        fi={fi}
        y={ROW.y0}
        last={false}
        logo={PLANS.codex.logoWhite}
        name={PLANS.codex.plan}
        seat={`${CONDUCTORS.codex.model} · ${CONDUCTORS.codex.adapter}`}
        tokens={PLAN_TOKENS.codex}
        riseAt={T.row1Rise}
        meterAt={T.row1Meter}
        badgeAt={T.row1Badge}
        seatAt={T.row1Seat}
        priceAt={T.row1Price}
        price={PLAN_PRICE.codex}
        blinkPhase={28}
      />
      <BillRow
        f={f}
        fi={fi}
        y={ROW.y0 + ROW.h}
        last
        logo={PLANS.claude.logo}
        name={PLANS.claude.plan}
        seat={`${CONDUCTORS.claude.model} · ${CONDUCTORS.claude.adapter}`}
        tokens={PLAN_TOKENS.claude}
        riseAt={T.row2Rise}
        meterAt={T.row2Meter}
        badgeAt={T.row2Badge}
        seatAt={T.row2Seat}
        priceAt={T.row2Price}
        price={PLAN_PRICE.claude}
        blinkPhase={64}
      />
      <TotalSection f={f} ruleAt={T.leftRule} labelAt={T.leftRule + 4} value={usdCents(total)} />
    </SlabCard>
  );
};

// -------------------------------------------------------- API price card
const ApiCard: React.FC<{ f: number; fi: number }> = ({ f, fi }) => {
  // each lane's tokens and $ count in at poll1 (whole numbers on the way) and
  // tick at poll2 (input only: +100k tokens, +$0.40 in cents)
  const lane = (k: LaneKey, i: number) => {
    const at = T.poll1 + 4 + i * 3;
    const tok = counted(fi, [
      [at, TOK0[k]],
      [T.poll2, TOK2[k]],
    ]);
    const usd = counted(fi, [
      [at + 1, priceOf(TOK0, k)],
      [T.poll2, priceOf(TOK2, k), CENT],
    ]);
    return { tok, usd, at };
  };
  const volume = counted(fi, [
    [T.poll1, tokSum(TOK0)],
    [T.poll2, tokSum(TOK2)],
  ]);
  const total = counted(fi, [
    [T.rightTotal, totalOf(TOK0)],
    [T.poll2 + 1, totalOf(TOK2), CENT],
  ]);
  const grand = totalOf(TOK0);
  // last activity: "now" on a poll, then whole seconds
  const lastPoll = fi >= T.poll2 ? T.poll2 : T.poll1;
  const ago = Math.floor((fi - lastPoll) / 30);
  return (
    <SlabCard x={R.x} y={R.y} w={R.w} title="API price" sub="Claude + Codex · last 30 days">
      <div style={{ position: "absolute", left: 24, right: 24, top: 62, ...rise(f, T.poll1 - 1) }}>
        <BigStat value={fmtTokens(volume)} unit="tokens" size={30}>
          <div style={rise(f, T.poll1 + 6)}>
            <Chip>opus-5-5 list rate</Chip>
          </div>
        </BigStat>
      </div>
      <div style={{ position: "absolute", left: 0, top: CHART.y, ...rise(f, T.poll1 + 1) }}>
        <StepLine f={f} at={T.poll1} width={R.w} />
      </div>
      {/* MeterStack: hairline, then one meter per lane (150ms stagger) */}
      <div style={{ position: "absolute", left: 24, right: 24, top: METERS_Y, borderTop: `1px solid ${MONO.border}` }} />
      {LANES.map((l, i) => {
        const { tok, usd, at } = lane(l.key, i);
        return (
          <div
            key={l.key}
            style={{ position: "absolute", left: 24, right: 24, top: METERS_Y + 20 + i * LANE_DY, ...rise(f, at - 2) }}
          >
            <VolumeMeter
              label={`${l.label} · ${fmtTokens(tok)} × ${l.rateText} / 1M`}
              frac={priceOf(TOK0, l.key) / grand}
              display={usdCents(usd)}
              hue={MONO.accent}
              sweep={sweepAt(f, at)}
            />
          </div>
        );
      })}
      <TotalSection
        f={f}
        ruleAt={T.rightTotal - 6}
        labelAt={T.rightTotal - 3}
        value={usdCents(total)}
        right={
          <span style={{ color: MONO.text3, fontSize: 10, whiteSpace: "nowrap" }}>
            {`2 machines · last activity ${ago <= 0 ? "now" : `${ago}s ago`}`}
          </span>
        }
      />
    </SlabCard>
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
          width: R.x + R.w,
          height: CARD_H,
          transform: `translate(${left}px, ${top}px) scale(${cam.s})`,
          transformOrigin: "0 0",
          fontFamily: FONT_MONO,
          lineHeight: 1.5,
          color: MONO.text,
        }}
      >
        <PlansCard f={f} fi={fi} />
        <ApiCard f={f} fi={fi} />
      </div>
    </AbsoluteFill>
  );
};

export const BcP11TwoFlatBills: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: MRD.bg }}>
    <AbsoluteFill style={{ backgroundColor: MONO.bg }}>
      <MoveBlur moves={MOVES}>
        <Page />
      </MoveBlur>
    </AbsoluteFill>
  </AbsoluteFill>
);
