import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, interpolateColors, staticFile, useCurrentFrame } from "remotion";
import { CONDUCTORS, EASE, FONT_MONO, MONO, MRD, OS_EASE, PAPERCLIP } from "./theme";
import { MoveBlur, OsChrome, OsIcon, SeatChip } from "./ui";

// ===========================================================================
// BcP04BuiltWithPaperclip: 1080x960 (9:8) @ 30fps, wrapped in the Holo safe
// frame by Root. VO (never on screen): "So I built this agent board with
// Paperclip, an open source repo."
// Word frames: built 41, agent board 50, Paperclip 68, open source 93, repo 107.
//
// ONE continuous camera, no cuts:
//   -14..14   the real paperclipai/paperclip repo page (capture 11, rebuilt as
//             DOM in GitHub dark), camera already drifting in on the About
//             block + the repo action buttons
//    14..30   eases in on the Star button (button text 26px, About 35px)
//    30..38   the star count rolls 99.5k -> 99.6k (tabular, button + sidebar)
//             while the camera only starts to ease away
//    30..~116 one van Wijk zoom-pan ("Smooth and efficient zooming and
//             panning"): pulls back across the header, carries the repo avatar
//             and the "paperclip" title in on "Paperclip" (f68, centred ~f73),
//             then dives into the avatar, the real Paperclip mark (theme
//             PAPERCLIP.markPath as SVG: the GitHub avatar is exactly this path,
//             fitted to the org avatar PNG), crisp at any zoom. The swoop is
//             timed on a speed budget (SWOOP_LUT), not a plain ease: <= 70 px/f
//             at the frame corners while page text is at reading size.
//    92..116  inside the mark's inner hairpin loop the FounderOS Agents page is
//             already there (clip = the loop, in screen space); seats cascade in
//             (diagonal wave, 2f) through the opening loop; the loop passes the
//             frame edges at ~f116. No cut, no fade, no flash.
//    84..134  the board's own camera (slower push = depth) lands on the
//             top-left of Board live: stat cells (CountUp) + seat grid + run
//             feed. Running seats spin, timers tick, the live orbit travels
//             their borders, feed rows / task cards enter (bn-enter).
//   124..137  a real 4s board poll: Data Agent's run finishes, Stack Monitor's
//             starts and its run lands on top of the run feed (still 14 running).
//   134..152  near-still hold: spinners, ticking timers, orbits.
//
// Board layout: the real Agents page (capture 04) at a 1950px-wide window, so
// the seat chips are 216px and their names + model lines read in full like the
// 2240 captures 04h/04j (at 1600 the chips truncate "Conductor · Codex").
// The two Conductor seats (theme CONDUCTORS) head the first column, stacked
// (Codex row 0, Claude row 1, as in P06 / P09); one seat
// (Client Reporting) is left out so the board still holds the canon 37.
// ===========================================================================

export const BCP04_DURATION = 152;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const TRAVEL = Easing.bezier(...EASE.travel);
const DECEL = Easing.bezier(...EASE.decel);
const HOUSE = Easing.bezier(...OS_EASE.ease);
const LENS = Easing.bezier(...OS_EASE.lens);
// progress along the swoop's speed budget: soft start from the Star hold, then
// it keeps its pace until the loop has passed the frame edges (the board camera
// carries the landing; the tail past ~f116 runs hidden behind the board)
const SWOOP = Easing.bezier(0.25, 0, 0.9, 1);
const BOARD_PUSH = Easing.bezier(0.45, 0, 0.2, 1);
// kit/format.ts countFrame(): 1 - (1 - t)^3 (CountUp, 900ms)
const COUNT = Easing.bezier(0.33, 1, 0.68, 1);

const W = 1080;
const H = 960;

// --------------------------------------------------------------- timing
const T = {
  travel0: 14,
  travel1: 30,
  swoop0: 30,
  swoop1: 122,
  tick0: 30,
  tick1: 38,
  board0: 84,
  board1: 134,
  wave0: 86,
  stats0: 96,
  feed0: 102,
  lanes0: 104,
  dataOff: 124,
  stackOn: 126,
} as const;

// =========================================================== GitHub (dark)
// Colors sampled from reference/11-paperclip-github-dark.png.
const GH = {
  nav: "#000000",
  header: "#010409",
  bg: "#0d1117",
  inset: "#151b23",
  btn: "#212830",
  border: "#3d444d",
  borderMuted: "rgba(61,68,77,0.7)",
  fg: "#f0f6fc",
  muted: "#9198a1",
  accent: "#4493f8",
  counter: "rgba(101,108,118,0.2)",
  green: "#238636",
  greenFg: "#3fb950",
  tabLine: "#f78166",
  attention: "#9e6a03",
  avatarBg: "#18181b",
  avatarInk: "#e4e4e7",
  avatarRing: "rgba(255,255,255,0.15)",
} as const;
const GH_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif';
const GH_PAGE = { w: 1440, h: 1000 } as const;

