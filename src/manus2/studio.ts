// ===========================================================================
// Bennett x Manus 2.0 v2: "My agency got so busy" (Video Editor script, Oct
// 2026). Shared DNA for the MbP* parts. READ-ONLY for builder agents.
//
// Everything here was read off Bennett's signed-in Manus Studio DESKTOP app,
// captured live Oct 1 2026 (Retina 3024x1964, CSS viewport 1512x982):
//   public/manus2/studio/*.png        1x copies (1512x982), one CSS px = 1 px
//   public/manus2/studio/*-2x.png     full-res frames for detail
// The Studio window sits at x 204..1493, y 34..932 in those captures (so the
// app itself is 1289x898 CSS px). Build in that window's coordinates.
//
// The live app runs in DARK appearance. The series look (theme.ts, holo) is a
// LIGHT Manus panel on the Merydian dark ground, so parts render with the
// light tokens by default. Layout, spacing, strings and icons come from the
// captures in both modes; only the palette swaps. Never hardcode a color in a
// part: take every Studio color from `studio(mode)` so the palette can flip.
// ===========================================================================
import { MANUS } from "./theme";

export type StudioMode = "light" | "dark";
export const STUDIO_MODE: StudioMode = "light";

// Window geometry inside the 1512x982 captures.
export const STUDIO_WIN = { x: 204, y: 34, w: 1289, h: 898, radius: 14, sidebarW: 239 } as const;

const LIGHT = {
  win: MANUS.appBg, // main well
  sidebar: MANUS.sidebar,
  card: MANUS.white, // Build / Create / local-file cards, prompt box
  cardAlt: MANUS.card,
  field: MANUS.white, // prompt + message boxes
  fieldHead: "#F2F2F0", // "This Mac / Choose project / Choose folder" strip
  ink: MANUS.ink,
  ink2: MANUS.ink2,
  muted: MANUS.muted,
  faint: MANUS.disabled,
  border: "rgba(0,0,0,0.08)",
  borderStrong: MANUS.borderBtn,
  hover: "rgba(0,0,0,0.05)",
  brand: "#0081F2", // Alchemy pill, Video chip text, Working dot
  brandSoft: "rgba(0,129,242,0.10)", // Video chip fill
  maxBadgeBg: "#FFFFFF",
  maxBadgeInk: "#0081F2",
  sendBg: MANUS.black, // enabled send / stop button
  sendInk: "#FFFFFF",
  exportBg: MANUS.black,
  exportInk: "#FFFFFF",
  previewBg: "#000000", // the video canvas is black in both modes
  track: "#EFEFED", // empty timeline lane
  clipHead: "#C9DDF5", // clip title strip
  clipWave: "#5B9BE6", // waveform strip under the thumbnails
  clipWaveBg: "#DCE9F8",
  mainChipBg: "rgba(0,129,242,0.12)",
  mainChipInk: "#0081F2",
  playhead: MANUS.ink,
  fileIconBg: "#FFEEEB", // red video-file glyph tile on the attachment card
  fileIcon: "#F25A5A",
  shadow: MANUS.shadow,
} as const;

// Sampled from the captures (01-studio-home, rec-t085, raw-t660).
const DARK: { [K in keyof typeof LIGHT]: string } = {
  win: "#1A1A1A",
  sidebar: "#1F1F1F",
  card: "#232323",
  cardAlt: "#1F1F1F",
  field: "#242424",
  fieldHead: "#1C1C1C",
  ink: "#EDEDED",
  ink2: "#BFBFBF",
  muted: "#9C9C9C",
  faint: "#6B6B6B",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.14)",
  hover: "rgba(255,255,255,0.06)",
  brand: "#218AF9",
  brandSoft: "rgba(33,138,249,0.18)",
  maxBadgeBg: "#FFFFFF",
  maxBadgeInk: "#218AF9",
  sendBg: "#F3F3F3",
  sendInk: "#1A1A1A",
  exportBg: "#F3F3F3",
  exportInk: "#1A1A1A",
  previewBg: "#000000",
  track: "#212121",
  clipHead: "#2B4563",
  clipWave: "#A8C8F0",
  clipWaveBg: "#2C4762",
  mainChipBg: "rgba(49,95,148,0.35)",
  mainChipInk: "#6FB0F5",
  playhead: "#FFFFFF",
  fileIconBg: "#FFEEEB",
  fileIcon: "#F25A5A",
  shadow: "0 30px 70px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)",
};

