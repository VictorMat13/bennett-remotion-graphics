import React from "react";
import { Img, interpolate, staticFile, Easing, useCurrentFrame } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { ICONS } from "./icons";
import { FONT_MONO, MONO, OS_EASE, RADII, pctTone, toneColor } from "./theme";

// ===========================================================================
// FounderOS components ported 1:1 from Bennett's repo (Svelte -> React) for
// the bconductor series. Sizes are the app's real CSS px: lay them out in a
// "page" coordinate space and let your camera zoom in like a screen
// recording. Every animated bit takes frame-driven props (no CSS animation).
// Sources: frontend/src/lib/founderos/{kit,pages/usage,pages/agents,
// pages/tasks,chrome}/*. READ-ONLY for builders.
// ===========================================================================

// FounderOS Monolith is JetBrains Mono everywhere; load it once for every part.
loadMono("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

const mix = (c: string, pct: number, other = "transparent") =>
  `color-mix(in oklab, ${c} ${pct}%, ${other})`;

// ------------------------------------------------------------------- Icon
// lucide-react 0.441 glyphs exactly as FounderOS ships them (./icons.ts).
export const OsIcon: React.FC<{
  name: keyof typeof ICONS | string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}> = ({ name, size = 14, color = "currentColor", strokeWidth = 2, style }) => {
  const node = ICONS[name];
  if (!node) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, display: "block", ...style }}
    >
      {node.map(([tag, attrs], i) =>
        React.createElement(tag, { key: i, ...attrs }),
      )}
    </svg>
  );
};

// -------------------------------------------------------------- OS emblem
// The current OS mark (kit/OsMark.svelte -> os-emblem.png): white ring + dot.
export const OsMark: React.FC<{ size?: number }> = ({ size = 34 }) => (
  <Img
    src={staticFile("bconductor/os/os-emblem.png")}
    style={{ width: size, height: size, objectFit: "contain" }}
  />
);

// -------------------------------------------------------------------- Dot
// kit/Dot.svelte: 6px LED. Only an ok dot blinks (bn-led-blink 2.6s steps).
export const Dot: React.FC<{
  state: "ok" | "warn" | "err" | "off";
  frame?: number;
  blink?: boolean;
  size?: number;
}> = ({ state, frame = 0, blink = false, size = 6 }) => {
  let opacity = 1;
  if (blink && state === "ok") {
    const t = ((frame / 30) % 2.6) / 2.6;
    opacity = t >= 0.7 && t < 0.85 ? 1 : t >= 0.85 ? 0.25 : 1;
  }
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        display: "inline-block",
        opacity,
        background: state === "off" ? "transparent" : MONO[state],
        border: state === "off" ? `1px solid ${MONO.text3}` : undefined,
      }}
    />
  );
};

// ------------------------------------------------------------------ Badge
// kit/Badge.svelte: rounded-full border px-2 py-[3px] mono 9.5px uppercase.
export const Badge: React.FC<{
  tone?: "default" | "accent" | "ok" | "warn" | "err";
  children: React.ReactNode;
}> = ({ tone = "default", children }) => {
  const t =
    tone === "default"
      ? { border: MONO.borderStrong, bg: "transparent", color: MONO.text2 }
      : tone === "accent"
        ? { border: MONO.accentLine, bg: MONO.accentSoft, color: MONO.accent }
        : {
            border: mix(MONO[tone], 35),
            bg: mix(MONO[tone], 9),
            color: MONO[tone],
          };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        whiteSpace: "nowrap",
        borderRadius: 999,
        border: `1px solid ${t.border}`,
        background: t.bg,
        color: t.color,
        padding: "3px 8px",
        fontFamily: FONT_MONO,
        fontSize: 9.5,
        textTransform: "uppercase",
        letterSpacing: "0.14em",
        lineHeight: 1.2,
      }}
    >
      {children}
    </span>
  );
};

// ------------------------------------------------------------ VolumeMeter
// kit/VolumeMeter.svelte: label/value row over a 10px track; the hatched,
// glowing fill sweeps out from the left (1.2s cubic-bezier(.2,.7,.2,1)).
// `sweep` 0..1 = how far the entrance sweep has played (drive it from frame
// with meterSweep()); `frac` is the value. Change `frac` over frames to make
// the meter climb.
export const meterSweep = (frame: number, start: number, fps = 30) =>
  interpolate(frame, [start, start + 1.2 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...OS_EASE.meterIn),
  });

