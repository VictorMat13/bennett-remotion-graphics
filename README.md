# Bennett Remotion Graphics

Victor's Claude Code skill for Bennett's Remotion motion graphics, packaged with Bennett's two latest shipped reel series as runnable references.

| Path | What it is |
|------|------------|
| `SKILL.md` | The `bennett-style` skill. The top covers the original Matrix-coral look. The last section covers the current Merydian dark look used by both reference builds. |
| `templates/` | The skill's ready-to-copy components: matrix rain, Claude logo, terminal and markdown mocks, opener, punchline and composition skeleton. |
| `src/bconductor/` | **Conductor reel** (organic, Oct 2026). 11 parts about Bennett's FounderOS agent board with two conductors. Real FounderOS UI ported 1:1. Includes the brief and the builder prompt. |
| `src/manus2/` | **Manus 2.0 reel** (sponsored, Oct 2026). 9 parts, the final approved v2.1 set. 3D hook and flat screen-recording walkthrough of Manus Studio. Includes the briefs. |
| `src/fishos/theme.ts`, `src/holo/SafeFrame.tsx` | Shared Merydian theme and the 9:8 safe-frame wrapper both series use. |
| `public/` | Only the assets these comps reference. |
| `renders/` | The delivered MP4s, named by the first words of each part's voiceover line. |

## Run it

Node 20 or newer.

```bash
npm install
npm run dev          # Remotion Studio with all 21 compositions
npx remotion render src/index.ts BcP05LeftCodexRightClaude out/BcP05.mp4 --concurrency=1
```

Render one composition at a time. Parallel renders max out a laptop.

## Conductor reel

| Comp | Canvas | Delivered render |
|------|--------|------------------|
| BcP01RunAstraSideBySide (3D hook) | 9:8 | I run Astra and Fable |
| BcP02ThousandsInTokens | 9:8 | Most people running multiple agents |
| BcP03BurnThroughPlans | 9:8 | Or they burn through their |
| BcP04BuiltWithPaperclip | 9:8 | So I built this agent |
| BcP05LeftCodexRightClaude | 9:8 | On the left is my |
| BcP06EachAgentAnyModel | 9:8 | And I set each agent |
| BcP07CodexAt87 | 9:16 | As you can see, Codex |
| BcP08SwitchesConductor | 9:16 | And once that maxes out |
| BcP09WorkMovesToClaude | 9:8 | And the work just moves |
| BcP10TasksKeepMoving | 9:8 | And all of my tasks |
| BcP11TwoFlatBills | 9:8 | And I only pay two |

`BcUiSheet` is a contact sheet of every ported FounderOS component.

## Manus 2.0 reel

| Comp | Canvas | Delivered render |
|------|--------|------------------|
| MbP0RawClipsToReel (cold open) | 9:16 | Raw clips to ready-to-post Reel |
| MbP1AgencyGotSoBusy (3D hook) | 9:8 | My agency got so busy |
| MbP2RawClipsFewPrompts916 | 9:16 | All it needs from me |
| MbFlat3aVideoEditorInside916 | 9:16 | It's the video editor inside |
| MbFlat3bDropMyClipsIn | 9:8 | I drop my clips in |
| MbP4PartThatTookHours | 9:8 | Then I do the part |
| MbFlat5aTellItWhatToChange916 | 9:16 | I just tell it what |
| MbFlat5bCenterBiggerQuieter | 9:8 | Center the captions, make them |
| MbP6SlammedExport | 9:8 | Even when my agency is slammed |

The Manus reel is sponsored work that had not posted when this repo was made. Keep it inside the team until Bennett's post is live.

## Install the skill

```bash
git clone https://github.com/VictorMat13/bennett-remotion-graphics.git
cp -R bennett-remotion-graphics ~/.claude/skills/bennett-style
```

Trigger it with "bennett style". Pair it with the official `remotion-best-practices` skill from https://github.com/remotion-dev/skills for API correctness, and with https://github.com/VictorMat13/liam-remotion-graphics for the shared camera and production pipeline.
