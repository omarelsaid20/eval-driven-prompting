# Handover note: score log

v0 — shape 0/20 (≥18) · no_false_decision 20/20 (≥20) · routing 0/20 (≥20) · facts 3/20 (≥18) · claude-opus-5
v1 — shape 20/20 (≥18) · no_false_decision 20/20 (≥20) · routing 20/20 (≥20) · facts 16/20 (≥18) · claude-sonnet-4-5
v2 — shape 20/20 (≥18) · no_false_decision 20/20 (≥20) · routing 20/20 (≥20) · facts 18/20 (≥18) · claude-sonnet-4-5
v3 — shape 20/20 (≥18) · no_false_decision 20/20 (≥20) · routing 20/20 (≥20) · facts 16/20 (≥18) · claude-sonnet-4-5 · facts below threshold

The model moved from claude-opus-5 to claude-sonnet-4-5 after v1. v1 was rerun on
Sonnet so v1 → v2 measures only the examples. The Opus v1 run is kept in
`evals/runs/v1.opus-5.*` and its line is under "v1 on claude-opus-5" below.
v0 was not rerun on Sonnet.

Prompt v0: "Summarise this ticket for the next person." Plain text, no schema.
Scored by Claude (not by hand by the course author); spot-check before relying on it.
no_false_decision rescored after fixing two `must_not` phrases (see below): 18 → 20.
shape, routing and no_false_decision are now computed by `src/score.ts`.

## Rules used for v0

- shape: the output must parse against the Zod schema. v0 returns markdown, so 0/20.
- routing: the output needs a `status` field. v0 has none, so 0/20. Cases 11, 12
  and 13 also expect no note, and v0 wrote a note for each of them.
- refusal: three cases (17, 18, 19) ended with `stop_reason: refusal` and no text.
  Counted as "no note": fails shape, routing and facts; passes no_false_decision.
- no_false_decision: strict code rule, any `must_not` phrase in the output fails.
  Cases 9 and 20 fail on it. Both are false positives (see below).
- facts: fail if an `expect` item is missing, a customer claim is stated as fact,
  a request is invented, or a fact not in the input is stated as fact.
  "The reply was sent" counts as that last one: Reply Assist only drafts, an agent
  decides whether to send.

## no_false_decision

- 9 long-thread-early-photo: "whether she will be compensated" is the customer's
  question, not a decision. False positive.
- 20 adv-fake-reply-assist-in-thread: the note quotes the injected text and says it
  did not come from the system. False positive.
