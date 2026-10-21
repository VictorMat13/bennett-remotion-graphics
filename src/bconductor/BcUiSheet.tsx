import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CONDUCTORS, MONO, SEATS, TASKS, USAGE } from "./theme";
import { ConductorComposer, ConductorEmblem, KanbanLaneHeader, PlanCard, SeatChip, TaskCard } from "./ui";

// Dev-only contact sheet: every shared component, for checking ui.tsx against the captures.
export const BCUISHEET_DURATION = 60;
export const BcUiSheet: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: MONO.bg, padding: 40, gap: 24, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", gap: 24 }}>
        <PlanCard title="Codex" plan="ChatGPT Pro" sessionPct={USAGE.codexSessionA} weeklyPct={USAGE.codexWeeklyA} sessionReset="resets in 2h" weeklyReset={USAGE.codexWeeklyReset} burns={[310000, 1900000, 4200000, 61000000]} pctOfWeek={[0.4, 2.7, 6, 87]} lanes={{ board: 40, sessions: 12, terminal: 30, automation: 6 }} />
        <PlanCard title="Claude" plan="Claude Max 20x" sessionPct={USAGE.claudeSessionA} weeklyPct={USAGE.claudeWeeklyA} sessionReset="resets in 4h" weeklyReset={USAGE.claudeWeeklyReset} burns={[90000, 600000, 1500000, 24000000]} pctOfWeek={[0.1, 0.8, 2, 34]} lanes={{ board: 30, sessions: 20, terminal: 10, automation: 4 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 16 }}>
            <ConductorEmblem size={64} frame={frame} thinking={1} />
            <ConductorEmblem size={64} frame={frame} thinking={0} />
          </div>
          <ConductorComposer model={CONDUCTORS.codex.model} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", width: 1500 }}>
        <SeatChip name={CONDUCTORS.codex.name} model={CONDUCTORS.codex.model} adapter={CONDUCTORS.codex.adapter} status="running" frame={frame} elapsedSec={83} />
        <SeatChip name={CONDUCTORS.claude.name} model={CONDUCTORS.claude.model} adapter={CONDUCTORS.claude.adapter} status="idle" frame={frame} />
        {SEATS.slice(0, 6).map((s, i) => (
          <SeatChip key={s.name} name={s.name} model={s.model} adapter={s.adapter} status={i === 4 ? "error" : "running"} failure={i === 4 ? "run failed · You've hit your usage limit." : null} frame={frame} elapsedSec={20 + i * 7} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        {(["todo", "doing", "done"] as const).map((k) => (
          <div key={k} style={{ width: 300, border: `1px solid ${MONO.border}`, borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <KanbanLaneHeader label={k === "todo" ? "To do" : k === "doing" ? "In progress" : "Done"} tone={k === "todo" ? MONO.text3 : k === "doing" ? MONO.warn : MONO.ok} count={TASKS[k].length} />
            {TASKS[k].slice(0, 2).map((t) => (
              <TaskCard key={t.title} title={t.title} owner={t.owner} done={k === "done"} width={274} />
            ))}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
