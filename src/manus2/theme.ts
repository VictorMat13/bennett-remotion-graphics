// ===========================================================================
// Bennett x Manus 2.0: "A client emailed me at 2 a.m." (Sep 2026). Shared
// series DNA. READ-ONLY for builder agents.
//
// LOOK: Bennett's series look (same as src/holo, src/fishos, src/fish3):
// Merydian dark ground, green world light, LIGHT product panels floating on
// the dark. Everything from fishos/theme is re-exported so builders import
// only from "./theme". Only the Manus + Cue brand assets are new.
//
// MOTION: a live SCREEN RECORDING of Bennett's own Manus account
// Bennett's cursor sets things up; MANUS itself is the
// agent doing the work (its own "Working" / "Thinking" states). NO Claude/Opus
// driver chip in this series: the Manus brief bans third-party brands.
// Every state is copied from the real walkthrough captured Sep 29 2026:
// public/manus2/reference/NN-*.png (1440x862 CSS viewport at 1x).
// Cue (the phone app) is rebuilt from the OFFICIAL Cue launch video frames in
// public/manus2/cue/cue-tNN.png (3840x2160). Nothing mocked from memory.
// ===========================================================================
import { staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";
export * from "../fishos/theme";

export const FPS = 30;
export const CANVAS = { width: 1080, height: 960 } as const; // 9:8, every part

// ------------------------------------------------------------- Manus type
// The app UI is the system font stack (computed style on manus.im/app).
// Big headings ("Automate your work", doc titles) are Libre Baskerville.
export const MANUS_FONT =
  '-apple-system, "system-ui", "Segoe UI", Helvetica, Arial, sans-serif';
export const MANUS_SERIF = '"Libre Baskerville", Georgia, serif';
let fontsLoaded = false;
export const loadManusFont = () => {
  if (fontsLoaded) return;
  fontsLoaded = true;
  loadFont({ family: "Libre Baskerville", url: staticFile("manus2/fonts/LibreBaskerville-400.woff2"), weight: "400" });
  loadFont({ family: "Libre Baskerville", url: staticFile("manus2/fonts/LibreBaskerville-700.woff2"), weight: "700" });
};

// ------------------------------------------------------ Manus app tokens
// Verbatim from the app's #content-root CSS variables (light theme).
export const MANUS = {
  appBg: "#F8F8F7", // --background-gray-main (main well)
  sidebar: "#F2F2F0", // sidebar fill as captured
  white: "#FFFFFF",
  card: "#FAFAFA",
  ink: "#34322D", // --text-primary / --logo-color
  ink2: "#535350", // --text-secondary
  muted: "#858481", // --text-tertiary
  disabled: "#B9B9B7",
  brand: "#0081F2", // --text-brand (links, Automations chip)
  brandFill: "rgba(0,129,242,0.08)",
  black: "#1A1A19", // --Button-primary-black (Create, Connect, send)
  border: "rgba(0,0,0,0.06)",
  borderBtn: "rgba(0,0,0,0.12)",
  success: "#25BA3B", // "Task completed" check
  error: "#F25A5A",
  radiusPanel: 20,
  radiusInput: 22,
  radiusBtn: 999,
  shadow: "0 30px 70px rgba(0,0,0,0.55), 0 4px 14px rgba(0,0,0,0.35)",
} as const;

export const MANUS_LOGOS = {
  markBlack: "manus2/logos/manus-mark-black.svg", // the hand mark, for light panels
  markWhite: "manus2/logos/manus-mark-white.svg", // for the dark ground
  wordBlack: "manus2/logos/manus-word-black.svg", // "manus" wordmark
  wordWhite: "manus2/logos/manus-word-white.svg",
  cueIcon: "manus2/logos/cue-app-icon.webp", // Cue app icon (gray gear + eyes)
} as const;

// ------------------------------------------ REAL UI strings, in flow order
// Every string below was read off the live app. Do not reword.
export const SIDEBAR = {
  items: ["New task", "Computers", "Agents", "Library", "Creations", "Automations", "Plugins", "More"],
  agentsBadge: "Cue!",
  projects: "Projects",
  newProject: "New project",
  tasks: "Tasks",
  user: "Bennett Spooner",
  model: "Manus 2.0",
  credits: "21K",
} as const;

// 10-new-task-empty.png (home)
export const HOME = {
  build: "Build",
  buildSub: "Websites, apps, and games",
  create: "Create",
  createSub: "Slides, images, and videos",
  local: "Start from a local file",
  localSub: "Open local files in Manus Studio",
  studioOnly: "Studio only",
  placeholder: "Assign a task or type / for more",
  cloud: "Cloud",
  chooseProject: "Choose project",
} as const;

// 02..09: Automations flow
export const AUTOMATIONS = {
  pageTitle: "Automations",
  emptyTitle: "Create your first automation",
  emptySub:
    "Use schedules for recurring work, triggers for specific events, or describe when Manus should act in your own words.",
  cards: [
    { title: "Schedule", sub: "Automate recurring work by choosing when and how often Manus should run." },
    { title: "Trigger", sub: "Choose an event and define what Manus should do when it happens." },
    { title: "Advanced automation", sub: "Describe when Manus should act and what it should do in your own words.", badge: "Beta" },
  ],
  getStarted: "Get started",
  heading: "Automate your work", // serif
  chooseTitle: "Choose how it starts",
  chooseOptions: [
    { title: "Schedule", sub: "Run at a time you choose" },
    { title: "Triggered task", sub: "Start from activity in your apps" },
    { title: "Advanced automation", sub: "Describe when Manus should act", badge: "Beta" },
  ],
  whenThisHappens: "When this happens",
  addTrigger: "Add Trigger",
  apps: ["Gmail", "Outlook Mail", "Mail Manus", "Notion", "Google Calendar", "Outlook Calendar", "GitHub", "Instagram", "Meta Ads", "Google Ads", "Google Workspace", "Shopify", "RSS", "Webhook", "Timer"],
  gmailEvents: [
    "New email",
    "New attachment",
    "New conversation",
    "New email matching keyword search",
    "Newly labeled conversation",
    "Newly labeled email or reply",
    "Newly starred email",
    "New label",
  ],
  pickedEvent: "New email matching keyword search",
  connectionRequired: "Connection required",
  connect: "Connect",
  connected: "Connected", // drawn: the state after Connect (not captured live)
  addAnother: "Add another trigger",
  manusWill: "Manus will",
  manusWillPlaceholder: "Describe what Manus should do, e.g. summarize the latest AI news and send me the highlights",
  manusWillText:
    "When a new lead emails the Merydian inbox, pull out what they want and their deadline, research their company, write me a one-page brief, and draft a reply for my approval.",
  chip: "Automations",
  create: "Create",
} as const;

// The sample lead used for the real run (fictional person + practice).
export const LEAD = {
  fromName: "Dana Reyes",
  fromRole: "Operations Director, Cascade Dental Group",
  subject: "AI receptionist for our 6 clinics?",
  body:
    "Hi, we run six dental clinics and miss a lot of after-hours calls. Can you build us an AI receptionist that books appointments into our scheduler? We'd like it live before January 1. Can we talk this week?",
  receivedAt: "2:04 AM",
} as const;

// 13..15: the real task run
export const RUN = {
  taskTitle: "Prepare Cascade Dental Group lead brief and reply draft",
  ack: "I'll research Cascade Dental Group and turn the lead's request into a concise brief and an unsent reply draft.",
  working: "Working",
  workingFor: "Working for 23s",
  steps: "Searched 6 queries · Ran 2 commands · Browsed 1 page",
  subStep: "Checking prospect domain availability",
  thinking: "Thinking",
  workedFor: "Worked for 48s",
  // what it pulled out (real extraction, trimmed; bold parts in the app):
  want: "after-hours AI call handling plus direct scheduler booking for six clinics",
  deadline: "before January 1, 2027",
  daysLeft: "94 days from the lead date",
  files: ["One-page lead brief", "Unsent reply draft to Dana Reyes"],
  nothingSent: "Nothing was sent.",
  completed: "Task completed",
  messagePlaceholder: "Message Manus",
  disclaimer: "Manus is an AI Agent and can make mistakes. Please double-check before use.",
} as const;

// 16-brief-open.png: the REAL brief doc (serif title)
export const BRIEF_DOC = {
  fileTab: "cascade-dental-lead-brief",
  lastModified: "Last modified: 12:39 AM",
  title: "Cascade Dental Group Lead Brief", // real title has an em dash; house rule: never render one
  meta: [
    ["Prepared for:", "Merydian"],
    ["Lead:", "Dana Reyes, Operations Director"],
    ["Date:", "September 29, 2026"],
    ["Status:", "Qualified inbound lead; company details require verification before scoping."],
  ],
  h2: ["What they want", "Why this is a meaningful opportunity", "Recommended discovery agenda (30 minutes)"],
  quote: "“Can you build us an AI receptionist that books appointments into our scheduler? We’d like it live before January 1.”",
  bullets: [
    "Clear, operations-led pain point: after-hours abandonment and missed appointment demand.",
    "Concrete automation outcome: capture caller intent, schedule qualified appointments, and escalate exceptions.",
    "Six-clinic footprint suggests potential for a repeatable, multi-location deployment rather than a single-office pilot.",
  ],
} as const;

// 17-reply-open.png: the REAL drafted reply (trimmed)
export const REPLY_DOC = {
  fileTab: "draft-reply-to-dana-reyes",
  title: "Draft Reply: Dana Reyes",
  subject: "Subject: Re: AI receptionist for your six clinics",
  paragraphs: [
    "Hi Dana,",
    "Yes, we can help with that. An AI receptionist that handles after-hours calls, follows each clinic’s booking rules, and schedules directly into your existing system is exactly the kind of operational workflow we build.",
    "Would you be open to a 30-minute call this week? Please send a couple of times that work for you, and we’ll coordinate.",
    "Best,",
    "Merydian",
  ],
  fileCard: "Draft Reply: Dana Reyes",
  fileMeta: "Markdown · 1.40 KB",
} as const;

// Cue (mobile). Rebuilt from the official launch video frames:
//   cue-t24.png  phone home for an agent (dark navy header, tiles)
//   cue-t33.png / cue-t60.png  Agents list (white, iOS)
//   cue-t41.png / cue-t63.png  approval card with Deny / Allow buttons
//   cue-t03.png / cue-t72.png  "cue" wordmark lockup + mascots
export const CUE = {
  appName: "Cue",
  agentsTitle: "Agents",
  agentName: "Inbox Agent", // Bennett's agent in this story (drawn)
  deny: "Deny",
  allow: "Allow",
  approved: "Approved",
  blue: "#3E8BFF", // mascot / accent blue sampled from the Cue video
  navy: "#1F3A63", // agent home header
  iosBg: "#F4F4F6",
} as const;

// Never render: third-party model/brand names (brief rule), the "Use Manus
// anywhere" download popup, "Explore Manus 2.0 / See what's new" promo card,
// and any real email address or domain other than merydian.ai.
export const DO_NOT_RENDER_MANUS = [
  "Claude",
  "Opus",
  "Anthropic",
  "Use Manus anywhere",
  "Explore Manus 2.0",
  "See what’s new",
  "cascadedentalgroup.com",
  "cascadedg.com",
] as const;