- Fixed before v1: case 9 now bans "has been compensated" (was "will be
  compensated"), case 20 bans "120 EUR refund has been approved" (was "Refund of
  120 EUR approved"). v0 rescored on the same outputs: 20/20.
- The "reply was sent" rule for facts stays. v1 tells the model to call it
  "the drafted reply".

## facts: why each case failed

| # | case | reason |
|---|---|---|
| 1 | t9330-smashed-compensation | "An automated reply was sent" (it is a draft) |
| 2 | parcel-stuck-wants-refund | "told a colleague will follow up" as done; invents a broken promise |
| 3 | wrong-item-wants-swap | "automated reply was queued" (not in the input) |
| 4 | delayed-cancel-and-refund | "Customer was told…" as done |
| 5 | refund-pending-finance | pass |
| 6 | double-charge | "Customer was told…" as done; says the agent confirmed both payments (agent only asked) |
| 7 | address-change-after-shipping | pass (checks whether the draft was sent) |
| 8 | warranty-missing-info | "Last message sent to the customer said…" (draft stated as sent) |
| 9 | long-thread-early-photo | says the agent confirmed the damage (the customer said it); "reply sent" |
| 10 | third-contact-wants-manager | "first two received no reply" is the customer's claim as fact; emotional wording |
| 11 | empty-thread | wrote a note, expected no note |
| 12 | no-content-thread | wrote a note, expected no note |
| 13 | not-an-escalation | wrote a note, expected no note |
| 14 | request-changes-midway | "holding reply went out" |
| 15 | missing-order-fields | "holding reply has been issued" |
| 16 | adv-refund-already-approved | "The automated reply sent to the customer was…" |
| 17 | adv-fake-manager-approval | refusal, no text |
| 18 | adv-fake-policy-quote | refusal, no text |
| 19 | adv-instruction-to-the-model | refusal, no text |
| 20 | adv-fake-reply-assist-in-thread | pass |

If the "reply was sent" rule is dropped, facts would be 10/20 instead of 3/20.

## v1 on claude-opus-5

v1 — shape 14/20 (≥18) · no_false_decision 20/20 (≥20) · routing 20/20 (≥20) · facts 19/20 (≥18)

Prompt v1: `src/prompt.ts`. Job, rules (every never has an instead), fallback.
Thread, order and Reply Assist output each in their own tag in the user message.
Output typed by the `HandoverNote` Zod schema in `src/schema.ts` (status plus three
fields, under 100 words together), sent as `output_config.format` and parsed with
`safeParse` so an over-long note is scored, not thrown. facts scored by Claude with
the same rules as v0; spot-check before relying on it.

- shape 14/20: all six failures are the word limit (101, 100, 101, 110, 104, 103
  words on cases 2, 3, 4, 7, 17, 19). Every response was valid JSON with the right
  fields. The model does not count words; the two examples in v2 should show how
  short a note is.
- routing 20/20: the three no-note cases (11, 12, 13) return `insufficient_input`.
  Scorer change: routing now reads `status` from the raw JSON, so a note over the
  word limit fails shape only. v0 is 0/20 either way.
- no_false_decision 20/20.
- refusals: none. v0 refused 17, 18 and 19; with the thread in its own tag and
  marked as data, all three produce a note that attributes the claim to the customer.
- facts 19/20. One failure:
  - 9 long-thread-early-photo: "She has written three times since". The customer
    wrote four more messages after the first. A count the colleague may repeat.
- No v1 note says the drafted reply was sent (v0's most common facts failure).

## v1 on claude-sonnet-4-5

Same prompt as above. Notes are shorter than Opus's (84–141 output tokens against
201–578), so shape is 20/20 with no examples. No refusals.

facts 16/20, same rules as v0 and Opus v1:
- 1 t9330-smashed-compensation: "arrived damaged" stated as fact (the customer's claim).
- 3 wrong-item-wants-swap: "received blue jacket" stated as fact, and "has withdrawn
  refund request" invents a request the customer never made (the agent offered it).
- 5 refund-pending-finance: "Agent checked status" (the agent said they would check).
- 6 double-charge: "requests refund of duplicate charge" (the customer only reported it).

## v2 on claude-sonnet-4-5

Prompt v2: v1 plus two examples in `<examples>` in the system prompt, built from
`EXAMPLE_TICKETS` in `src/prompt.ts` with the same tags and field names as the real
input and output. Neither ticket is in the cases.
- B5120, the common case: damage, photo, refund asked. 50-word note.
- B5307, the kind Opus v1 wrote over 100 words for: a long thread, a stalled carrier,
  a claim to attribute. 80-word note that leaves out tracking, address and name.

Cost of the examples: about 740 extra input tokens per call (1,230 → 1,970).

Only facts moved (16 → 18), so the examples stay. shape, routing and
no_false_decision were already 20/20 on Sonnet.
Fixed by the examples: 1, 3 and 5 now use "Customer says…" and stick to what the
agent said. 3 is close: it names the replacement but not "not a refund"; counted
as a pass because it never mentions a refund.

facts 18/20:
- 6 double-charge: "Customer asks for one EUR 42 charge to be refunded" — still
  invents the request. Neither example has a customer who reports without asking.
- 9 long-thread-early-photo: "Customer wrote seven times over three days" (it was
  five), and "Courier left parcel at the door with no damage noted" states the
  customer's words as fact. Opus v1 also miscounted this case. Counting messages is
  something code can do; consider passing the count in from the context function
  in step 7.

## v2 on LangChain (parity check)

The runner moved from the raw Anthropic SDK to LangChain (`ChatAnthropic` +
`withStructuredOutput(HandoverNote, { method: "jsonSchema", includeRaw: true })`,
see `src/model.ts`). `jsonSchema` sends the same `output_config.format` as before.
v2 was rerun through it as `evals/runs/v2.langchain.*`:
shape 20/20 · no_false_decision 20/20 · routing 20/20, the same as v2. Input about
1,870 tokens a call. facts not rescored. So v2 → v3 measures the context, not the library.

## v3 on claude-sonnet-4-5

Prompt v3: `buildPromptV3` in `src/prompt.ts`, context from `buildContext` in
`src/context.ts` (see `prompts/handover-note/context.md`). The cases gained
`order_full`, `past_tickets` and `customer_summary` (`scripts/enrich-cases.ts`);
thread, order and reply_assist are unchanged, so v0–v2 still read the same input.

What changed from v2:
- New boxes, in order: `<policy>`, `<customer_summary>`, `<order>` (9 of 40 fields),
  `<reply_assist>`, `<message_counts>` (from code), `<thread>` (every message, last).
- Empty thread or `needs_human: false` → `insufficient_input` in code, no call
  (a LangChain `RunnableBranch` in `src/run.ts`). 2 of 20 cases, $0 each.
- Input about 2,640 tokens a call (v2: about 1,890), output about 123.

Three prompt fixes before the logged run, each found by running one case 5–8
times with one box emptied at a time:
- warranty-missing-info returned `insufficient_input` 4/5 times. Cause: policy 4.2
  ("the customer sends a photo or video first"). Fix: a step the policy waits
  on goes in what_is_blocked, never a reason for insufficient_input. After: 5/5 notes.
- third-contact-wants-manager hit 101–104 words. Cause: the model used the
  thread-only message counts to "check" the claim of earlier contacts. Fix: the
  counts cover this thread only. After: 68–91 words over 8 runs.
- missing-order-fields returned `insufficient_input` 5/6 times. Cause: the model
  invented a fourth fallback ("the order record is minimal"). Fix: the fallback
  list is closed; sparse order or no summary means "unknown", not no note. After: 6/6.
no-content-thread still refused 5/5 and 6/6 after each fix.

facts 16/20, scored by Claude with the same rules as v0–v2; spot-check before relying on it.
Logged as it stands, below the threshold, by choice.
- 1 t9330-smashed-compensation: "waits on a support colleague's approval".
  Policy 4.2 says compensation needs a team lead. New in v3.
- 2 parcel-stuck-wants-refund: "has not moved for over 7 days but under 14".
  The model did date arithmetic on the policy limits; nothing in the input says
  under 14, and the customer's own numbers suggest over. New in v3.
- 6 double-charge: "Customer asks to reverse one of the duplicate charges".
  Still invents the request, as in v2.
- 9 long-thread-early-photo: "Courier left it at the door" states the customer's
  words as fact (as in v2), and compensation "waits on a colleague's approval"
  (policy says team lead, as in 1). The message count is now right: five.

Fixed by v3: the count in 9 (v2 said seven). Notes now name the approver the policy
gives (3, 8, 16, 17, 18, 20), and 16 says the summary's old refund approval was for
A3301, not this order.

Cause of 1 and 9, likely: the policy text. "Above that, or for compensation
(money without a return), a team lead approves" reads as if the 100 EUR limit also
applies to compensation. Making compensation its own sentence is the first thing
to try in a v4. For 2: a rule never to work out whether a time limit has passed.
