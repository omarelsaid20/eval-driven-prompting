import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ROOT } from "./score.js";

export type TicketInput = {
  thread: string[];
  order: Record<string, unknown>;
  reply_assist: { needs_human: boolean; reply: string };
};

// A case after scripts/enrich-cases.ts: everything "What you could send it" lists.
export type FullTicket = TicketInput & {
  order_full: Record<string, unknown>;
  past_tickets: { id: string; order_id: string; subject: string; messages: string[] }[];
  customer_summary: string;
};

// The pieces v3 sends, in the order they go in the user message:
// stable first, changing last, the thread (which decides the note) at the end.
export type Context = {
  policy: string;
  customer_summary: string;
  order: string;
  reply_assist: string;
  message_counts: string;
  thread: string;
};

// The order fields a note can use. Everything else in the 40-field record
// (emails, SKUs, warehouse, fraud score…) is cut.
const ORDER_FIELDS = [
  "id", "customer_name", "status", "items", "total", "currency",
  "payment_status", "payments", "carrier", "tracking", "last_scan",
  "ordered_at", "expected_ship_date", "eta", "delivered_at", "ship_address",
  "return_status", "return_received_at", "refund_status", "warranty_months", "open_issue",
];

export function formatOrder(order: Record<string, unknown>): string {
  return Object.entries(order)
    .map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join("\n");
}

export function sanitizeThread(thread: string[]): string {
  return thread.map((message) => message.replaceAll("</thread>", "")).join("\n");
}

export function formatReplyAssist(replyAssist: TicketInput["reply_assist"]): string {
  return `needs_human: ${replyAssist.needs_human}\ndrafted_reply: ${replyAssist.reply}`;
}

// Counted in code: v1 and v2 both miscounted the long thread.
export function countMessages(thread: string[]): string {
  const count = (who: string) => thread.filter((message) => message.startsWith(`${who}:`)).length;
  return `customer messages: ${count("customer")}\nagent messages: ${count("agent")}`;
}

export function selectOrder(orderFull: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(ORDER_FIELDS.filter((key) => key in orderFull).map((key) => [key, orderFull[key]]));
}

// The two no-note cases code can decide without a model call. The third
// (a thread with no request in it) needs reading, so the model keeps it.
export function needsNoNote(ticket: TicketInput): boolean {
  return ticket.thread.length === 0 || !ticket.reply_assist.needs_human;
}

// Takes a ticket, returns exactly the pieces v3 sends. Past tickets and the
// rest of the handbook are never read.
export function buildContext(ticket: FullTicket): Context {
  return {
    // Read per request, so an edit to the policy reaches the next note.
    policy: readFileSync(resolve(ROOT, "evals/fixtures/handover-note.policy.md"), "utf8").trim(),
    customer_summary: ticket.customer_summary,
    order: formatOrder(selectOrder(ticket.order_full)),
    reply_assist: formatReplyAssist(ticket.reply_assist),
    message_counts: countMessages(ticket.thread),
    thread: sanitizeThread(ticket.thread),
  };
}
