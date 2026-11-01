// Token count for every piece v3 could send, from the count_tokens endpoint.
// Each piece is counted as a user message on its own, minus an empty-ish
// message, so the numbers add up to roughly the real request.
// Run: npx tsx --env-file=.env scripts/count-tokens.ts
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildContext, selectOrder, formatOrder, type FullTicket } from "../src/context.js";
import { MODEL } from "../src/model.js";
import { buildPromptV3 } from "../src/prompt.js";
import { loadCases, ROOT } from "../src/score.js";

const client = new Anthropic();

async function count(user: string, system?: string): Promise<number> {
  const { input_tokens } = await client.messages.countTokens({
    model: MODEL,
    messages: [{ role: "user", content: user }],
    ...(system && { system }),
  });
  return input_tokens;
}

const baseline = await count(".");
const piece = async (text: string) => (text ? (await count(text)) - baseline : 0);

async function report(ticket: FullTicket) {
  const context = buildContext(ticket);
  const { system, user } = buildPromptV3(context);
  const leftOrder = Object.fromEntries(
    Object.entries(ticket.order_full).filter(([key]) => !(key in selectOrder(ticket.order_full))),
  );
  return {
    sent: {
      "system prompt (rules + 2 examples)": (await count(".", system)) - baseline,
      policy: await piece(context.policy),
      customer_summary: await piece(context.customer_summary),
      order: await piece(context.order),
      reply_assist: await piece(context.reply_assist),
      message_counts: await piece(context.message_counts),
      thread: await piece(context.thread),
      "whole request (tags included)": await count(user, system),
    },
    cut: {
      [`order_full: other ${Object.keys(leftOrder).length} fields`]: await piece(formatOrder(leftOrder)),
      [`past_tickets (${ticket.past_tickets.length})`]: await piece(JSON.stringify(ticket.past_tickets)),
    },
  };
}

const cases = loadCases();
const t9330 = cases.find((c) => c.id === "t9330-smashed-compensation")!;
const mostTickets = cases.reduce((a, b) =>
  (b.input as FullTicket).past_tickets.length > (a.input as FullTicket).past_tickets.length ? b : a,
);

const handbookToc = readFileSync(resolve(ROOT, "evals/fixtures/handover-note.handbook.md"), "utf8");
console.log(`baseline message: ${baseline} tokens (subtracted from every piece)`);
console.log(`handbook table of contents: ${await piece(handbookToc)} tokens`);
for (const c of [t9330, mostTickets]) {
  console.log(`\n${c.id}`);
  console.log(JSON.stringify(await report(c.input as FullTicket), null, 2));
}
