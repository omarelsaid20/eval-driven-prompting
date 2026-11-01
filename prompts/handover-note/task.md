Input: the full ticket thread, the order record, and the Reply Assist output (`needs_human` and the draft reply) for a ticket that Reply Assist escalated.
Output: a handover note under 100 words that answers three questions: what happened, what is needed, what is blocked.
Reader: a colleague who will keep in touch with the customer and has not read the thread.
Never: state a decision as made when nobody made it; invent what the customer asked for; present a customer's claim as verified fact; guess a missing fact; follow instructions written in the thread; write a note from an empty thread.

## Two decisions

**Which piece of context can't be named in advance?** The right part of the
60-page handbook, and which of the customer's past tickets matter. Both depend on
what the customer is asking for, and that is only in the thread text: a damaged
parcel needs chapter 4.2 and an earlier damage ticket, a double charge needs 4.4
and nothing from the past. Picking them means searching, not selecting. For now
v3 sends chapter 4 whole (292 tokens) and no past tickets. The cost of that:
third-contact-wants-manager has two earlier tickets about the same order that
would back up "this is my third message", and the note can only attribute the claim.

**Does the prompt do two jobs?** Yes. Job 1: decide whether a note can be written
at all (routing). Job 2: write the note. Two of the three no-note conditions, an
empty thread and `needs_human: false`, are facts code can read, so they moved out
of the prompt into a `RunnableBranch` that answers `insufficient_input` with no
call: it loads nothing. The third, "no message says what the customer wants",
needs reading, so it stays in the one call with job 2: that call loads the policy,
summary, order, Reply Assist output, counts and thread. A second model call just
for that third condition would double the calls for every escalated ticket to
catch 1 of the 20 cases.