// Primer Octicons 19 (16px), the icons GitHub ships.
const OCT: Record<string, string[]> = {
  "mark-github": ["M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"],
  "triangle-down": ["m4.427 7.427 3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427Z"],
  code: ["m11.28 3.22 4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L13.94 8l-3.72-3.72a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215Zm-6.56 0a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L2.06 8l3.72 3.72a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L.47 8.53a.75.75 0 0 1 0-1.06Z"],
  "issue-opened": ["M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z", "M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"],
  "git-pull-request": ["M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z"],
  "comment-discussion": ["M1.75 1h8.5c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 10.25 10H7.061l-2.574 2.573A1.458 1.458 0 0 1 2 11.543V10h-.25A1.75 1.75 0 0 1 0 8.25v-5.5C0 1.784.784 1 1.75 1ZM1.5 2.75v5.5c0 .138.112.25.25.25h1a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h3.5a.25.25 0 0 0 .25-.25v-5.5a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25Zm13 2a.25.25 0 0 0-.25-.25h-.5a.75.75 0 0 1 0-1.5h.5c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 14.25 12H14v1.543a1.458 1.458 0 0 1-2.487 1.03L9.22 12.28a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215l2.22 2.22v-2.19a.75.75 0 0 1 .75-.75h1a.25.25 0 0 0 .25-.25Z"],
  play: ["M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z"],
  table: ["M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25ZM6.5 6.5v8h7.75a.25.25 0 0 0 .25-.25V6.5Zm8-1.5V1.75a.25.25 0 0 0-.25-.25H6.5V5Zm-13 1.5v7.75c0 .138.112.25.25.25H5v-8ZM5 5V1.5H1.75a.25.25 0 0 0-.25.25V5Z"],
  shield: ["M7.467.133a1.748 1.748 0 0 1 1.066 0l5.25 1.68A1.75 1.75 0 0 1 15 3.48V7c0 1.566-.32 3.182-1.303 4.682-.983 1.498-2.585 2.813-5.032 3.855a1.697 1.697 0 0 1-1.33 0c-2.447-1.042-4.049-2.357-5.032-3.855C1.32 10.182 1 8.566 1 7V3.48a1.75 1.75 0 0 1 1.217-1.667Zm.61 1.429a.25.25 0 0 0-.153 0l-5.25 1.68a.25.25 0 0 0-.174.238V7c0 1.358.275 2.666 1.057 3.86.784 1.194 2.121 2.34 4.366 3.297a.196.196 0 0 0 .154 0c2.245-.956 3.582-2.104 4.366-3.298C13.225 9.666 13.5 8.36 13.5 7V3.48a.251.251 0 0 0-.174-.237l-5.25-1.68ZM8.75 4.75v3a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 1.5 0ZM9 10.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"],
  graph: ["M1.5 1.75V13.5h13.75a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1-.75-.75V1.75a.75.75 0 0 1 1.5 0Zm14.28 2.53-5.25 5.25a.75.75 0 0 1-1.06 0L7 7.06 4.28 9.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.25-3.25a.75.75 0 0 1 1.06 0L10 7.94l4.72-4.72a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z"],
  bell: ["M8 16a2 2 0 0 0 1.985-1.75c.017-.137-.097-.25-.235-.25h-3.5c-.138 0-.252.113-.235.25A2 2 0 0 0 8 16ZM3 5a5 5 0 0 1 10 0v2.947c0 .05.015.098.042.139l1.703 2.555A1.519 1.519 0 0 1 13.482 13H2.518a1.516 1.516 0 0 1-1.263-2.36l1.703-2.554A.255.255 0 0 0 3 7.947Zm5-3.5A3.5 3.5 0 0 0 4.5 5v2.947c0 .346-.102.683-.294.97l-1.703 2.556a.017.017 0 0 0-.003.01l.001.006c0 .002.002.004.004.006l.006.004.007.001h10.964l.007-.001.006-.004.004-.006.001-.007a.017.017 0 0 0-.003-.01l-1.703-2.554a1.745 1.745 0 0 1-.294-.97V5A3.5 3.5 0 0 0 8 1.5Z"],
  "repo-forked": ["M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"],
  star: ["M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z"],
  "git-branch": ["M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z"],
  tag: ["M1 7.775V2.75C1 1.784 1.784 1 2.75 1h5.025c.464 0 .91.184 1.238.513l6.25 6.25a1.75 1.75 0 0 1 0 2.474l-5.026 5.026a1.75 1.75 0 0 1-2.474 0l-6.25-6.25A1.752 1.752 0 0 1 1 7.775Zm1.5 0c0 .066.026.13.073.177l6.25 6.25a.25.25 0 0 0 .354 0l5.025-5.025a.25.25 0 0 0 0-.354l-6.25-6.25a.25.25 0 0 0-.177-.073H2.75a.25.25 0 0 0-.25.25ZM6 5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"],
  search: ["M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"],
  history: ["m.427 1.927 1.215 1.215a8.002 8.002 0 1 1-1.6 5.685.75.75 0 1 1 1.493-.154 6.5 6.5 0 1 0 1.18-4.458l1.358 1.358A.25.25 0 0 1 3.896 6H.25A.25.25 0 0 1 0 5.75V2.104a.25.25 0 0 1 .427-.177ZM7.75 4a.75.75 0 0 1 .75.75v2.992l2.028.812a.75.75 0 0 1-.557 1.392l-2.5-1A.751.751 0 0 1 7 8.25v-3.5A.75.75 0 0 1 7.75 4Z"],
  link: ["m7.775 3.275 1.25-1.25a3.5 3.5 0 1 1 4.95 4.95l-2.5 2.5a3.5 3.5 0 0 1-4.95 0 .751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018 1.998 1.998 0 0 0 2.83 0l2.5-2.5a2.002 2.002 0 0 0-2.83-2.83l-1.25 1.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042Zm-4.69 9.64a1.998 1.998 0 0 0 2.83 0l1.25-1.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042l-1.25 1.25a3.5 3.5 0 1 1-4.95-4.95l2.5-2.5a3.5 3.5 0 0 1 4.95 0 .751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018 1.998 1.998 0 0 0-2.83 0l-2.5 2.5a1.998 1.998 0 0 0 0 2.83Z"],
  book: ["M0 1.75A.75.75 0 0 1 .75 1h4.253c1.227 0 2.317.59 3 1.501A3.743 3.743 0 0 1 11.006 1h4.245a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75h-4.507a2.25 2.25 0 0 0-1.591.659l-.622.621a.75.75 0 0 1-1.06 0l-.622-.621A2.25 2.25 0 0 0 5.258 13H.75a.75.75 0 0 1-.75-.75Zm7.251 10.324.004-5.073-.002-2.253A2.25 2.25 0 0 0 5.003 2.5H1.5v9h3.757a3.75 3.75 0 0 1 1.994.574ZM8.755 4.75l-.004 7.322a3.752 3.752 0 0 1 1.992-.572H14.5v-9h-3.495a2.25 2.25 0 0 0-2.25 2.25Z"],
  law: ["M8.75.75V2h.985c.304 0 .603.08.867.231l1.29.736c.038.022.08.033.124.033h2.234a.75.75 0 0 1 0 1.5h-.427l2.111 4.692a.75.75 0 0 1-.154.838l-.53-.53.529.531-.001.002-.002.002-.006.006-.006.005-.01.01-.045.04c-.21.176-.441.327-.686.45C14.556 10.78 13.88 11 13 11a4.498 4.498 0 0 1-2.023-.454 3.544 3.544 0 0 1-.686-.45l-.045-.04-.016-.015-.006-.006-.004-.004v-.001a.75.75 0 0 1-.154-.838L12.178 4.5h-.162c-.305 0-.604-.079-.868-.231l-1.29-.736a.245.245 0 0 0-.124-.033H8.75V13h2.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5h2.5V3.5h-.984a.245.245 0 0 0-.124.033l-1.289.737c-.265.15-.564.23-.869.23h-.162l2.112 4.692a.75.75 0 0 1-.154.838l-.53-.53.529.531-.001.002-.002.002-.006.006-.016.015-.045.04c-.21.176-.441.327-.686.45C4.556 10.78 3.88 11 3 11a4.498 4.498 0 0 1-2.023-.454 3.544 3.544 0 0 1-.686-.45l-.045-.04-.016-.015-.006-.006-.004-.004v-.001a.75.75 0 0 1-.154-.838L2.178 4.5H1.75a.75.75 0 0 1 0-1.5h2.234a.249.249 0 0 0 .125-.033l1.288-.737c.265-.15.564-.23.869-.23h.984V.75a.75.75 0 0 1 1.5 0Zm2.945 8.477c.285.135.718.273 1.305.273s1.02-.138 1.305-.273L13 6.327Zm-10 0c.285.135.718.273 1.305.273s1.02-.138 1.305-.273L3 6.327Z"],
  people: ["M2 5.5a3.5 3.5 0 1 1 5.898 2.549 5.508 5.508 0 0 1 3.034 4.084.75.75 0 1 1-1.482.235 4 4 0 0 0-7.9 0 .75.75 0 0 1-1.482-.236A5.507 5.507 0 0 1 3.102 8.05 3.493 3.493 0 0 1 2 5.5ZM11 4a3.001 3.001 0 0 1 2.22 5.018 5.01 5.01 0 0 1 2.56 3.012.749.749 0 0 1-.885.954.752.752 0 0 1-.549-.514 3.507 3.507 0 0 0-2.522-2.372.75.75 0 0 1-.574-.73v-.352a.75.75 0 0 1 .416-.672A1.5 1.5 0 0 0 11 5.5.75.75 0 0 1 11 4Zm-5.5-.5a2 2 0 1 0-.001 3.999A2 2 0 0 0 5.5 3.5Z"],
  pulse: ["M6 2c.306 0 .582.187.696.471L10 10.731l1.304-3.26A.751.751 0 0 1 12 7h3.25a.75.75 0 0 1 0 1.5h-2.742l-1.812 4.528a.751.751 0 0 1-1.392 0L6 4.77 4.696 8.03A.75.75 0 0 1 4 8.5H.75a.75.75 0 0 1 0-1.5h2.742l1.812-4.529A.751.751 0 0 1 6 2Z"],
  note: ["M0 3.75C0 2.784.784 2 1.75 2h12.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0 1 14.25 14H1.75A1.75 1.75 0 0 1 0 12.25Zm1.75-.25a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25ZM3.5 6.25a.75.75 0 0 1 .75-.75h7a.75.75 0 0 1 0 1.5h-7a.75.75 0 0 1-.75-.75Zm.75 2.25h4a.75.75 0 0 1 0 1.5h-4a.75.75 0 0 1 0-1.5Z"],
  eye: ["M8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 0 1 0 1.798c-.45.678-1.367 1.932-2.637 3.023C11.67 13.008 9.981 14 8 14c-1.981 0-3.671-.992-4.933-2.078C1.797 10.83.88 9.576.43 8.898a1.62 1.62 0 0 1 0-1.798c.45-.677 1.367-1.931 2.637-3.022C4.33 2.992 6.019 2 8 2ZM1.679 7.932a.12.12 0 0 0 0 .136c.411.622 1.241 1.75 2.366 2.717C5.176 11.758 6.527 12.5 8 12.5c1.473 0 2.825-.742 3.955-1.715 1.124-.967 1.954-2.096 2.366-2.717a.12.12 0 0 0 0-.136c-.412-.621-1.242-1.75-2.366-2.717C10.824 4.242 9.473 3.5 8 3.5c-1.473 0-2.825.742-3.955 1.715-1.124.967-1.954 2.096-2.366 2.717ZM8 10a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 10Z"],
  "file-directory-fill": ["M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75Z"],
  "kebab-horizontal": ["M8 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM1.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm13 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"],
  sliders: ["M15 2.75a.75.75 0 0 1-.75.75h-4a.75.75 0 0 1 0-1.5h4a.75.75 0 0 1 .75.75Zm-8.5.75v1.25a.75.75 0 0 0 1.5 0v-4a.75.75 0 0 0-1.5 0V2H1.75a.75.75 0 0 0 0 1.5H6.5Zm1.25 5.25a.75.75 0 0 0 0-1.5h-6a.75.75 0 0 0 0 1.5h6ZM15 8a.75.75 0 0 1-.75.75H11.5V10a.75.75 0 1 1-1.5 0V6a.75.75 0 0 1 1.5 0v1.25h2.75A.75.75 0 0 1 15 8Zm-9 5.25v-2a.75.75 0 0 0-1.5 0v1.25H1.75a.75.75 0 0 0 0 1.5H4.5v1.25a.75.75 0 0 0 1.5 0v-2Zm9 0a.75.75 0 0 1-.75.75h-6a.75.75 0 0 1 0-1.5h6a.75.75 0 0 1 .75.75Z"],
};

