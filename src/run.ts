import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { RunnableBranch, RunnableLambda, type Runnable } from "@langchain/core/runnables";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildContext, needsNoNote, type FullTicket } from "./context.js";
import { model, MODEL, toGeneration, typedModel, typedToGeneration, type Generation } from "./model.js";
import { buildPrompt, renderPromptV3, type TicketInput } from "./prompt.js";
import { loadCases, ROOT, scoreRun, type RunOutput } from "./score.js";

type Prompt = { system: string; user: string };

const NO_NOTE: Generation = {
  output: JSON.stringify({ status: "insufficient_input", what_happened: null, what_is_needed: null, what_is_blocked: null }),
  stop_reason: "no_call",
  input_tokens: 0,
  output_tokens: 0,
};

const toMessages = RunnableLambda.from(({ system, user }: Prompt) => [
  new SystemMessage(system),
  new HumanMessage(user),
]);

// prompt -> messages -> model -> the raw text the scorer reads.
function chain(build: (input: TicketInput) => Prompt | Promise<Prompt>, typed: boolean): Runnable<TicketInput, Generation> {
  const prompt = RunnableLambda.from(build).pipe(toMessages);
  return typed ? prompt.pipe(typedModel).pipe(typedToGeneration) : prompt.pipe(model).pipe(toGeneration);
}

// One entry per version. v3 reads its prompt files on every call.
const VERSIONS: Record<string, Runnable<TicketInput, Generation>> = {
  v0: chain(
    (input) => ({
      system: "Summarise this ticket for the next person.",
      user: JSON.stringify(input, null, 2),
    }),
    false,
  ),
  v1: chain((input) => buildPrompt(input), true),
  v2: chain((input) => buildPrompt(input, { examples: true }), true),
  // Empty thread or not escalated: answered in code, no call, nothing to pay.
  // Everything else: select the context, then one model call.
  v3: RunnableBranch.from<TicketInput, Generation>([
    [needsNoNote, RunnableLambda.from(() => NO_NOTE)],
    chain((input) => renderPromptV3(buildContext(input as FullTicket)), true),
  ]),
};

// Usage: run.ts <version> [save-as]. save-as keeps an earlier run of the same
// version, for example "v2.langchain" next to the raw-SDK "v2".
const [version, saveAs = version] = process.argv.slice(2);
const versionChain = version ? VERSIONS[version] : undefined;
if (!version || !versionChain) {
  console.error(`usage: run.ts <${Object.keys(VERSIONS).join("|")}> [save-as]`);
  process.exit(1);
}

const cases = loadCases();
const outputs: RunOutput[] = [];

for (const c of cases) {
  const { output, stop_reason, input_tokens, output_tokens } = await versionChain.invoke(c.input as TicketInput);
  outputs.push({ id: c.id, kind: c.kind, stop_reason, output });
  console.log(`${c.id}: ${input_tokens} in, ${output_tokens} out, ${stop_reason}`);
}

mkdirSync(resolve(ROOT, "evals/runs"), { recursive: true });
writeFileSync(resolve(ROOT, `evals/runs/${saveAs}.json`), JSON.stringify(outputs, null, 2));
console.log(`saved evals/runs/${saveAs}.json (${MODEL})`);

scoreRun(saveAs);
