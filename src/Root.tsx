import React from "react";
import { Composition } from "remotion";
import { withSafeFrame } from "./holo/SafeFrame";

// Conductor reel (organic, FounderOS). 9:8 parts sit in the safe frame; the
// two 9:16 "switch" parts (P07, P08) are full bleed.
import { BcUiSheet, BCUISHEET_DURATION } from "./bconductor/BcUiSheet";
import { BcP01RunAstraSideBySide, BCP01_DURATION } from "./bconductor/BcP01RunAstraSideBySide";
import { BcP02ThousandsInTokens, BCP02_DURATION } from "./bconductor/BcP02ThousandsInTokens";
import { BcP03BurnThroughPlans, BCP03_DURATION } from "./bconductor/BcP03BurnThroughPlans";
import { BcP04BuiltWithPaperclip, BCP04_DURATION } from "./bconductor/BcP04BuiltWithPaperclip";
import { BcP05LeftCodexRightClaude, BCP05_DURATION } from "./bconductor/BcP05LeftCodexRightClaude";
import { BcP06EachAgentAnyModel, BCP06_DURATION } from "./bconductor/BcP06EachAgentAnyModel";
import { BcP07CodexAt87, BCP07_DURATION } from "./bconductor/BcP07CodexAt87";
import { BcP08SwitchesConductor, BCP08_DURATION } from "./bconductor/BcP08SwitchesConductor";
import { BcP09WorkMovesToClaude, BCP09_DURATION } from "./bconductor/BcP09WorkMovesToClaude";
import { BcP10TasksKeepMoving, BCP10_DURATION } from "./bconductor/BcP10TasksKeepMoving";
import { BcP11TwoFlatBills, BCP11_DURATION } from "./bconductor/BcP11TwoFlatBills";

// Manus 2.0 sponsored reel, final v2.1 set (9 parts).
import { MbP0RawClipsToReel, MBP0_DURATION } from "./manus2/MbP0RawClipsToReel";
import { MbP1AgencyGotSoBusy, MBP1AGENCYGOTSOBUSY_DURATION } from "./manus2/MbP1AgencyGotSoBusy";
import { MbP2RawClipsFewPrompts916, MBP2_916_DURATION } from "./manus2/MbP2RawClipsFewPrompts";
import { MbP4PartThatTookHours, MBP4PARTTHATTOOKHOURS_DURATION } from "./manus2/MbP4PartThatTookHours";
import { MbP6SlammedExport, MBP6_DURATION } from "./manus2/MbP6SlammedExport";
import {
  MbFlat3aVideoEditorInside,
  MbFlat3bDropMyClipsIn,
  MbFlat5aTellItWhatToChange,
  MbFlat5bCenterBiggerQuieter,
  MBFLAT3A_DURATION,
  MBFLAT3B_DURATION,
  MBFLAT5A_DURATION,
  MBFLAT5B_DURATION,
} from "./manus2/MbFlat";

const BcP01Safe = withSafeFrame(BcP01RunAstraSideBySide);
const BcP02Safe = withSafeFrame(BcP02ThousandsInTokens);
const BcP03Safe = withSafeFrame(BcP03BurnThroughPlans);
const BcP04Safe = withSafeFrame(BcP04BuiltWithPaperclip);
const BcP05Safe = withSafeFrame(BcP05LeftCodexRightClaude);
const BcP06Safe = withSafeFrame(BcP06EachAgentAnyModel);
const BcP09Safe = withSafeFrame(BcP09WorkMovesToClaude);
const BcP10Safe = withSafeFrame(BcP10TasksKeepMoving);
const BcP11Safe = withSafeFrame(BcP11TwoFlatBills);

const MbP1Safe = withSafeFrame(MbP1AgencyGotSoBusy);
const MbP4Safe = withSafeFrame(MbP4PartThatTookHours);
const MbP6Safe = withSafeFrame(MbP6SlammedExport);
const MbFlat3bSafe = withSafeFrame(MbFlat3bDropMyClipsIn);
const MbFlat5bSafe = withSafeFrame(MbFlat5bCenterBiggerQuieter);

