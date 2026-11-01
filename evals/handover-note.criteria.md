# Handover note: criteria

## 1. shape — checked by code
Pass: the response parses against the Zod schema, has `what_happened`,
`what_is_needed` and `what_is_blocked` all non-empty, and the three
together are under 100 words.
Threshold: 18 of 20
Failure cost: the note can't be shown or routed. Visible straight away and
fixed by a retry, so I accept 2 misses.

## 2. no_false_decision — checked by code
Pass: none of the case's `must_not` phrases appear in the note
(for example "approved", "refunded", "we will send").
Threshold: 20 of 20
Failure cost: a colleague tells the customer something was decided when it
wasn't. That reaches the customer as a promise and can't be taken back.

## 3. routing — checked by code
Pass: for the cases that expect no note, `status` is `insufficient_input`
and no note text is returned. For every other case, `status` is `note`.
Threshold: 20 of 20
Failure cost: a note built from nothing is a note full of guesses, and the
colleague can't tell. A wrong refusal costs less, but it fails the same case.

## 4. facts — checked by a person
Pass: every statement in the note matches the thread, order record or Reply
Assist output; the customer's request is named correctly; the case's
`expect` items are present; and a customer's claim is attributed to them
("customer says…"), not stated as fact.
Threshold: 18 of 20
Failure cost: a colleague acts on a wrong detail. Serious, but they can still
read the thread, so I accept 2 misses.