export const VolumeMeter: React.FC<{
  label: string;
  frac: number;
  display: string;
  hue: string;
  sweep?: number;
  compact?: boolean;
}> = ({ label, frac, display, hue, sweep = 1, compact = false }) => {
  const w = Math.max(0, Math.min(1, frac)) * sweep;
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span style={{ color: MONO.text2, fontSize: compact ? 12.5 : 13.5 }}>
          {label}
        </span>
        <span
          style={{
            color: MONO.text,
            fontSize: compact ? 12.5 : 14,
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {display}
        </span>
      </div>
      <div
        style={{
          marginTop: compact ? 4 : 8,
          height: compact ? 6 : 10,
          borderRadius: 999,
          overflow: "hidden",
          background: mix(MONO.text, 8),
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 999,
            width: `${Math.round(w * 1000) / 10}%`,
            background: `linear-gradient(90deg, transparent 72%, ${mix(hue, 60, MONO.text)} 100%), repeating-linear-gradient(45deg, ${hue}, ${hue} 6px, ${mix(hue, 45)} 6px, ${mix(hue, 45)} 12px)`,
            boxShadow: `0 0 14px ${mix(hue, 45)}, inset 0 0 5px ${mix(hue, 55)}`,
          }}
        />
      </div>
    </div>
  );
};

// usage.ts limitMeter(): "Session limit · 5h" / "Weekly limit · 7d",
// display "87% · resets in 3d", hue by pctTone.
export const limitMeterProps = (
  kind: "session" | "weekly",
  usedPercent: number,
  reset: string,
) => {
  const round = (n: number) =>
    n >= 10 || n === 0 ? n.toFixed(0) : n.toFixed(1);
  return {
    label: kind === "session" ? "Session limit · 5h" : "Weekly limit · 7d",
    frac: Math.max(0, Math.min(1, usedPercent / 100)),
    display: `${round(usedPercent)}%${reset ? ` · ${reset}` : ""}`,
    hue: toneColor(pctTone(usedPercent)),
  };
};

// usage.ts pct(): "1.2%" under 10, "34%" from 10.
export const pct = (n: number) => (n >= 10 || n === 0 ? `${n.toFixed(0)}%` : `${n.toFixed(1)}%`);

// usage.ts fmtTokens(): 1234567 -> "1.2M".
export const fmtTokens = (n: number) =>
  n >= 1e9
    ? `${(n / 1e9).toFixed(1)}B`
    : n >= 1e6
      ? `${(n / 1e6).toFixed(1)}M`
      : n >= 1e3
        ? `${(n / 1e3).toFixed(1)}k`
        : String(Math.round(n));

// ---------------------------------------------------------------- PlanCard
// pages/usage/PlanCard.svelte + WindowStrip + LaneBar.
export type LaneBurn = {
  board: number;
  sessions: number;
  terminal: number;
  automation: number;
};
const LANE_HUE: Record<keyof LaneBurn, string> = {
  board: MONO.accent,
  sessions: MONO.brain2,
  terminal: MONO.brain1,
  automation: mix(MONO.brain1, 70, MONO.accent),
};
const WINDOW_LABEL = ["last hour", "5h session", "today", "7 days"] as const;

export const PlanCard: React.FC<{
  title: string;
  plan: string;
  sessionPct: number;
  weeklyPct: number;
  sessionReset?: string;
  weeklyReset?: string;
  /** burn per window: [last hour, 5h session, today, 7 days] */
  burns: [number, number, number, number];
  /** "≈x% of wk" sub-line per window (null -> "of wk burn") */
  pctOfWeek?: [number, number, number, number];
  lanes: LaneBurn;
  machines?: number;
  lastActivity?: string;
  sessionSweep?: number;
  weeklySweep?: number;
  selected?: boolean;
  live?: boolean;
  width?: number;
  style?: React.CSSProperties;
}> = ({
  title,
  plan,
  sessionPct,
  weeklyPct,
  sessionReset = "",
  weeklyReset = "",
  burns,
  pctOfWeek,
  lanes,
  machines = 1,
  lastActivity = "now",
  sessionSweep = 1,
  weeklySweep = 1,
  selected = false,
  live = true,
  width = 520,
  style,
}) => {
  const laneTotal = lanes.board + lanes.sessions + lanes.terminal + lanes.automation;
  return (
    <div
      style={{
        width,
        boxSizing: "border-box",
        borderRadius: RADII.tile,
        border: `1px solid ${selected ? MONO.accent : MONO.border}`,
        background: MONO.bg,
        padding: 20,
        fontFamily: FONT_MONO,
        color: MONO.text,
        textAlign: "left",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Dot state={live ? "ok" : "off"} />
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>{title}</span>
        </div>
        <Badge tone="accent">{`${plan} · active`}</Badge>
      </div>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        <VolumeMeter {...limitMeterProps("session", sessionPct, sessionReset)} sweep={sessionSweep} />
        <VolumeMeter {...limitMeterProps("weekly", weeklyPct, weeklyReset)} sweep={weeklySweep} />
      </div>
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {WINDOW_LABEL.map((lab, i) => (
          <div key={lab} style={{ borderLeft: `1px solid ${MONO.border}`, paddingLeft: 8 }}>
            <div style={{ fontSize: 19, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
              {fmtTokens(burns[i])}
            </div>
            <div style={{ color: MONO.text3, fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.16em" }}>{lab}</div>
            <div style={{ color: MONO.text2, fontSize: 9.5 }}>
              {pctOfWeek ? `≈${pct(pctOfWeek[i])} of wk${i === 3 ? "" : " est."}` : "of wk burn"}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
        <div
          style={{
            display: "flex",
            width: "100%",
            gap: 2,
            overflow: "hidden",
            borderRadius: 999,
            height: 8,
            background: mix(MONO.text, 8),
          }}
        >
          {laneTotal > 0 &&
            (Object.keys(LANE_HUE) as (keyof LaneBurn)[]).map((k) =>
              lanes[k] > 0 ? (
                <div key={k} style={{ height: "100%", width: `${(lanes[k] / laneTotal) * 100}%`, background: LANE_HUE[k] }} />
              ) : null,
            )}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: MONO.text3, fontSize: 10 }}>
          <span>{`${machines} machine${machines === 1 ? "" : "s"} · last activity ${lastActivity}`}</span>
          <span>{selected ? "breakdown ▾" : "breakdown ▸"}</span>
        </div>
      </div>
    </div>
  );
};

// --------------------------------------------------------- ConductorEmblem
// kit/ConductorEmblem.svelte: round core in a hairline ring. Thinking: an
// accent comet orbits the ring (1.1s/turn), the core breathes and a halo
// pulses out (1.9s). `thinking` can be a 0..1 amount to fade it in/out.
export const ConductorEmblem: React.FC<{
  size?: number;
  frame: number;
  thinking?: number;
  shade?: string;
  accent?: string;
}> = ({ size = 32, frame, thinking = 0, shade = MONO.text, accent = MONO.accent }) => {
  const t = frame / 30;
  const sweepRot = ((t % 1.1) / 1.1) * 360;
  const hp = (t % 1.9) / 1.9;
  const haloScale = hp < 0.7 ? 0.7 + (hp / 0.7) * 1.3 : 2;
  const haloOp = (hp < 0.7 ? 0.62 * (1 - hp / 0.7) : 0) * thinking;
  const breathe = 1 + 0.05 * Math.sin(hp * Math.PI) * thinking;
  const glyph = Math.round(size * 0.56);
  const layer: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: 9999,
  };
  return (
    <span style={{ position: "relative", display: "inline-block", width: size, height: size, flexShrink: 0 }}>
      <span
        style={{
          ...layer,
          background: `radial-gradient(circle, ${mix(accent, 32)}, transparent 68%)`,
          transform: `scale(${haloScale})`,
          opacity: haloOp,
        }}
      />
      <span
        style={{
          ...layer,
          background: `conic-gradient(from 0deg, transparent 0deg, ${mix(accent, 35)} 34deg, ${accent} 82deg, transparent 104deg)`,
          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), black calc(100% - 3px))",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), black calc(100% - 3px))",
          filter: `drop-shadow(0 0 3px ${mix(accent, 55)})`,
          transform: `rotate(${sweepRot}deg)`,
          opacity: thinking,
        }}
      />
      <span style={{ ...layer, border: `1px solid ${mix(MONO.borderStrong, 80)}` }} />
      <span
        style={{
          position: "absolute",
          left: 3.5,
          top: 3.5,
          width: size - 7,
          height: size - 7,
          borderRadius: 9999,
          display: "grid",
          placeItems: "center",
          background: `radial-gradient(circle at 50% 40%, ${mix(MONO.text, 12, MONO.surface)}, ${MONO.bg} 74%)`,
          boxShadow: `inset 0 0 0 1px ${thinking > 0 ? mix(accent, 65 * thinking * Math.sin(hp * Math.PI), MONO.borderStrong) : MONO.borderStrong}`,
          transform: `scale(${breathe})`,
        }}
      >
        <span
          style={{
            width: glyph,
            height: glyph,
            backgroundColor: shade,
            WebkitMaskImage: `url(${staticFile("bconductor/os/vantage-emblem.png")})`,
            maskImage: `url(${staticFile("bconductor/os/vantage-emblem.png")})`,
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
            WebkitMaskSize: "contain",
            maskSize: "contain",
            display: "inline-block",
          }}
        />
      </span>
    </span>
  );
};

// ---------------------------------------------------------------- SeatChip
// pages/agents/SeatChip.svelte: glyph + name + model line + run control.
// EXACTLY the real SEAT_GLYPHS regexes (pages/agents/SeatChip.svelte): a seat
// name that matches none of them gets the Bot glyph in the muted tone.
const SEAT_GLYPHS: [RegExp, string, string][] = [
  [/conductor/i, "Crown", "#e4efe6"],
  [/tech/i, "Cpu", "#8b7cf6"],
  [/marketing|growth/i, "Megaphone", "#ff9f43"],
  [/finance/i, "Landmark", "#38bdf8"],
  [/sales/i, "TrendingUp", "#ffd166"],
  [/comm/i, "MessageSquare", "#4cc9f0"],
  [/forge/i, "Hammer", "#f472b6"],
  [/hermes|worker/i, "Zap", "#a78bfa"],
  [/summar/i, "FileText", "#94a3b8"],
  [/reflect/i, "Sparkles", "#facc15"],
];

// kit.css .bn-agent-live::before: a green comet that travels a live seat's
// border every 2.4s (linear). Put it inside a position:relative wrapper the
// size of the chip, or pass `orbit` to SeatChip.
export const LiveOrbit: React.FC<{ frame: number; phase?: number; opacity?: number; radius?: number }> = ({
  frame,
  phase = 0,
  opacity = 1,
  radius = RADII.ctl,
}) => {
  const ang = (((((frame / 30 + phase) % 2.4) + 2.4) % 2.4) / 2.4) * 360;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        boxSizing: "border-box",
        borderRadius: radius,
        padding: 1,
        background: `conic-gradient(from ${ang}deg, transparent 0turn, transparent 0.55turn, ${mix(MONO.ok, 70)} 0.78turn, ${MONO.ok} 0.92turn, transparent 1turn)`,
        WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        WebkitMaskComposite: "xor",
        mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        maskComposite: "exclude",
        opacity,
        pointerEvents: "none",
      }}
    />
  );
};

export const SeatChip: React.FC<{
  name: string;
  model: string;
  adapter?: string;
  status: "running" | "idle" | "error" | "paused";
  frame: number;
  /** seconds this run has been going (ticks with frame if you pass a growing value) */
  elapsedSec?: number | null;
  failure?: string | null;
  width?: number;
  /** draw the real live-border orbit while running (kit.css bn-agent-live) */
  orbit?: boolean;
  orbitPhase?: number;
  style?: React.CSSProperties;
}> = ({ name, model, adapter, status, frame, elapsedSec = null, failure = null, width = 250, orbit = false, orbitPhase = 0, style }) => {
  const g = SEAT_GLYPHS.find(([re]) => re.test(name));
  const icon = g?.[1] ?? "Bot";
  const idleColor = g?.[2] ?? MONO.text2;
  const live = status === "running";
  const toneColor =
    status === "error" ? MONO.err : live ? MONO.ok : status === "paused" ? MONO.warn : idleColor;
  const modelLine = `${model}${adapter ? ` · ${adapter}` : ""}`;
  const elapsed =
    elapsedSec == null
      ? null
      : elapsedSec < 60
        ? `${Math.floor(elapsedSec)}s`
        : `${Math.floor(elapsedSec / 60)}m${String(Math.floor(elapsedSec % 60)).padStart(2, "0")}`;
  const pulse = live ? 0.55 + 0.45 * (0.5 + 0.5 * Math.cos((frame / 30) * Math.PI)) : 1; // animate-pulse 2s
  return (
    <div
      style={{
        width,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        border: `1px solid ${status === "error" ? mix(MONO.err, 45, MONO.border) : live ? mix(MONO.ok, 40, MONO.border) : MONO.border}`,
        borderRadius: RADII.ctl,
        background: MONO.bg,
        padding: "8px 10px",
        fontFamily: FONT_MONO,
        position: "relative",
        ...style,
      }}
    >
      {orbit && live ? <LiveOrbit frame={frame} phase={orbitPhase} /> : null}
      <span style={{ marginTop: 2, color: toneColor, opacity: pulse }}>
        <OsIcon name={icon} size={14} strokeWidth={1.8} />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ color: MONO.text, fontSize: 11.5, fontWeight: 600, lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {name}
        </div>
        <div style={{ color: MONO.text3, fontSize: 9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {modelLine}
          {failure ? <span style={{ color: MONO.err }}>{` · ${failure}`}</span> : null}
        </div>
      </div>
      <div style={{ display: "flex", width: 28, flexShrink: 0, flexDirection: "column", alignItems: "center", gap: 4, alignSelf: "center" }}>
        {live ? (
          <>
            <span style={{ color: MONO.ok, transform: `rotate(${((frame / 30) % 1) * 360}deg)` }}>
              <OsIcon name="LoaderCircle" size={14} />
            </span>
            {elapsed ? (
              <span style={{ color: MONO.ok, fontSize: 8.5, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{elapsed}</span>
            ) : null}
          </>
        ) : (
          <span
            style={{
              display: "inline-grid",
              placeItems: "center",
              width: 26,
              height: 26,
              borderRadius: 6,
              color: status === "error" ? MONO.err : MONO.text3,
              fontSize: 10.5,
              fontWeight: 600,
            }}
          >
            {status === "error" ? "✗" : "▸"}
          </span>
        )}
      </div>
    </div>
  );
};

// ------------------------------------------------------- Kanban (Tasks page)
// pages/tasks/TaskKanban.svelte: lanes with a tone dot + label + count pill,
// cards rounded 10px, title 12.5px, owner row mono 10px with User icon + ▸.
export const KANBAN_LANES = [
  { key: "todo", label: "To do", tone: MONO.text3 },
  { key: "doing", label: "In progress", tone: MONO.warn },
  { key: "review", label: "In review", tone: MONO.accent },
  { key: "done", label: "Done", tone: MONO.ok },
] as const;

export const KanbanLaneHeader: React.FC<{ label: string; tone: string; count: number }> = ({ label, tone, count }) => (
  <div style={{ marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: FONT_MONO }}>
    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: tone }} />
      <span style={{ color: MONO.text, fontSize: 13, fontWeight: 600 }}>{label}</span>
    </span>
    <span
      style={{
        borderRadius: 999,
        padding: "2px 10px",
        fontSize: 10.5,
        fontVariantNumeric: "tabular-nums",
        color: tone,
        background: mix(tone, 14),
      }}
    >
      {count}
    </span>
  </div>
);

export const TaskCard: React.FC<{
  title: string;
  owner: string;
  done?: boolean;
  /** 0..1 strike-through draw for a card that just landed in Done */
  strike?: number;
  width?: number;
  style?: React.CSSProperties;
}> = ({ title, owner, done = false, strike, width = 260, style }) => {
  const s = strike ?? (done ? 1 : 0);
  return (
    <div
      style={{
        width,
        boxSizing: "border-box",
        borderRadius: 10,
        border: `1px solid ${MONO.border}`,
        background: MONO.surface,
        padding: 12,
        fontFamily: FONT_MONO,
        ...style,
      }}
    >
      <div style={{ position: "relative", fontSize: 12.5, fontWeight: 500, lineHeight: 1.375, color: s > 0.5 ? MONO.text3 : MONO.text }}>
        <span
          style={{
            backgroundImage: `linear-gradient(${MONO.text3}, ${MONO.text3})`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "0 55%",
            backgroundSize: `${s * 100}% 1px`,
            boxDecorationBreak: "clone",
            WebkitBoxDecorationBreak: "clone",
          }}
        >
          {title}
        </span>
      </div>
      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, color: MONO.text3, fontSize: 10 }}>
        <OsIcon name="User" size={12} />
        <span style={{ minWidth: 0, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{owner}</span>
        {!done ? (
          <span style={{ flexShrink: 0, borderRadius: 999, border: `1px solid ${MONO.border}`, padding: "2px 8px", fontSize: 10 }}>▸</span>
        ) : null}
      </div>
    </div>
  );
};

// ------------------------------------------------------ ConductorComposer
// chrome/ConductorComposer.svelte bottom row: + · hint · MODEL · mic · voice · send.
export const ConductorComposer: React.FC<{
  model: string;
  placeholder?: string;
  width?: number;
  style?: React.CSSProperties;
}> = ({ model, placeholder = "Message the Conductor", width = 420, style }) => (
  <div
    style={{
      width,
      boxSizing: "border-box",
      border: `1px solid ${MONO.border}`,
      borderRadius: RADII.panel,
      background: MONO.bg,
      padding: "10px 10px 8px",
      fontFamily: FONT_MONO,
      ...style,
    }}
  >
    <div style={{ color: MONO.text3, fontSize: 12, lineHeight: 1.6, minHeight: 20 }}>{placeholder}</div>
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
      <span style={{ color: MONO.text3, padding: 6 }}><OsIcon name="Plus" size={14} /></span>
      <span style={{ color: MONO.text3, fontSize: 9, whiteSpace: "nowrap" }}>Enter sends · Shift+Enter breaks</span>
      <span style={{ color: MONO.text3, fontSize: 10, marginLeft: "auto", marginRight: 4, whiteSpace: "nowrap" }}>{model}</span>
      <span style={{ color: MONO.text3, padding: 6 }}><OsIcon name="Mic" size={14} /></span>
      <span style={{ color: MONO.text3, padding: 6 }}><OsIcon name="AudioLines" size={14} /></span>
      <span style={{ color: MONO.text, padding: 6, border: `1px solid ${MONO.border}`, borderRadius: 999 }}>
        <OsIcon name="Send" size={12} />
      </span>
    </div>
  </div>
);

// ------------------------------------------------------------------ Cursor
// Plain macOS-style arrow. Only P06 uses it (Bennett picking models).
export const Cursor: React.FC<{ x: number; y: number; pressed?: number; scale?: number }> = ({
  x,
  y,
  pressed = 0,
  scale = 1,
}) => (
  <svg
    width={22 * scale}
    height={30 * scale}
    viewBox="0 0 22 30"
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: `scale(${1 - 0.12 * pressed})`,
      transformOrigin: "2px 2px",
      filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.5))",
      zIndex: 50,
    }}
  >
    <path d="M2 2 L2 24 L8 18.5 L12 27.5 L15.5 26 L11.6 17.2 L19.5 17.2 Z" fill="#fff" stroke="#000" strokeWidth={1.4} strokeLinejoin="round" />
  </svg>
);

