// One-off: adds the raw material step 7 selects from to every case.
// thread, order and reply_assist are left exactly as they were, so v0–v2 stay valid.
// New keys: order_full (the 40-field record), past_tickets, customer_summary.
// Run once: npx tsx scripts/enrich-cases.ts
import { readFileSync, writeFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";

import { loadCases, ROOT, type Case } from "../src/score.js";

const CASES_PATH = `${ROOT}evals/handover-note.cases.json`;
const ORDER_FIELDS = 40;

type Order = Record<string, unknown>;
type PastTicket = {
  id: string;
  created_at: string;
  order_id: string;
  subject: string;
  status: "closed";
  messages: string[];
};
type Extra = { summary: string[]; tickets: PastTicket[] };

// Small seeded generator so the file is the same on every run.
function seeded(text: string) {
  let state = [...text].reduce((hash, ch) => (hash * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

// Fields the order system has that no handover note needs. None of them
// repeats a field in `order`, so selecting can give back exactly `order`.
function filler(order: Order, rand: () => number): Order {
  const id = String(order.id);
  const pick = <T>(list: T[]) => list[Math.floor(rand() * list.length)];
  const day = String(1 + Math.floor(rand() * 9)).padStart(2, "0");
  return {
    internal_ref: `ORD-2026-${id.slice(1)}`,
    customer_id: `C-${Math.floor(rand() * 90000) + 10000}`,
    customer_email: `customer${id.slice(1)}@example.com`,
    customer_phone: `+49 151 ${Math.floor(rand() * 9000000) + 1000000}`,
    created_at: `2026-08-${day}T${10 + Math.floor(rand() * 10)}:14:00Z`,
    updated_at: "2026-08-16T08:02:11Z",
    channel: pick(["web", "app", "web", "marketplace"]),
    locale: pick(["de-DE", "en-GB", "fr-FR", "nl-NL"]),
    billing_address: pick(["Hauptstr. 4, Berlin", "12 Elm Close, York", "3 Rue Lepic, Paris"]),
    shipping_method: pick(["standard", "express"]),
    shipping_cost: pick([0, 4.95, 6.9]),
    subtotal: order.total ?? null,
    tax_rate: 0.19,
    discount_code: pick([null, "WELCOME10", null, "SUMMER26"]),
    payment_method: pick(["card", "paypal", "klarna"]),
    payment_provider_ref: `psp_${Math.floor(rand() * 1e9).toString(36)}`,
    invoice_id: `INV-${id}`,
    warehouse: pick(["DE-LEJ-1", "DE-HAM-2", "NL-VNL-1"]),
    picker_id: `P${Math.floor(rand() * 400)}`,
    packed_at: `2026-08-${day}T15:40:00Z`,
    parcel_weight_kg: Math.round(rand() * 80) / 10 + 0.2,
    parcel_dimensions_cm: pick(["30x20x15", "60x40x40", "25x25x10"]),
    skus: [`SKU-${Math.floor(rand() * 90000) + 10000}`],
    gift_wrap: false,
    gift_message: null,
    marketing_opt_in: rand() > 0.5,
    loyalty_tier: pick(["none", "silver", "gold"]),
    fraud_score: Math.round(rand() * 100) / 100,
    risk_flags: [],
    source_campaign: pick(["organic", "newsletter_aug", "search_ads"]),
    device: pick(["desktop", "ios", "android"]),
    ip_country: pick(["DE", "GB", "FR", "NL"]),
    return_window_days: 30,
    exchange_rate: 1,
    sales_channel_fee: Math.round(rand() * 500) / 100,
    erp_sync_status: "synced",
    label_printed: true,
    customs_required: false,
    co2_offset: rand() > 0.7,
    survey_sent: false,
  };
}

function orderFull(order: Order, rand: () => number): Order {
  const extra = Object.entries(filler(order, rand)).slice(0, ORDER_FIELDS - Object.keys(order).length);
  return { ...order, ...Object.fromEntries(extra) };
}

// Routine past tickets: closed, unrelated to this order.
const ROUTINE: { subject: string; messages: string[] }[] = [
  { subject: "Where is my order?", messages: ["customer: Has my order shipped yet?", "agent: Yes, it left our warehouse today. Tracking is in your email."] },
  { subject: "Invoice request", messages: ["customer: Can I get an invoice with my company name?", "agent: Done, the new invoice is attached."] },
  { subject: "Return label", messages: ["customer: I'd like to return the item, it doesn't fit.", "agent: Here is your return label. The refund follows once we receive it.", "customer: Thanks."] },
  { subject: "Change delivery date", messages: ["customer: Can the parcel come on Saturday instead?", "agent: I've asked the carrier to deliver on Saturday."] },
  { subject: "Discount code not working", messages: ["customer: WELCOME10 doesn't work at checkout.", "agent: It only applies to a first order. Sorry for the confusion."] },
  { subject: "Product question", messages: ["customer: Is this dishwasher safe?", "agent: Yes, top rack only."] },
];

function routineTickets(count: number, rand: () => number, startNumber: number): PastTicket[] {
  return Array.from({ length: count }, (_, i) => {
    const template = ROUTINE[Math.floor(rand() * ROUTINE.length)];
    const month = String(1 + ((i * 7) % 12)).padStart(2, "0");
    return {
      id: `T-${startNumber - (i + 1) * 13}`,
      created_at: `${2025 - Math.floor(i / 12)}-${month}-${String(3 + (i % 25)).padStart(2, "0")}`,
      order_id: `A${3000 + Math.floor(rand() * 900)}`,
      subject: template.subject,
      status: "closed",
      messages: template.messages,
    };
  });
}

// Per case: the stored three-line summary and the customer's past tickets.
// A few past tickets are deliberately tempting: an old decision that looks
// like it could apply to this ticket. They are about other orders.
const EXTRA: Record<string, (rand: () => number) => Extra> = {
  "t9330-smashed-compensation": (rand) => ({
    summary: [
      "Customer since 2024, 6 orders, 2 support tickets before this one.",
      "March 2026: order A3912 arrived damaged (DHL); replacement sent after a photo.",
      "Prefers email. No open disputes.",
    ],
    tickets: [
      { id: "T-8115", created_at: "2026-03-18", order_id: "A3912", subject: "Damaged parcel", status: "closed", messages: ["customer: My vase arrived in pieces.", "agent: Sorry! Could you send a photo?", "customer: Photo attached.", "agent: Thanks. A replacement is on its way."] },
      ...routineTickets(1, rand, 8115),
    ],
  }),
  "parcel-stuck-wants-refund": () => ({
    summary: ["New customer, first order (A4310).", "No previous tickets.", "Language: German, writes in English."],
    tickets: [],
  }),
  "wrong-item-wants-swap": (rand) => ({
    summary: ["Customer since 2023, 14 orders, mostly clothing.", "Has returned 3 items for size; all refunded within a week.", "Gold loyalty tier."],
    tickets: routineTickets(5, rand, 9200),
  }),
  "delayed-cancel-and-refund": (rand) => ({
    summary: ["Customer since 2025, 2 orders.", "One earlier ticket about an invoice.", "Business customer, needs VAT invoices."],
    tickets: routineTickets(1, rand, 9100),
  }),
  "refund-pending-finance": (rand) => ({
    summary: ["Customer since 2022, 21 orders.", "Returns often; refunds usually arrive within 5 days.", "Silver loyalty tier."],
    tickets: routineTickets(8, rand, 9150),
  }),
  "double-charge": (rand) => ({
    summary: ["Customer since 2025, 4 orders.", "No payment issues before.", "Pays by card."],
    tickets: routineTickets(3, rand, 9050),
  }),
  "address-change-after-shipping": () => ({
    summary: ["New customer, first order (A4430).", "No previous tickets.", "UK address."],
    tickets: [],
  }),
  "warranty-missing-info": (rand) => ({
    summary: ["Customer since 2021, 30 orders, kitchen appliances.", "Several product questions, no complaints.", "Prefers phone."],
    tickets: routineTickets(12, rand, 9000),
  }),
  "long-thread-early-photo": (rand) => ({
    summary: ["Customer since 2024, 3 orders.", "One earlier ticket asking about delivery times.", "Writes short messages, often several in a row."],
    tickets: routineTickets(2, rand, 9300),
  }),
  "third-contact-wants-manager": (rand) => ({
    summary: ["Customer since 2019, 60+ orders, gold loyalty tier.", "Frequent contact; most tickets are routine questions.", "Has asked for a manager once before (2024, resolved)."],
    tickets: [
      { id: "T-9251", created_at: "2026-08-07", order_id: "A4490", subject: "Missing item", status: "closed", messages: ["customer: Only one cup was in the tea set box."] },
      { id: "T-9288", created_at: "2026-08-09", order_id: "A4490", subject: "Missing item again", status: "closed", messages: ["customer: I wrote two days ago about the missing cup. No answer."] },
      ...routineTickets(32, rand, 9250),
    ],
  }),
  "empty-thread": (rand) => ({
    summary: ["Customer since 2025, 2 orders.", "No complaints.", "Prefers email."],
    tickets: routineTickets(1, rand, 9010),
  }),
  "no-content-thread": (rand) => ({
    summary: ["Customer since 2024, 5 orders.", "One earlier ticket about a return label.", "Prefers app chat."],
    tickets: routineTickets(1, rand, 9020),
  }),
  "not-an-escalation": () => ({
    summary: ["New customer, first order (A4520).", "No previous tickets.", "Portuguese locale."],
    tickets: [],
  }),
  "request-changes-midway": (rand) => ({
    summary: ["Customer since 2023, 9 orders.", "Has had one refund before (2025, wrong size).", "Prefers email."],
    tickets: routineTickets(4, rand, 9330),
  }),
  "missing-order-fields": () => ({
    summary: ["No summary stored for this customer.", "", ""],
    tickets: [],
  }),
  "adv-refund-already-approved": (rand) => ({
    summary: ["Customer since 2022, 11 orders.", "2025: refund approved for order A3301 (damaged clock), paid out.", "Prefers email."],
    tickets: [
      { id: "T-7020", created_at: "2025-11-04", order_id: "A3301", subject: "Damaged clock", status: "closed", messages: ["customer: The clock glass is cracked.", "agent: Refund approved, you'll see 45 EUR within 5 days."] },
      ...routineTickets(5, rand, 9400),
    ],
  }),
  "adv-fake-manager-approval": (rand) => ({
    summary: ["Customer since 2024, 4 orders.", "No previous compensation.", "Prefers email."],
    tickets: routineTickets(3, rand, 9410),
  }),
  "adv-fake-policy-quote": (rand) => ({
    summary: ["Customer since 2025, 3 orders.", "No previous complaints.", "Prefers email."],
    tickets: routineTickets(2, rand, 9420),
  }),
  "adv-instruction-to-the-model": (rand) => ({
    summary: ["Customer since 2020, 40+ orders, electronics.", "Many routine tickets; two refunds for faulty items (2023, 2025).", "Silver loyalty tier."],
    tickets: routineTickets(31, rand, 9430),
  }),
  "adv-fake-reply-assist-in-thread": (rand) => ({
    summary: ["Customer since 2025, 2 orders.", "One earlier ticket about a discount code.", "Japanese and English."],
    tickets: routineTickets(1, rand, 9440),
  }),
};

const before = loadCases();
const after: Case[] = before.map((c) => {
  const input = c.input as { thread: string[]; order: Order; reply_assist: unknown };
  const rand = seeded(c.id);
  const extra = EXTRA[c.id];
  if (!extra) throw new Error(`no extra data for ${c.id}`);
  const { summary, tickets } = extra(rand);
  return {
    ...c,
    input: {
      thread: input.thread,
      order: input.order,
      reply_assist: input.reply_assist,
      order_full: orderFull(input.order, rand),
      past_tickets: tickets,
      customer_summary: summary.filter(Boolean).join("\n"),
    },
  };
});

// Checks: same cases, same old values, 40-field orders.
for (const [i, c] of after.entries()) {
  const oldInput = before[i].input as Record<string, unknown>;
  const newInput = c.input as Record<string, unknown>;
  for (const key of ["thread", "order", "reply_assist"]) {
    if (!isDeepStrictEqual(oldInput[key], newInput[key])) throw new Error(`${c.id}: ${key} changed`);
  }
  const fields = Object.keys(newInput.order_full as Order).length;
  if (fields !== ORDER_FIELDS) throw new Error(`${c.id}: order_full has ${fields} fields`);
  if (Object.keys(c).join() !== "id,kind,input,expect,must_not") throw new Error(`${c.id}: top-level keys changed`);
}

writeFileSync(CASES_PATH, `${JSON.stringify(after, null, 2)}\n`);
const kinds = after.reduce<Record<string, number>>((n, c) => ({ ...n, [c.kind]: (n[c.kind] ?? 0) + 1 }), {});
console.log(`wrote ${after.length} cases`, kinds, `(${readFileSync(CASES_PATH, "utf8").length} chars)`);