export const studio = (mode: StudioMode = STUDIO_MODE) => (mode === "dark" ? DARK : LIGHT);
// Logo color follows the brief: black on light, white on dark. Never recolor.
export const studioLogo = (mode: StudioMode = STUDIO_MODE) =>
  mode === "dark"
    ? { mark: "manus2/logos/manus-mark-white.svg", word: "manus2/logos/manus-word-white.svg" }
    : { mark: "manus2/logos/manus-mark-black.svg", word: "manus2/logos/manus-word-black.svg" };

// ------------------------------------------ REAL UI strings, read off the app
// Do not reword. No em dashes or en dashes on screen (house rule).
export const STUDIO_SIDEBAR = {
  items: ["New task", "Computers", "Agents", "Library", "Creations", "Automations", "Plugins", "More"],
  agentsBadge: "Cue!",
  projects: "Projects",
  newProject: "New project",
  tasks: "Tasks",
  runningTask: "Create a 40-second 9:16 Ins", // truncated by the sidebar exactly like this
  user: "Bennett Sp...",
  credits: "20.9K",
} as const;

// 01-studio-home.png
export const STUDIO_HOME = {
  model: "Manus 2.0",
  lockupWord: "manus", // serif wordmark (use the official SVG)
  lockupStudio: "studio", // same serif, muted
  build: "Build",
  buildSub: "Websites, apps, and games",
  create: "Create",
  createSub: "Slides, images, and videos",
  local: "Start from a local file",
  localSub: "Click or drag local files here",
  scope: ["This Mac", "Choose project", "Choose folder"],
  placeholder: "Assign a task or type / for more",
  approve: "Approve for me",
} as const;

// rec-t025 / rec-t070 / rec-t085: Create > Video
export const STUDIO_VIDEO = {
  model: "Manus 2.0 Max",
  headline: "Every idea has a film in it.", // Libre Baskerville
  templateTitle: "Template",
  templateSub: "Every template works with Alchemy.",
  templates: [
    "Promotional ad",
    "Product showcase",
    "Story short film",
    "Talking-head highlights",
    "Vlog edit",
    "Product launch film",
    "Knowledge explainer",
    "Software demo",
  ],
  madeWith: "Made with Alchemy",
  placeholder: "Describe the video you want to create",
  chipVideo: "Video",
  chipAlchemy: "Alchemy",
  chipMax: "Max",
  chipRatio: "9:16",
  chipQuality: "Ultra",
  file: { name: "C1107.MP4", meta: "Video · 4412.12 MB" },
  // The real brief Bennett's account sent (rec-t085.png), verbatim.
  brief:
    "Make a 9:16 Instagram Reel from this clip, about 40 seconds long. It's me talking about how my agency got so busy that I didn't have time to make content. Use the best take of each line, cut out the pauses and mistakes, and add captions and some background music.",
} as const;

// rec-t150 / rec-t560 / raw-t660 / raw-latest: chat + Video Editor split view
export const STUDIO_EDITOR = {
  tab: "Video Editor",
  title: "Video Editor",
  export: "Export",
  panelTabs: ["Media", "Text", "More"],
  searchMedia: "Search media",
  clip: { name: "C1107.MP4", length: "6:17" },
  music: { name: "bgm_reel.mp3", state: "Finished" },
  time: "00:00:00",
  total: "00:42:2", // as the app shows it once the cut is on the timeline
  trackMain: "Main",
  ruler: ["00:00", "00:01", "00:02", "00:03"],
  takes: 13, // "placing the 13 selected takes on the timeline"
  working: "Working",
  thinking: "Thinking",
  messagePlaceholder: "Message Manus",
  chatScope: "This Mac",
  // real agent lines from the run (chat column)
  chat: [
    "I'll build the captions manually as short 3-5 word chunks from the word timings, which reads better on a Reel than full sentences. Now I'm placing the 13 selected takes on the timeline.",
    "The clips landed in fit mode with black bars, so I'll reframe each one to fill the 9:16 canvas.",
  ],
  steps: ["Ran 2 commands · Read 6 files", "Apply the 9:16 fill framing and punch-ins."],
} as const;

// A real frame of Bennett's raw clip (cropped from the editor preview). Use it
// for clip thumbnails / the preview. It is his own footage for his own reel.
export const STUDIO_ASSETS = {
  clipFrame: "manus2/studio/clip-frame.png", // 468x262 (16:9)
} as const;

// Never render (privacy + brief): the macOS desktop behind the window, the
// menu bar, the calendar widget, Dock icons, the file-picker paths, the old
// "Prepare Cascade Dental Gro" task row, any third-party brand or model name.
export const DO_NOT_RENDER_STUDIO = [
  "victormatevski",
  "Prepare Cascade Dental",
  "Claude",
  "Opus",
  "Anthropic",
  "Game development",
] as const;