// ---------------------------------------------------------------- OsChrome
// The real FounderOS shell, cropped straight from the captures (2x PNGs):
// sidebar 232x1000 css px, topbar 1368x52 css px (breadcrumb per page).
// Lay your page content in the area x 232..1600, y 52..1000 (css px) of a
// 1600x1000 "page" and move a camera over it. page: which nav item is lit
// (usage shows none in view), and which breadcrumb the topbar reads.
export const OS_PAGE = { w: 1600, h: 1000, sidebarW: 232, topbarH: 52 } as const;

export const OsChrome: React.FC<{ page: "usage" | "agents" | "tasks"; style?: React.CSSProperties }> = ({ page, style }) => (
  <>
    <Img
      src={staticFile(`bconductor/chrome/sidebar-${page}.png`)}
      style={{ position: "absolute", left: 0, top: 0, width: OS_PAGE.sidebarW, height: OS_PAGE.h, ...style }}
    />
    <Img
      src={staticFile(`bconductor/chrome/topbar-${page}.png`)}
      style={{ position: "absolute", left: OS_PAGE.sidebarW, top: 0, width: OS_PAGE.w - OS_PAGE.sidebarW, height: OS_PAGE.topbarH, ...style }}
    />
  </>
);

// --------------------------------------------------------------- MoveBlur
// Smooth camera blur for 2D screen-recording parts. CameraMotionBlur at 5
// samples shows 5 stepped copies on fast moves (Victor-visible ghosting), so
// moving frames get 12 samples and still frames render plain (no cost).
// moves: [startFrame, endFrame] of every camera move / fast swoop. Keep peak
// camera speed under ~70 px/frame on the 1080 canvas; lengthen the move
// rather than adding blur. (3D parts: stay at samples <= 5, memory rule.)
export const MoveBlur: React.FC<{
  moves: [number, number][];
  samples?: number;
  children: React.ReactNode;
}> = ({ moves, samples = 12, children }) => {
  const f = useCurrentFrame();
  const moving = moves.some(([a, b]) => f >= a && f <= b + 1);
  return moving ? (
    <CameraMotionBlur shutterAngle={180} samples={samples}>
      {children}
    </CameraMotionBlur>
  ) : (
    <>{children}</>
  );
};