// An octicon whose vertical centre sits on y.
const Oct: React.FC<{ name: string; x: number; y: number; size?: number; color?: string }> = ({
  name,
  x,
  y,
  size = 16,
  color = GH.muted,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill={color}
    style={{ position: "absolute", left: x, top: y - size / 2, display: "block" }}
  >
    {(OCT[name] ?? []).map((d, i) => (
      <path key={i} d={d} />
    ))}
  </svg>
);

// A line of GitHub text whose vertical centre sits on y.
const Tx: React.FC<{
  x: number;
  y: number;
  size?: number;
  weight?: number;
  color?: string;
  right?: boolean;
  maxW?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ x, y, size = 14, weight = 400, color = GH.fg, right = false, maxW, style, children }) => {
  const lh = Math.round(size * 1.5);
  return (
    <div
      style={{
        position: "absolute",
        top: y - lh / 2,
        ...(right ? { right: GH_PAGE.w - x } : { left: x }),
        height: lh,
        lineHeight: `${lh}px`,
        fontSize: size,
        fontWeight: weight,
        color,
        whiteSpace: "nowrap",
        ...(maxW ? { maxWidth: maxW, overflow: "hidden", textOverflow: "ellipsis" } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Box: React.FC<{ x: number; y: number; w: number; h: number; style?: React.CSSProperties; children?: React.ReactNode }> = ({
  x,
  y,
  w,
  h,
  style,
  children,
}) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, boxSizing: "border-box", ...style }}>{children}</div>
);

// Primer Counter pill.
const Counter: React.FC<{ x: number; y: number; children: React.ReactNode; bg?: string }> = ({ x, y, children, bg = GH.counter }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y - 9,
      height: 18,
      lineHeight: "18px",
      padding: "0 6px",
      borderRadius: 999,
      background: bg,
      color: GH.fg,
      fontSize: 12,
      fontWeight: 600,
      fontVariantNumeric: "tabular-nums",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </div>
);

const FILES: { name: string; msg: React.ReactNode; when: string }[] = [
  { name: ".agents/skills", msg: "docs: add eval guide, authoring skills, and public history h...", when: "3 weeks ago" },
  { name: ".claude", msg: "feat(onboarding): ClipLab sleepy-to-wake hero and step h...", when: "3 weeks ago" },
  {
    name: ".codex/agents",
    msg: (
      <>
        feat(connections): add self-serve intent runtime (<span style={{ color: GH.accent }}>#12345</span>)
      </>
    ),
    when: "2 months ago",
  },
  {
    name: ".devin",
    msg: (
      <>
        docs: turn DeepWiki into a contributor handbook (<span style={{ color: GH.accent }}>#13745</span>)
      </>
    ),
    when: "3 weeks ago",
  },
  { name: ".github", msg: "ci: move the Grok public-install verification off Canary Dry ...", when: "26 minutes ago" },
  { name: "announcements", msg: "feat: add native in-app announcements with persistent dis...", when: "last month" },
  { name: "cli", msg: "feat(issues): keep follow-up parents and show the creatio...", when: "10 hours ago" },
  {
    name: "design/pap-14557-monitor-visibility",
    msg: (
      <>
        feat: make issue monitors visible across task surfaces (<span style={{ color: GH.accent }}>#9...</span>
      </>
    ),
    when: "3 months ago",
  },
  { name: "doc", msg: "perf(chat): wake action queues from commits and deadlin...", when: "3 minutes ago" },
  {
    name: "docker",
    msg: (
      <>
        feat: integrate Pi 1.0 into the experimental Runner (<span style={{ color: GH.accent }}>#14921</span>)
      </>
    ),
    when: "yesterday",
  },
  {
    name: "docs",
    msg: (
      <>
        fix(ui): keep code-block pastes in the nested editor (<span style={{ color: GH.accent }}>#1577...</span>
      </>
    ),
    when: "10 hours ago",
  },
  { name: "evals", msg: "feat(mcp) [split 8/8]: add e2e coverage and operator docs...", when: "3 months ago" },
];

// The repo page, laid out in the capture's CSS px (1440 viewport). Every
// number is the captured one (Star 99.6k, Fork 16.8k): nothing ticks.
const GhPage: React.FC = () => {
  const rowY0 = 366.5;
  const rowH = 41;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: GH_PAGE.w,
        height: GH_PAGE.h,
        background: GH.bg,
        fontFamily: GH_FONT,
        color: GH.fg,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* site navigation */}
      <Box x={0} y={0} w={GH_PAGE.w} h={72.5} style={{ background: GH.nav, borderBottom: "1px solid #1c2128" }} />
      <Oct name="mark-github" x={31.5} y={36} size={32} color="#ffffff" />
      {[
        ["Platform", 88],
        ["Solutions", 189],
        ["Resources", 297],
        ["Open Source", 412.6],
        ["Enterprise", 548],
        ["Pricing", 662],
      ].map(([label, x], i) => (
        <div
          key={label as string}
          style={{
            position: "absolute",
            left: x as number,
            top: 24,
            height: 24,
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 16,
            fontWeight: 500,
            color: "#ffffff",
            whiteSpace: "nowrap",
          }}
        >
          {label}
          {i < 5 ? (
            <svg width={16} height={16} viewBox="0 0 16 16" fill="#ffffff">
              <path d={OCT["triangle-down"][0]} />
            </svg>
          ) : null}
        </div>
      ))}
      <Box x={1003} y={21} w={199} h={30} style={{ border: `1px solid ${GH.border}`, borderRadius: 6 }} />
      <Tx x={1015} y={36} size={14} weight={500} color="#ffffff">
        Search
      </Tx>
      <Box x={1166} y={26} w={23} h={20} style={{ border: `1px solid ${GH.border}`, borderRadius: 4 }} />
      <Tx x={1174.5} y={36} size={12} color="#ffffff">
        /
      </Tx>
      <Box x={1212} y={21} w={70} h={30} style={{ border: `1px solid ${GH.border}`, borderRadius: 6 }} />
      <Tx x={1224} y={36} size={14} weight={500} color="#ffffff">
        Sign in
      </Tx>
      <Box x={1291} y={21} w={76} h={30} style={{ border: `1px solid ${GH.border}`, borderRadius: 6, background: "#1f1f1f" }} />
      <Tx x={1303} y={36} size={14} weight={500} color="#ffffff">
        Sign up
      </Tx>
      <Box x={1376} y={21} w={32} h={30} style={{ border: `1px solid ${GH.border}`, borderRadius: 6 }} />
      <Oct name="sliders" x={1384} y={36} color="#ffffff" />

      {/* repo header: breadcrumb + tabs */}
      <Box x={0} y={73} w={GH_PAGE.w} h={99} style={{ background: GH.header, borderBottom: `1px solid ${GH.border}` }} />
      <Tx x={22.3} y={104} size={14}>
        paperclipai
      </Tx>
      <Tx x={106} y={104} size={14} color={GH.muted}>
        /
      </Tx>
      <Tx x={120} y={104} size={14} weight={600}>
        paperclip
      </Tx>
      <Oct name="code" x={24} y={148.3} />
      <Tx x={48} y={148.3} size={14} weight={600}>
        Code
      </Tx>
      <Box x={16} y={169} w={75} h={2} style={{ background: GH.tabLine, borderRadius: 6 }} />
      <Oct name="issue-opened" x={106.5} y={148.3} />
      <Tx x={132.5} y={148.3}>Issues</Tx>
      <Counter x={183} y={148.3}>2.9k</Counter>
      <Oct name="git-pull-request" x={247.7} y={148.3} />
      <Tx x={273} y={148.3}>Pull requests</Tx>
      <Counter x={366.5} y={148.3}>3.2k</Counter>
      <Oct name="comment-discussion" x={430} y={148.3} />
      <Tx x={456.5} y={148.3}>Discussions</Tx>
      <Oct name="play" x={559} y={148.3} />
      <Tx x={584.6} y={148.3}>Actions</Tx>
      <Oct name="table" x={657} y={148.3} />
      <Tx x={684} y={148.3}>Projects</Tx>
      <Oct name="shield" x={763} y={148.3} />
      <Tx x={789} y={148.3}>Security and quality</Tx>
      <Counter x={929} y={148.3}>12</Counter>
      <Oct name="graph" x={980} y={148.3} />
      <Tx x={1006} y={148.3}>Insights</Tx>

      {/* title row (the avatar tile is drawn in screen space by MarkTile) */}
      <Tx x={144.5} y={206} size={20} weight={600}>
        paperclip
      </Tx>
      <div
        style={{
          position: "absolute",
          left: 239,
          top: 196.5,
          height: 20,
          lineHeight: "18px",
          padding: "0 7px",
          boxSizing: "border-box",
          border: `1px solid ${GH.border}`,
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 500,
          color: GH.muted,
        }}
      >
        Public
      </div>
      {/* Notifications / Fork / Star */}
      {[
        { x: 973.5, w: 110 },
        { x: 1092.5, w: 113 },
        { x: 1214.5, w: 113 },
      ].map((b) => (
        <Box
          key={b.x}
          x={b.x}
          y={192.5}
          w={b.w}
          h={28}
          style={{ background: GH.btn, border: `1px solid ${GH.border}`, borderRadius: 6 }}
        />
      ))}
      <Oct name="bell" x={983} y={206.5} />
      <Tx x={1002} y={206.5} size={12} weight={600}>
        Notifications
      </Tx>
      <Oct name="repo-forked" x={1101.5} y={206.5} />
      <Tx x={1121.5} y={206.5} size={12} weight={600}>
        Fork
      </Tx>
      <Counter x={1152} y={206.5}>{PAPERCLIP.forks}</Counter>
      <Oct name="star" x={1223} y={206.5} />
      <Tx x={1243} y={206.5} size={12} weight={600}>
        Star
      </Tx>
      <Counter x={1271.5} y={206.5}>{PAPERCLIP.stars}</Counter>
      <Box x={112} y={240} w={1215.5} h={1} style={{ background: GH.borderMuted }} />

      {/* branch row */}
      <Box x={112.5} y={265} w={119} h={32} style={{ background: GH.btn, border: `1px solid ${GH.border}`, borderRadius: 6 }} />
      <Oct name="git-branch" x={125} y={281} />
      <Tx x={149} y={281} weight={600}>
        master
      </Tx>
      <Oct name="triangle-down" x={203} y={281} />
      <Oct name="git-branch" x={245.5} y={281} />
      <Tx x={268.6} y={281} weight={600}>
        1138 <span style={{ color: GH.muted, fontWeight: 400 }}>Branches</span>
      </Tx>
      <Oct name="tag" x={376.6} y={281} />
      <Tx x={400} y={281} weight={600}>
        1830 <span style={{ color: GH.muted, fontWeight: 400 }}>Tags</span>
      </Tx>
      <Box x={695.5} y={265} w={202.5} h={32} style={{ border: `1px solid ${GH.border}`, borderRadius: 6 }} />
      <Oct name="search" x={704} y={281} />
      <Tx x={728} y={281} color={GH.muted}>
        Go to file
      </Tx>
      <Box x={907} y={265} w={108} h={32} style={{ background: GH.green, border: "1px solid rgba(240,246,252,0.1)", borderRadius: 6 }} />
      <Oct name="code" x={920} y={281} color="#ffffff" />
      <Tx x={944} y={281} weight={600} color="#ffffff">
        Code
      </Tx>
      <Oct name="triangle-down" x={987} y={281} color="#ffffff" />

      {/* file box: latest-commit header + the first rows */}
      <Box
        x={112}
        y={314}
        w={903}
        h={rowY0 - 314 + rowH * FILES.length + 2}
        style={{ border: `1px solid ${GH.border}`, borderRadius: 6, overflow: "hidden" }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: rowY0 - 314, background: GH.inset }} />
      </Box>
      {/* the two commit-author avatars: the capture's own pixels */}
      <div style={{ position: "absolute", left: 122, top: 326, width: 34, height: 28, overflow: "hidden" }}>
        <Img
          src={staticFile("bconductor/reference/11-paperclip-github-dark.png")}
          style={{ position: "absolute", left: -122, top: -326, width: 1440, height: 1000, maxWidth: "none" }}
        />
      </div>
      <Tx x={161} y={340} weight={600}>
        cryppadotta <span style={{ color: GH.muted, fontWeight: 400 }}>and</span> Paperclip-Paperclip
      </Tx>
      <Tx x={417.6} y={340} color={GH.muted} maxW={225}>
        perf(chat): wake action queues f...
      </Tx>
      <Box x={653} y={333} w={19} h={14} style={{ background: GH.counter, borderRadius: 4 }} />
      <Oct name="kebab-horizontal" x={654.5} y={340} size={16} color={GH.muted} />
      <Box x={694} y={336} w={8} h={8} style={{ background: GH.attention, borderRadius: 999 }} />
      <Tx x={729} y={340} size={12} color={GH.muted}>
        b1ebe3d · 3 minutes ago
      </Tx>
      <Oct name="history" x={885} y={340} />
      <Tx x={906} y={340} size={12} weight={600}>
        4,993 Commits
      </Tx>
      {FILES.map((r, i) => {
        const cy = rowY0 + rowH * i + rowH / 2;
        return (
          <React.Fragment key={r.name}>
            <Box x={113} y={rowY0 + rowH * i} w={901} h={1} style={{ background: GH.border }} />
            <Oct name="file-directory-fill" x={129.6} y={cy} color={GH.muted} />
            <Tx x={154.8} y={cy}>{r.name}</Tx>
            <Tx x={489.6} y={cy} color={GH.muted} maxW={384}>
              {r.msg}
            </Tx>
            <Tx x={998.6} y={cy} color={GH.muted} right>
              {r.when}
            </Tx>
          </React.Fragment>
        );
      })}

      {/* About sidebar */}
      <Tx x={1056} y={277} size={16} weight={600}>
        About
      </Tx>
      <div
        style={{
          position: "absolute",
          left: 1056,
          top: 301,
          width: 290,
          fontSize: 16,
          lineHeight: "24px",
          color: GH.fg,
        }}
      >
        The open-source app everyone uses
        <br />
        to manage agents at work
      </div>
      <Oct name="link" x={1056} y={371.5} color={GH.fg} />
      <Tx x={1080} y={371.5} weight={600} color={GH.accent}>
        {PAPERCLIP.site}
      </Tx>
      {[
        ["book", "Readme", 404.6],
        ["law", "MIT license", 433.4],
        ["people", "Contributing", 463],
        ["shield", "Security policy", 491.8],
        ["pulse", "Activity", 520.6],
        ["note", "Custom properties", 550],
      ].map(([icon, label, y]) => (
        <React.Fragment key={label as string}>
          <Oct name={icon as string} x={1056} y={y as number} />
          <Tx x={1080} y={y as number} color={GH.muted}>
            {label}
          </Tx>
        </React.Fragment>
      ))}
      <Oct name="star" x={1056} y={578.9} />
      <Tx x={1080} y={578.9} color={GH.muted}>
        <span style={{ fontWeight: 600 }}>{PAPERCLIP.stars}</span> stars
      </Tx>
      <Oct name="eye" x={1056} y={607.7} />
      <Tx x={1080} y={607.7} color={GH.muted}>
        <span style={{ fontWeight: 600 }}>465</span> watching
      </Tx>
      <Oct name="repo-forked" x={1056} y={636.5} />
      <Tx x={1080} y={636.5} color={GH.muted}>
        <span style={{ fontWeight: 600 }}>16.8k</span> forks
      </Tx>
      <Tx x={1056} y={666} color={GH.muted}>
        Report repository
      </Tx>
      <Box x={1056} y={692.5} w={271.5} h={1} style={{ background: GH.borderMuted }} />
      <Tx x={1056} y={720.7} size={16} weight={600}>
        Releases
      </Tx>
      <Counter x={1130} y={720.7}>28</Counter>
      <Oct name="tag" x={1056} y={755} color={GH.greenFg} />
      <Tx x={1080} y={755} weight={600}>
        v2026.1005.0
      </Tx>
      <div
        style={{
          position: "absolute",
          left: 1182,
          top: 746,
          height: 20,
          lineHeight: "18px",
          padding: "0 7px",
          boxSizing: "border-box",
          border: `1px solid ${GH.greenFg}`,
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 500,
          color: GH.greenFg,
        }}
      >
        Latest
      </div>
      <Tx x={1080} y={775} size={12} color={GH.muted}>
        4 days ago
      </Tx>
    </div>
  );
};

// ================================================================ cameras
type Cam = { cx: number; cy: number; s: number };
type Seg = { f0: number; f1: number; to: Cam; ease: (t: number) => number };

const lerpCam = (a: Cam, b: Cam, p: number): Cam => ({
  cx: a.cx + (b.cx - a.cx) * p,
  cy: a.cy + (b.cy - a.cy) * p,
  s: Math.exp(Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * p),
});

const runSegs = (start: Cam, segs: Seg[], f: number): Cam => {
  let from = start;
  for (const g of segs) {
    if (f <= g.f1) {
      const p = g.ease(Math.max(0, Math.min(1, (f - g.f0) / (g.f1 - g.f0))));
      return lerpCam(from, g.to, p);
    }
    from = g.to;
  }
  return from;
};

// --- the Paperclip mark (theme PAPERCLIP.markPath): the GitHub avatar IS
// this path (fitted to the org avatar PNG: centred, 0.7565 scale, stroke 2,
// #e4e4e7 on #18181b). Avatar box in GitHub css px:
const AV = { x: 112, y: 194, size: 24, k: 0.7565 } as const;
const avPt = (ux: number, uy: number) => ({
  x: AV.x + AV.size / 2 + (ux - 12) * AV.k,
  y: AV.y + AV.size / 2 + (uy - 12) * AV.k,
});
// The inner hairpin loop (between the r=2 turn and the clip's free end): a
// capsule along the loop's midline, radius 1 path unit (stroke edges).
const LOOP_A = avPt(9, 16);
const LOOP_B = avPt(17.4, 7.43);
const LOOP_R = 1 * AV.k;
const DIVE = avPt(13.2, 11.715); // the point the camera dives through

// GitHub camera: drift on the About block -> Star -> van Wijk swoop + dive.
const G_START: Cam = { cx: 1066, cy: 392, s: 1.48 };
const G_STAR: Cam = { cx: 1170, cy: 330, s: 2.2 };
const G_SEGS: Seg[] = [
  { f0: -14, f1: T.travel0, to: { cx: 1100, cy: 352, s: 1.7 }, ease: DECEL },
  { f0: T.travel0, f1: T.travel1, to: G_STAR, ease: TRAVEL },
];
// The loop passes the frame corners at ~950x; the path runs on to 2000x so the
// swoop's own slow-down happens after that, hidden behind the board.
const S_END = 2000;
const RHO = 1.1;

// van Wijk & Nuij, "Smooth and efficient zooming and panning" (2003).
const VW = (() => {
  const w0 = W / G_STAR.s;
  const w1 = W / S_END;
  const dx = DIVE.x - G_STAR.cx;
  const dy = DIVE.y - G_STAR.cy;
  const u1 = Math.hypot(dx, dy);
  const r2 = RHO * RHO;
  const r4 = r2 * r2;
  const b0 = (w1 * w1 - w0 * w0 + r4 * u1 * u1) / (2 * w0 * r2 * u1);
  const b1 = (w1 * w1 - w0 * w0 - r4 * u1 * u1) / (2 * w1 * r2 * u1);
  const R0 = Math.log(-b0 + Math.sqrt(b0 * b0 + 1));
  const R1 = Math.log(-b1 + Math.sqrt(b1 * b1 + 1));
  const S = (R1 - R0) / RHO;
  const at = (s: number) => {
    const u = (w0 / r2) * Math.cosh(R0) * Math.tanh(RHO * s + R0) - (w0 / r2) * Math.sinh(R0);
    const w = (w0 * Math.cosh(R0)) / Math.cosh(RHO * s + R0);
    return { x: G_STAR.cx + (dx * u) / u1, y: G_STAR.cy + (dy * u) / u1, w };
  };
  return { S, at, w0 };
})();

// smooth max / min (a soft clamp keeps the widened view inside the page)
const smax = (a: number, b: number, k = 0.08) => {
  const m = Math.max(a, b);
  return m + Math.log(Math.exp(k * (a - m)) + Math.exp(k * (b - m))) / k;
};
const smin = (a: number, b: number, k = 0.08) => -smax(-a, -b, k);

// The van Wijk path at progress q (0..1 of its length), soft-clamped inside the page.
const swoopAt = (q: number): Cam => {
  const p = VW.at(VW.S * q);
  const s = W / p.w;
  const hw = W / 2 / s;
  const hh = H / 2 / s;
  // the clamp fades in from zero so the hold -> swoop hand-off is exact
  const k = interpolate(q, [0, 0.1], [0, 1], { ...clamp, easing: TRAVEL });
  const x = smin(smax(p.x, hw + 4), GH_PAGE.w - hw - 4);
  const y = smin(smax(p.y, hh + 4), GH_PAGE.h - hh - 4);
  return { cx: p.x + (x - p.x) * k, cy: p.y + (y - p.y) * k, s };
};

// Speed budget (screen px per frame, at the frame corners) by zoom: 70 while the
// page text is at reading size (s <= 2.5); up to 110 by s 5.3 and held there
// while page edges are still in shot (the finest stroke is >= 8px from s 5.3,
// so the 12-sample blur spacing of ~5px stays inside it); 140 once the mark
// tile fills the frame (s >= 80: a flat dark field, the dark ink bands and the
// loop opening are all that move).
const budget = (s: number) => {
  if (s <= 2.5) return 70;
  if (s <= 5.3) return 70 * Math.pow(110 / 70, Math.log(s / 2.5) / Math.log(5.3 / 2.5));
  if (s <= 40) return 110;
  if (s <= 80) return 110 * Math.pow(140 / 110, Math.log(s / 40) / Math.log(80 / 40));
  return 140;
};
// largest screen displacement (centre + corners) of page points going a -> b
const camShift = (a: Cam, b: Cam) => {
  let m = 0;
  for (const [px, py] of [[W / 2, H / 2], [0, 0], [W, 0], [0, H], [W, H]]) {
    const x = W / 2 + (a.cx + (px - W / 2) / a.s - b.cx) * b.s;
    const y = H / 2 + (a.cy + (py - H / 2) / a.s - b.cy) * b.s;
    m = Math.max(m, Math.hypot(x - px, y - py));
  }
  return m;
};
// Arc length of the path in budget units: the swoop eases along THIS length, so
// its on-screen speed follows the budget (slow while text reads, faster deep in
// the mark), instead of peaking mid-pan.
const SWOOP_LUT = (() => {
  const N = 1600;
  const len = [0];
  let prev = swoopAt(0);
  for (let i = 1; i <= N; i++) {
    const c = swoopAt(i / N);
    len.push(len[i - 1] + (camShift(prev, c) * 70) / budget((prev.s + c.s) / 2));
    prev = c;
  }
  return { N, len };
})();
const swoopQ = (u: number) => {
  const { N, len } = SWOOP_LUT;
  const target = u * len[N];
  let lo = 0;
  let hi = N;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (len[mid] < target) lo = mid;
    else hi = mid;
  }
  return (lo + (target - len[lo]) / Math.max(1e-9, len[hi] - len[lo])) / N;
};

const ghCam = (f: number): Cam => {
  if (f <= T.swoop0) return runSegs(G_START, G_SEGS, f);
  const t = Math.min(1, (f - T.swoop0) / (T.swoop1 - T.swoop0));
  return swoopAt(swoopQ(SWOOP(t)));
};

// Board camera (board page css px): its own slower push behind the loop.
const B_START: Cam = { cx: 646, cy: 504, s: 0.98 };
const B_FINAL: Cam = { cx: 618, cy: 482, s: 1.7 };
const B_SEGS: Seg[] = [
  { f0: T.board0, f1: T.board1, to: B_FINAL, ease: BOARD_PUSH },
  { f0: T.board1, f1: BCP04_DURATION + 2, to: { cx: 617, cy: 481, s: 1.714 }, ease: TRAVEL },
];
const boardCam = (f: number) => runSegs(B_START, B_SEGS, f);

const toScreen = (c: Cam, x: number, y: number) => ({ x: W / 2 + (x - c.cx) * c.s, y: H / 2 + (y - c.cy) * c.s });

// The Paperclip avatar tile, in screen space so it stays vector-crisp at any zoom.
// The mark stays its real light ink while it reads as a mark (up to ~12x);
// past that the lens is inside the clip, and the wire eases down to the dark
// frame tone (log-scale 12x -> 60x, ~f80 -> f91) so the bands that sweep past
// read as dark structure with motion blur, never as a white wipe.
const INK_DARK = "#242424";
const markInk = (s: number) => {
  const k = interpolate(Math.log(s), [Math.log(12), Math.log(60)], [0, 1], { ...clamp, easing: TRAVEL });
  return { color: interpolateColors(k, [0, 1], [GH.avatarInk, INK_DARK]), opacity: 1 - 0.2 * k };
};
const MarkTile: React.FC<{ cam: Cam }> = ({ cam }) => {
  const o = toScreen(cam, AV.x, AV.y);
  const ink = markInk(cam.s);
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "hidden" }}>
      <g transform={`translate(${o.x} ${o.y}) scale(${cam.s})`}>
        <rect x={-0.5} y={-0.5} width={25} height={25} rx={4.5} fill="none" stroke={GH.avatarRing} strokeWidth={1} />
        <rect x={0} y={0} width={24} height={24} rx={4} fill={GH.avatarBg} />
        <g transform={`translate(12 12) scale(${AV.k}) translate(-12 -12)`}>
          <path
            d={PAPERCLIP.markPath}
            fill="none"
            stroke={ink.color}
            strokeOpacity={ink.opacity}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </svg>
  );
};