const W = 1080;
const H98 = 960;
const H916 = 1920;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Conductor reel */}
      <Composition id="BcUiSheet" component={BcUiSheet} durationInFrames={BCUISHEET_DURATION} fps={30} width={1600} height={1000} />
      <Composition id="BcP01RunAstraSideBySide" component={BcP01Safe} durationInFrames={BCP01_DURATION} fps={30} width={W} height={H98} />
      <Composition id="BcP02ThousandsInTokens" component={BcP02Safe} durationInFrames={BCP02_DURATION} fps={30} width={W} height={H98} />
      <Composition id="BcP03BurnThroughPlans" component={BcP03Safe} durationInFrames={BCP03_DURATION} fps={30} width={W} height={H98} />
      <Composition id="BcP04BuiltWithPaperclip" component={BcP04Safe} durationInFrames={BCP04_DURATION} fps={30} width={W} height={H98} />
      <Composition id="BcP05LeftCodexRightClaude" component={BcP05Safe} durationInFrames={BCP05_DURATION} fps={30} width={W} height={H98} />
      <Composition id="BcP06EachAgentAnyModel" component={BcP06Safe} durationInFrames={BCP06_DURATION} fps={30} width={W} height={H98} />
      <Composition id="BcP07CodexAt87" component={BcP07CodexAt87} durationInFrames={BCP07_DURATION} fps={30} width={W} height={H916} />
      <Composition id="BcP08SwitchesConductor" component={BcP08SwitchesConductor} durationInFrames={BCP08_DURATION} fps={30} width={W} height={H916} />
      <Composition id="BcP09WorkMovesToClaude" component={BcP09Safe} durationInFrames={BCP09_DURATION} fps={30} width={W} height={H98} />
      <Composition id="BcP10TasksKeepMoving" component={BcP10Safe} durationInFrames={BCP10_DURATION} fps={30} width={W} height={H98} />
      <Composition id="BcP11TwoFlatBills" component={BcP11Safe} durationInFrames={BCP11_DURATION} fps={30} width={W} height={H98} />

      {/* Manus 2.0 reel */}
      <Composition id="MbP0RawClipsToReel" component={MbP0RawClipsToReel} durationInFrames={MBP0_DURATION} fps={30} width={W} height={H916} />
      <Composition id="MbP1AgencyGotSoBusy" component={MbP1Safe} durationInFrames={MBP1AGENCYGOTSOBUSY_DURATION} fps={30} width={W} height={H98} />
      <Composition id="MbP2RawClipsFewPrompts916" component={MbP2RawClipsFewPrompts916} durationInFrames={MBP2_916_DURATION} fps={30} width={W} height={H916} />
      <Composition id="MbFlat3aVideoEditorInside916" component={MbFlat3aVideoEditorInside} durationInFrames={MBFLAT3A_DURATION} fps={30} width={W} height={H916} />
      <Composition id="MbFlat3bDropMyClipsIn" component={MbFlat3bSafe} durationInFrames={MBFLAT3B_DURATION} fps={30} width={W} height={H98} />
      <Composition id="MbP4PartThatTookHours" component={MbP4Safe} durationInFrames={MBP4PARTTHATTOOKHOURS_DURATION} fps={30} width={W} height={H98} />
      <Composition id="MbFlat5aTellItWhatToChange916" component={MbFlat5aTellItWhatToChange} durationInFrames={MBFLAT5A_DURATION} fps={30} width={W} height={H916} />
      <Composition id="MbFlat5bCenterBiggerQuieter" component={MbFlat5bSafe} durationInFrames={MBFLAT5B_DURATION} fps={30} width={W} height={H98} />
      <Composition id="MbP6SlammedExport" component={MbP6Safe} durationInFrames={MBP6_DURATION} fps={30} width={W} height={H98} />
    </>
  );
};
