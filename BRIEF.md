# Brief

A practice project from an AI engineering course (Module 3). The course's own
brief is not included here; this is a summary in my own words.

## The problem

A retailer's support team uses an AI assistant, Reply Assist, to draft replies
to customers. When the assistant can't handle a ticket, it escalates it to a
person. Today that person reads the whole thread from the top. The goal is a
short internal note instead, for a colleague, that says what happened, what is
needed and what is blocked.

The note is a separate task from Reply Assist: a different reader (a colleague,
not a customer), different rules and different ways to fail. The worst failure
is a note that states a decision nobody made.

## The steps

1. Define the task in four lines: input, output, reader, never.
2. Turn the goals into four criteria (three checked by code, one by a person),
   each with its own threshold, set before any run.
3. Write 20 eval cases: 10 representative, 5 edge, 5 adversarial, including
   cases where the right output is no note.
4. Score a deliberately weak one-line prompt (v0) to get a baseline.
5. Write the real prompt (v1): the job, the rules with an "instead" for every
   "never", untrusted text kept in its own tags, typed output with a Zod schema.
6. Add two examples (v2) and keep them only if the score moves.
7. Build the context in one function (v3): select, order, cut and shorten, with
   a token count and a cost for every piece.
8. Write down two decisions: which context can't be chosen in advance, and
   whether the prompt does two jobs.
9. Move the prompt into a system file and a user file with `{{slots}}`, and
   check the rendered text is unchanged.

Where each step lives: `prompts/handover-note/` (task, context budget, prompt
files), `evals/` (criteria, cases, score log), `src/` (code).
