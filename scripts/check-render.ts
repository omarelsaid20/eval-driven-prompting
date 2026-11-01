// Step 9 checks: the prompt from the files is the prompt scored in step 7,
// and a missing slot throws. Run: npx tsx scripts/check-render.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render } from "../prompts/render.js";
import { buildContext, type FullTicket } from "../src/context.js";
import { buildPromptV3, renderPromptV3 } from "../src/prompt.js";
import { loadCases, ROOT } from "../src/score.js";

const ticket = loadCases().find((c) => c.id === "t9330-smashed-compensation")!.input as FullTicket;
const context = buildContext(ticket);

const scored = buildPromptV3(context);
const fromFiles = await renderPromptV3(context);
console.log(`system: ${scored.system === fromFiles.system ? "same" : "DIFFERENT"} (${fromFiles.system.length} chars)`);
console.log(`user:   ${scored.user === fromFiles.user ? "same" : "DIFFERENT"} (${fromFiles.user.length} chars)`);

const systemFile = readFileSync(resolve(ROOT, "prompts/handover-note/v3.system.md"), "utf8");
console.log(`system file has a slot: ${systemFile.includes("{{")}`);
console.log(`system file has T-9330's thread: ${systemFile.includes(ticket.thread[0])}`);

const userTemplate = readFileSync(resolve(ROOT, "prompts/handover-note/v3.user.md"), "utf8");
const { thread, ...withoutThread } = context;
try {
  await render(userTemplate, withoutThread);
  console.log("missing slot: NOT caught");
} catch (error) {
  console.log(`missing slot: ${(error as Error).message}`);
}

if (scored.system !== fromFiles.system || scored.user !== fromFiles.user) process.exit(1);
