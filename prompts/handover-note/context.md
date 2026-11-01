# Handover note: context (v3)

Built by `buildContext()` in `src/context.ts`. Token counts from the
`count_tokens` endpoint on `claude-sonnet-4-5` (`scripts/count-tokens.ts`),
for ticket T-9330 unless marked.

## What is sent, in order

Stable first, changing last, the piece that decides the note at the end.

| # | Piece | Where | Tokens | Why it is in |
|---|---|---|---|---|
| 1 | Rules, fields, fallback + 2 examples | system | 1,739 | Same on every call |
| 2 | Escalation policy (handbook ch. 4) | `<policy>` | 292 | Same on every call; says who a decision waits on |
| 3 | Stored customer summary | `<customer_summary>` | 52 | Backs up or not a claim like "second time" |
| 4 | Order: 9 of 40 fields | `<order>` | 58 | Id, item, status, dates, amount, payment |
| 5 | Reply Assist output | `<reply_assist>` | 48 | needs_human and the drafted reply, never "sent" |
| 6 | Message counts, from code | `<message_counts>` | 10 | v1 and v2 both miscounted the long thread |
| 7 | Thread, every message | `<thread>` | 55 | Decides the note; goes last |
| | Tags, separators, message framing | | 78 | 2,332 − the seven pieces |
| | **Total counted** | | **2,332** | |
| | JSON schema (`output_config.format`) | | ~309 | Billed but not in `count_tokens`: 2,641 billed − 2,332 |
| | **Total billed input** | | **2,641** | Range across the 18 called cases: 2,487–2,678 |

Longest thread in the cases (long-thread-early-photo, 8 messages): 2,678 billed.

## What is left out

| Piece | Tokens | Why it is left out |
|---|---|---|
| The other 31 order fields (emails, phone, SKUs, warehouse, fraud score…) | 304 | Nothing in a note uses them; a phone number or fraud score is noise a colleague could repeat |
| `order` from the case file | 58 | A copy: the 9 fields are selected from `order_full` instead |
| Past tickets, T-9330 (2) | 153 | Other orders. Cut first: they hold old decisions ("Refund approved", A3301) that read like this ticket's |
| Past tickets, most in the cases (third-contact-wants-manager, 34) | 2,238 | Same, and this is the piece that grows to 30+ |
| The rest of the 60-page handbook | ~30,000 (estimate: 60 pages × ~500; the table of contents alone is 258) | Only chapter 4 decides who a ticket waits on; tone guides and how-tos are for replies, not notes |
| Reply Assist's own prompt | not counted | Its job is the customer reply; the note only needs its output |

Sending everything for third-contact-wants-manager would be roughly
1,739 + 292 + 39 + 365 (full order) + 33 + 43 + 2,238 + 30,000 ≈ 34,700 tokens.

## Every message, or a summary?

Every message. The longest thread in the cases is 8 messages, and the whole
request for it is 2,678 tokens, so there is nothing to save yet. A summary would drop **who said what**. "This is
the second time" is the customer's claim, and the attribution rule needs
the line to start with `customer:`. A summary turns it into a fact. It would
also drop the count of messages, which v1 and v2 already got wrong from
the full thread. That count now comes from code.

When threads grow past a few thousand tokens, the place to cut is the middle:
keep the first customer message (the original request, the photo) and the last
few, because "request-changes-midway" shows the latest request can replace the first.

## Cost

`claude-sonnet-4-5`: $3 / MTok input, $15 / MTok output (platform.claude.com pricing, 2026-11-01).

- Input: 2,641 × $3 / 1,000,000 = $0.0079
- Output: 136 tokens for T-9330 (average 123 over the 18 calls) × $15 / 1,000,000 = $0.0020
- **About $0.010 a note. 30 a day is $0.30 a day, about $9 a month.**
- Tickets with an empty thread or `needs_human: false` cost $0: code answers
  `insufficient_input` without a call (2 of the 20 cases).
- Against v2 (about 1,890 input tokens), v3 costs about $0.002 more a note,
  mostly the policy (292) and the schema.