// ============================================================ the board
// The real Agents page (capture 04, state A) at a 1950px window: same rows,
// the board column widened (chips 216px, as in the wide captures).
const PANEL = { x: 306, y: 133, w: 1146, h: 759 } as const;
const CHIP = { w: 216, h: 46, dx: 224, dy: 54, x0: 17, y0: 149.5 } as const;
const STAT = { y: 73.5, h: 59.2 } as const;
const FEED = { x: 17, y: 612, w: 192, row: 21 } as const;
const LANES = { x: 225, y: 612, w: 903 } as const;
const RAIL_X = PANEL.x + PANEL.w + 24;

type SeatRow = {
  name: string;
  model: string;
  adapter: string;
  status: "running" | "idle" | "paused";
  since?: number; // seconds already running at f0 (captured timers)
};
const sonnet = "claude-sonnet-5-5";
const haiku = "claude-haiku-5-5";
const opus = "claude-opus-5-5";
const astra = "gpt-6-astra";
// Capture 04j order; the Conductor seat becomes the two Conductors (column 0,
// rows 0-1),
// Client Reporting is left out so the count stays 37.
const BOARD: SeatRow[] = [
  { name: CONDUCTORS.codex.name, model: CONDUCTORS.codex.model, adapter: CONDUCTORS.codex.adapter, status: "running", since: 147.4 },
  { name: "Comms Agent", model: sonnet, adapter: "claude_local", status: "running", since: 73.5 },
  { name: "Social Agent", model: sonnet, adapter: "claude_local", status: "running", since: 35.15 },
  { name: "Sales Agent", model: sonnet, adapter: "claude_local", status: "running", since: 66.9 },
  { name: "Data Agent", model: sonnet, adapter: "claude_local", status: "running", since: 101.3 },
  { name: CONDUCTORS.claude.name, model: CONDUCTORS.claude.model, adapter: CONDUCTORS.claude.adapter, status: "idle" },
  { name: "Client Roster", model: sonnet, adapter: "claude_local", status: "running", since: 20.62 },
  { name: "Comms Digest", model: sonnet, adapter: "claude_local", status: "running", since: 117.2 },
  { name: "Brand Deal Agent", model: opus, adapter: "claude_local", status: "running", since: 42.7 },
  { name: "Newsletter Agent", model: sonnet, adapter: "claude_local", status: "running", since: 216.45 },
  { name: "Stack Monitor", model: haiku, adapter: "claude_local", status: "idle" },
  { name: "Postly Publisher", model: haiku, adapter: "claude_local", status: "running", since: 243.3 },
  { name: "Adsmith Creative", model: sonnet, adapter: "claude_local", status: "idle" },
  { name: "Reelkit Editor", model: sonnet, adapter: "claude_local", status: "running", since: 211.05 },
  { name: "Renderly Creative", model: sonnet, adapter: "claude_local", status: "idle" },
  { name: "DMFlow MCP", model: haiku, adapter: "claude_local", status: "idle" },
  { name: "Social Pulse", model: haiku, adapter: "claude_local", status: "idle" },
  { name: "Ledger CRM", model: haiku, adapter: "claude_local", status: "running", since: 129.75 },
  { name: "Sales Calls Data", model: haiku, adapter: "claude_local", status: "idle" },
  { name: "Launchpad Cohort", model: haiku, adapter: "claude_local", status: "idle" },
  { name: "Vantage", model: haiku, adapter: "claude_local", status: "idle" },
  { name: "Vantage PayKit", model: haiku, adapter: "claude_local", status: "idle" },
  { name: "Payments Pulse", model: haiku, adapter: "claude_local", status: "idle" },
  { name: "Stripe", model: haiku, adapter: "claude_local", status: "idle" },
  { name: "PayKit", model: haiku, adapter: "claude_local", status: "idle" },
  { name: "Processor Confirm", model: haiku, adapter: "claude_local", status: "idle" },
  { name: "FlexPay Financing", model: haiku, adapter: "claude_local", status: "idle" },
  { name: "Markdown Auditor", model: astra, adapter: "codex_local", status: "running", since: 162.55 },
  { name: "Vector Auditor", model: astra, adapter: "codex_local", status: "idle" },
  { name: "Notion Sync", model: haiku, adapter: "claude_local", status: "idle" },
  { name: "Brain Librarian", model: sonnet, adapter: "claude_local", status: "idle" },
  { name: "Gmail Worker", model: haiku, adapter: "claude_local", status: "idle" },
  { name: "WhatsApp Worker", model: haiku, adapter: "claude_local", status: "running", since: 213.85 },
  { name: "Slack Worker", model: haiku, adapter: "claude_local", status: "paused" },
  { name: "Calendar Worker", model: haiku, adapter: "claude_local", status: "idle" },
  { name: "Onboarding Agent", model: sonnet, adapter: "claude_local", status: "idle" },
  { name: "Client Success", model: sonnet, adapter: "claude_local", status: "idle" },
];
const DATA_I = BOARD.findIndex((b) => b.name === "Data Agent");
const STACK_I = BOARD.findIndex((b) => b.name === "Stack Monitor");
// the 4s poll that shows Stack Monitor's new run lands ~2.4s after it started
const STACK_LEAD = 2.4;

