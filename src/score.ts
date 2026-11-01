import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { HandoverNote } from "./schema.js";

export type Case = {
  id: string;
  kind: "representative" | "edge" | "adversarial";
  input: unknown;
  expect: string[];
  must_not: string[];
};

export type RunOutput = {
  id: string;
  kind: string;
  stop_reason: string | null;
  output: string;
};

export const ROOT = fileURLToPath(new URL("../", import.meta.url));

export function loadCases(): Case[] {
  return JSON.parse(readFileSync(resolve(ROOT, "evals/handover-note.cases.json"), "utf8"));
}

// The three criteria code can check. facts is scored by a person reading the review.
function check(c: Case, output: string) {
  let json: { status?: unknown } | undefined;
  let parsed: HandoverNote | undefined;
  let shapeError = "";
  try {
    json = JSON.parse(output);
    const result = HandoverNote.safeParse(json);
    if (result.success) parsed = result.data;
    else shapeError = result.error.issues.map((issue) => issue.message).join("; ");
  } catch {
    shapeError = output ? "not JSON" : "empty output";
  }

  // Routing reads status from the raw JSON, so a note over the word limit
  // fails shape only, not routing as well.
  const expectsNoNote = c.expect.includes("status is insufficient_input");
  const routing = json?.status === (expectsNoNote ? "insufficient_input" : "note");

  const hits = c.must_not.filter((phrase) => output.toLowerCase().includes(phrase.toLowerCase()));

  return { parsed, shape: parsed !== undefined, shapeError, routing, hits };
}

export function scoreRun(version: string) {
  const cases = loadCases();
  const outputs: RunOutput[] = JSON.parse(
    readFileSync(resolve(ROOT, `evals/runs/${version}.json`), "utf8"),
  );

  const totals = { shape: 0, no_false_decision: 0, routing: 0 };

  // A page to read one case at a time while scoring facts by hand.
  const review = cases
    .map((c, i) => {
      const { output, stop_reason } = outputs[i];
      const result = check(c, output);
      if (result.shape) totals.shape++;
      if (result.routing) totals.routing++;
      if (result.hits.length === 0) totals.no_false_decision++;

      const body = result.parsed
        ? result.parsed.status === "note"
          ? [
              `what_happened: ${result.parsed.what_happened}`,
              `what_is_needed: ${result.parsed.what_is_needed}`,
              `what_is_blocked: ${result.parsed.what_is_blocked}`,
            ].join("\n\n")
          : "status: insufficient_input"
        : output || "(empty output)";

      return [
        `## ${i + 1}. ${c.id} (${c.kind})`,
        `expect: ${c.expect.join(" | ")}`,
        `must_not: ${c.must_not.join(" | ")}`,
        `shape: ${result.shape ? "pass" : `FAIL (${result.shapeError})`}`,
        `routing: ${result.routing ? "pass" : "FAIL"}`,
        `no_false_decision: ${result.hits.length ? `FAIL (${result.hits.join(" | ")})` : "pass"}`,
        `stop_reason: ${stop_reason}`,
        "facts: ___",
        "",
        body,
        "",
      ].join("\n");
    })
    .join("\n---\n\n");
  writeFileSync(resolve(ROOT, `evals/runs/${version}.review.md`), review);

  const n = cases.length;
  console.log(
    `${version} — shape ${totals.shape}/${n} (≥18) · no_false_decision ${totals.no_false_decision}/${n} (≥20) · routing ${totals.routing}/${n} (≥20) · facts ?/${n} (≥18)`,
  );
  console.log(`saved evals/runs/${version}.review.md`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const version = process.argv[2];
  if (!version) {
    console.error("usage: score.ts <version>");
    process.exit(1);
  }
  scoreRun(version);
}
