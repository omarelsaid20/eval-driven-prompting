// One-off for step 9: writes the v3 prompt that was scored in step 7 into files.
// The system file is the frozen text. The user file is the same boxes with a
// {{slot}} where each per-ticket piece goes.
// Run once: npx tsx scripts/write-v3-files.ts
import { writeFileSync } from "node:fs";

import { buildPromptV3 } from "../src/prompt.js";
import { ROOT } from "../src/score.js";

const SLOTS = ["policy", "customer_summary", "order", "reply_assist", "message_counts", "thread"] as const;
const placeholders = Object.fromEntries(SLOTS.map((name) => [name, `{{${name}}}`]));
const { system, user } = buildPromptV3(placeholders as Record<(typeof SLOTS)[number], string>);

if (system.includes("{{")) throw new Error("system prompt contains a slot");
writeFileSync(`${ROOT}prompts/handover-note/v3.system.md`, system);
writeFileSync(`${ROOT}prompts/handover-note/v3.user.md`, user);
console.log("wrote prompts/handover-note/v3.system.md and v3.user.md");