// board.ts modelSummary(): count per model, by count desc then name.
const MODEL_SUMMARY = (() => {
  const counts = new Map<string, number>();
  for (const b of BOARD) counts.set(b.model, (counts.get(b.model) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([m, n]) => `${m} x${n}`)
    .join(" · ");
})();
const RUNNING_N = BOARD.filter((b) => b.status === "running").length; // 14

const STATS: [string, number][] = [
  ["Seats", BOARD.length],
  ["Running now", RUNNING_N],
  ["Open tasks", 21],
  ["Runs · 24h", 35],
  ["Heartbeats · 24h", 33],
];

// board.ts ago(): "20s ago" / "1m ago".
const ago = (s: number) => (s < 60 ? `${Math.floor(s)}s ago` : `${Math.floor(s / 60)}m ago`);
const runDur = (s: number) => (s < 60 ? `${Math.round(s)}s` : `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, "0")}s`);

// Task lanes as captured (04h): status, count, first cards (title, owner).
const LANE_ROWS: { status: string; dot: string; count: number; cards: [string, string][] }[] = [
  {
    status: "in progress",
    dot: MONO.ok,
    count: 9,
    cards: [
      ["Cut the sales-call highlight reel", "Reelkit Editor"],
      ["Schedule this week's cross-platform posts", "Postly Publisher"],
      ["Qualify 12 new DMs from the campaign", "Comms Agent"],
    ],
  },
  {
    status: "in review",
    dot: MONO.warn,
    count: 3,
    cards: [
      ["Draft 3 IG hooks for the Vantage launch", "Social Agent"],
      ["Generate 5 UGC variants for the new offer", "Adsmith Creative"],
      ["Weekly pipeline summary for Vantage", "Sales Agent"],
    ],
  },
  {
    status: "todo",
    dot: MONO.text2,
    count: 8,
    cards: [
      ["Triage overnight inbound across 4 inboxes", "Comms Agent"],
      ["Follow up on 6 unreplied warm leads", "Gmail Worker"],
      ["Audit pgvector index health", "Vector Auditor"],
    ],
  },
  { status: "blocked", dot: MONO.err, count: 1, cards: [["Connect the Slack workspace digest", "Slack Worker"]] },
  {
    status: "done",
    dot: MONO.text3,
    count: 16,
    cards: [
      ["Send the Vantage proposal follow-up", "Gmail Worker"],
      ["Publish the Tuesday carousel", "Social Agent"],
      ["Sync follower counts across 6 platforms", "Postly Publisher"],
    ],
  },
];

const mix = (c: string, pct: number, other = "transparent") => `color-mix(in oklab, ${c} ${pct}%, ${other})`;

// kit.css bn-rise: 0.6s house ease, from translateY(10px) scale(.992), opacity 0.
const rise = (f: number, start: number, dur = 16): React.CSSProperties => {
  const t = interpolate(f, [start, start + dur], [0, 1], { ...clamp, easing: HOUSE });
  return { opacity: t, transform: `translateY(${10 * (1 - t)}px) scale(${0.992 + 0.008 * t})` };
};
// kit.css bn-enter: 0.3s lens ease, from translateY(6px), opacity 0.
const enter = (f: number, start: number): React.CSSProperties => {
  const t = interpolate(f, [start, start + 9], [0, 1], { ...clamp, easing: LENS });
  return { opacity: t, transform: `translateY(${6 * (1 - t)}px)` };
};

// kit.css .bn-agent-live::before: a green that travels the live seat's border (2.4s).
const Orbit: React.FC<{ f: number; phase: number; opacity?: number }> = ({ f, phase, opacity = 1 }) => {
  const ang = ((((f / 30 + phase) % 2.4) + 2.4) % 2.4) / 2.4 * 360;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        boxSizing: "border-box",
        borderRadius: 6,
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

// kit/Label.svelte
const Label: React.FC<{ x: number; y: number; children: React.ReactNode }> = ({ x, y, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      fontSize: 10,
      lineHeight: "15px",
      fontWeight: 700,
      letterSpacing: "0.26em",
      textTransform: "uppercase",
      color: MONO.text3,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </div>
);

const Seat: React.FC<{ i: number; f: number; fi: number }> = ({ i, f, fi }) => {
  const b = BOARD[i];
  const row = Math.floor(i / 5);
  const col = i % 5;
  const t = fi / 30;
  const runningChip = (since: number, op: number) => (
    <div style={{ position: "absolute", inset: 0, opacity: op }}>
      <SeatChip name={b.name} model={b.model} adapter={b.adapter} status="running" frame={f + i * 7} elapsedSec={since} width={CHIP.w} />
      <Orbit f={f} phase={i * 0.37} />
    </div>
  );
  const idleChip = (status: "idle" | "paused", op: number) => (
    <div style={{ position: "absolute", inset: 0, opacity: op }}>
      <SeatChip name={b.name} model={b.model} adapter={b.adapter} status={status} frame={f} width={CHIP.w} />
    </div>
  );
  let body: React.ReactNode;
  if (i === DATA_I) {
    // its run finishes on the 112 poll
    const x = interpolate(f, [T.dataOff, T.dataOff + 6], [0, 1], clamp);
    const since = (b.since ?? 0) + Math.min(t, T.dataOff / 30);
    body = (
      <>
        {x < 1 ? runningChip(since, 1 - x) : null}
        {x > 0 ? idleChip("idle", x) : null}
      </>
    );
  } else if (i === STACK_I) {
    // ... and Stack Monitor picks up a run on the 114 poll
    const x = interpolate(f, [T.stackOn, T.stackOn + 6], [0, 1], clamp);
    body = (
      <>
        {x < 1 ? idleChip("idle", 1 - x) : null}
        {x > 0 ? runningChip(STACK_LEAD + Math.max(0, (fi - T.stackOn) / 30), x) : null}
      </>
    );
  } else if (b.status === "running") {
    body = runningChip((b.since ?? 0) + t, 1);
  } else {
    body = idleChip(b.status === "paused" ? "paused" : "idle", 1);
  }
  return (
    <div
      style={{
        position: "absolute",
        left: CHIP.x0 + col * CHIP.dx,
        top: CHIP.y0 + row * CHIP.dy,
        width: CHIP.w,
        height: CHIP.h,
        ...rise(f, T.wave0 + 2 * (row + col)),
      }}
    >
      {body}
    </div>
  );
};

type FeedRow = { key: string; name: string; running: boolean; startedSec: number; dur?: number };

const FeedLine: React.FC<{ r: FeedRow; t: number; style?: React.CSSProperties }> = ({ r, t, style }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      width: FEED.w,
      height: 17,
      boxSizing: "border-box",
      padding: "2px 4px",
      display: "flex",
      alignItems: "baseline",
      gap: 6,
      fontSize: 9.5,
      lineHeight: "13px",
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    <span style={{ fontWeight: 700, color: r.running ? MONO.ok : MONO.text2 }}>{r.running ? "▸" : "✓"}</span>
    <span style={{ color: MONO.text, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
    {r.running ? <span style={{ color: MONO.ok }}>running</span> : null}
    {!r.running && r.dur != null ? <span style={{ color: MONO.text3 }}>{runDur(r.dur)}</span> : null}
    <span style={{ color: MONO.text3, flexShrink: 0 }}>{ago(r.startedSec + t)}</span>
  </div>
);

const BoardPage: React.FC<{ f: number }> = ({ f }) => {
  const fi = Math.floor(f);
  const t = fi / 30;
  const led = 0.75 + 0.25 * Math.cos(((f / 30) % 2) * Math.PI); // animate-pulse 2s
  const breathe = 0.5 - 0.5 * Math.cos(((f / 30) % 1.5) / 1.5 * 2 * Math.PI); // bn-task-breathe 1.5s
  const runningNames = new Set(BOARD.filter((b) => b.status === "running").map((b) => b.name));

  // run feed: running seats newest first (startedAt desc), as captured.
  const runs: FeedRow[] = BOARD.filter((b) => b.status === "running")
    .map((b) => ({ key: b.name, name: b.name, running: true, startedSec: b.since ?? 0 }))
    .sort((a, b) => a.startedSec - b.startedSec);
  const dataDone = fi >= T.dataOff;
  const dataDur = (BOARD[DATA_I].since ?? 0) + T.dataOff / 30;
  // the list makes room first, then the new run row enters (bn-enter)
  const shift = interpolate(f, [T.stackOn, T.stackOn + 6], [0, FEED.row], { ...clamp, easing: HOUSE });
  const stackRow: FeedRow = { key: "stack", name: "Stack Monitor", running: true, startedSec: STACK_LEAD - T.stackOn / 30 };

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 1950,
        height: 1000,
        background: MONO.bg,
        fontFamily: FONT_MONO,
        color: MONO.text,
      }}
    >
      {/* the slab + Roster SlabCard */}
      <Box x={256} y={52} w={1668} h={890} style={{ border: `1px solid ${MONO.border}`, borderRadius: 28, background: MONO.bg }} />
      <Box x={285.6} y={65} w={1610.4} h={848} style={{ border: `1px solid ${MONO.border}`, borderRadius: 20, background: MONO.bg }} />
      {/* AgentsTabs */}
      <Box x={306} y={115} w={600} h={1} style={{ background: MONO.border }} />
      {[
        ["Roster", true],
        ["Needs you", false],
        ["Deliverables", false],
        ["Hermes", false],
      ].map(([label, on], i) => (
        <div
          key={label as string}
          style={{
            position: "absolute",
            left: 306 + i * 150,
            top: 90,
            width: 150,
            height: 19,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: on ? MONO.text : MONO.text3,
          }}
        >
          {label}
          {i === 1 ? (
            <span
              style={{
                display: "inline-grid",
                placeItems: "center",
                width: 16,
                height: 16,
                borderRadius: 999,
                background: MONO.warn,
                color: MONO.bg,
                fontSize: 9.5,
                letterSpacing: 0,
              }}
            >
              2
            </span>
          ) : null}
        </div>
      ))}
      <Box x={306} y={113.5} w={150} h={2} style={{ background: MONO.text }} />

      {/* Board live */}
      <Box
        x={PANEL.x}
        y={PANEL.y}
        w={PANEL.w}
        h={PANEL.h}
        style={{ border: `1px solid ${MONO.border}`, borderRadius: 10, background: MONO.surface }}
      >
        {/* head */}
        <div style={{ position: "absolute", left: 17, top: 15.5, width: 6, height: 6, background: MONO.ok, opacity: led }} />
        <Label x={34.5} y={10}>
          Board live
        </Label>
        <div style={{ position: "absolute", left: 133, top: 10, fontSize: 10, lineHeight: "15px", color: MONO.text3 }}>
          {`${BOARD.length} seats · ${RUNNING_N} running`}
        </div>
        <div
          style={{
            position: "absolute",
            right: 17,
            top: 10,
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 10,
            lineHeight: "15px",
            color: MONO.text3,
          }}
        >
          open board <OsIcon name="ArrowUpRight" size={12} />
        </div>
        <div style={{ position: "absolute", left: 17, top: 29, fontSize: 10, lineHeight: "16.25px", color: MONO.text2, whiteSpace: "nowrap" }}>
          {MODEL_SUMMARY}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 56, height: 1, background: MONO.border }} />

        {/* stat cells (CountUp on first paint) */}
        {STATS.map(([label, value], k) => {
          const c = interpolate(fi, [T.stats0 + k * 2, T.stats0 + k * 2 + 27], [0, 1], { ...clamp, easing: COUNT });
          return (
            <div
              key={label}
              style={{
                position: "absolute",
                left: CHIP.x0 + k * CHIP.dx,
                top: STAT.y,
                width: CHIP.w,
                height: STAT.h,
                boxSizing: "border-box",
                border: `1px solid ${MONO.border}`,
                borderRadius: 6,
                background: MONO.bg,
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div
                style={{
                  minHeight: "1.6em",
                  fontSize: 9.5,
                  fontWeight: 700,
                  lineHeight: 1.3,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: MONO.text3,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                {Math.round(value * c)}
              </div>
            </div>
          );
        })}

        {/* seat grid */}
        {BOARD.map((_, i) => (
          <Seat key={i} i={i} f={f} fi={fi} />
        ))}

        {/* run feed */}
        <Label x={FEED.x} y={FEED.y - 23}>
          Run feed
        </Label>
        <div style={{ position: "absolute", left: FEED.x, top: FEED.y, width: FEED.w, height: 150, overflow: "hidden" }}>
          {fi >= T.stackOn + 4 ? <FeedLine r={stackRow} t={t} style={{ top: 0, ...enter(f, T.stackOn + 4) }} /> : null}
          {runs.map((r, k) => {
            const isData = r.name === "Data Agent";
            const row: FeedRow = isData && dataDone ? { ...r, running: false, dur: dataDur } : r;
            const flip = isData ? interpolate(f, [T.dataOff, T.dataOff + 6], [0, 1], clamp) : 0;
            const top = k * FEED.row + shift;
            return (
              <div key={r.key} style={{ position: "absolute", left: 0, top, width: FEED.w, height: 17, ...enter(f, T.feed0 + k * 2) }}>
                {isData && flip > 0 && flip < 1 ? (
                  <>
                    <FeedLine r={r} t={t} style={{ top: 0, opacity: 1 - flip }} />
                    <FeedLine r={{ ...r, running: false, dur: dataDur }} t={t} style={{ top: 0, opacity: flip }} />
                  </>
                ) : (
                  <FeedLine r={row} t={t} style={{ top: 0 }} />
                )}
              </div>
            );
          })}
        </div>

        {/* task lanes */}
        <Label x={LANES.x} y={FEED.y - 23}>
          Task lanes
        </Label>
        {LANE_ROWS.map((lane, li) => {
          const lw = (LANES.w - 4 * 12) / 5;
          const lx = LANES.x + li * (lw + 12);
          return (
            <div key={lane.status} style={{ position: "absolute", left: lx, top: LANES.y, width: lw }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  height: 13.5,
                  marginBottom: 6,
                  fontSize: 9,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: MONO.text3,
                  paddingRight: 4,
                }}
              >
                <span style={{ width: 4, height: 4, background: lane.dot, flexShrink: 0 }} />
                <span>{lane.status}</span>
                <span style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>{lane.count}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingRight: 4 }}>
                {lane.cards.map(([title, owner], ci) => {
                  const live = runningNames.has(owner);
                  return (
                    <div
                      key={title}
                      style={{
                        boxSizing: "border-box",
                        borderRadius: 6,
                        padding: "6px 8px",
                        border: `1px solid ${live ? mix(MONO.ok, 30 + 70 * breathe, MONO.border) : MONO.border}`,
                        background: live ? mix(MONO.ok, 9 * breathe) : "transparent",
                        ...enter(f, T.lanes0 + li * 2 + ci * 2),
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10.5,
                          lineHeight: 1.375,
                          color: MONO.text,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {title}
                      </div>
                      <div style={{ marginTop: 2, display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: MONO.text3 }}>
                        <span style={{ width: 4, height: 4, flexShrink: 0, background: live ? MONO.ok : MONO.text2, opacity: live ? 0.35 + 0.65 * breathe : 1 }} />
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{owner}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Box>

      {/* Conductor rail (capture 04e); its fixture chat is blurred past reading */}
      <div style={{ position: "absolute", left: RAIL_X - 4, top: PANEL.y - 4, width: 408, height: 769, overflow: "hidden" }}>
        <Img src={staticFile("bconductor/reference/04e-conductor-rail-stateA.png")} style={{ width: 408, height: 769 }} />
        <div style={{ position: "absolute", left: 14, top: 76, width: 380, height: 160, overflow: "hidden" }}>
          <Img
            src={staticFile("bconductor/reference/04e-conductor-rail-stateA.png")}
            style={{ position: "absolute", left: -14, top: -76, width: 408, height: 769, filter: "blur(7px)" }}
          />
        </div>
      </div>

      {/* sticky chrome (real crops); the topbar runs on to the window edge */}
      <Box x={1600} y={0} w={350} h={52} style={{ background: MONO.bg, borderBottom: `1px solid ${MONO.border}` }} />
      <OsChrome page="agents" />
    </div>
  );
};

// ================================================================== scene
const capsulePolygon = (a: { x: number; y: number }, b: { x: number; y: number }, r: number) => {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const dx = (b.x - a.x) / len;
  const dy = (b.y - a.y) / len;
  const nx = -dy;
  const ny = dx;
  const pts: string[] = [];
  const N = 18;
  for (let k = 0; k <= N; k++) {
    const th = -Math.PI / 2 + (Math.PI * k) / N;
    pts.push(`${(b.x + r * (Math.cos(th) * dx + Math.sin(th) * nx)).toFixed(2)}px ${(b.y + r * (Math.cos(th) * dy + Math.sin(th) * ny)).toFixed(2)}px`);
  }
  for (let k = 0; k <= N; k++) {
    const th = Math.PI / 2 + (Math.PI * k) / N;
    pts.push(`${(a.x + r * (Math.cos(th) * dx + Math.sin(th) * nx)).toFixed(2)}px ${(a.y + r * (Math.cos(th) * dy + Math.sin(th) * ny)).toFixed(2)}px`);
  }
  return `polygon(${pts.join(", ")})`;
};

const distToSeg = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const u = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(p.x - (a.x + u * vx), p.y - (a.y + u * vy));
};

const Scene: React.FC = () => {
  const f = useCurrentFrame();
  const gc = ghCam(f);
  const bc = boardCam(f);

  // the inner loop of the mark, in screen px
  const la = toScreen(gc, LOOP_A.x, LOOP_A.y);
  const lb = toScreen(gc, LOOP_B.x, LOOP_B.y);
  const lr = LOOP_R * gc.s;
  const corners = [
    { x: 0, y: 0 },
    { x: W, y: 0 },
    { x: 0, y: H },
    { x: W, y: H },
  ];
  const loopCovers = corners.every((c) => distToSeg(c, la, lb) < lr - 2);
  const showBoard = lr > 0.6;

  // the avatar tile covers the frame -> the rest of the page is out of shot
  const tl = toScreen(gc, AV.x, AV.y);
  const tileSize = AV.size * gc.s;
  const tileCovers = tl.x < -2 && tl.y < -2 && tl.x + tileSize > W + 2 && tl.y + tileSize > H + 2;


  return (
    <AbsoluteFill style={{ backgroundColor: MRD.bg, overflow: "hidden" }}>
      {!loopCovers ? (
        <>
          <AbsoluteFill style={{ backgroundColor: GH.bg }} />
          {!tileCovers ? (
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                transform: `translate(${W / 2 - gc.cx * gc.s}px, ${H / 2 - gc.cy * gc.s}px) scale(${gc.s})`,
                transformOrigin: "0 0",
              }}
            >
              <GhPage />
            </div>
          ) : null}
          <MarkTile cam={gc} />
        </>
      ) : null}
      {showBoard ? (
        <AbsoluteFill style={{ clipPath: loopCovers ? undefined : capsulePolygon(la, lb, lr), backgroundColor: MONO.bg }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              transform: `translate(${W / 2 - bc.cx * bc.s}px, ${H / 2 - bc.cy * bc.s}px) scale(${bc.s})`,
              transformOrigin: "0 0",
            }}
          >
            <BoardPage f={f} />
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

// MoveBlur windows (12 samples there, plain frames elsewhere): the push onto
// the Star, then the swoop + dive and the board camera's push behind it. The
// opening drift (<= 5 px/f) and the end hold render plain.
const MOVES: [number, number][] = [
  [T.travel0, T.travel1],
  [T.swoop0, 124],
];

export const BcP04BuiltWithPaperclip: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: MRD.bg }}>
    <MoveBlur moves={MOVES}>
      <Scene />
    </MoveBlur>
  </AbsoluteFill>
);
