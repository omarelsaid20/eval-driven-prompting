import { z } from "zod";

export const WORD_LIMIT = 100;

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

// A note has all three fields filled. insufficient_input has all three null.
export const HandoverNote = z
  .object({
    status: z.enum(["note", "insufficient_input"]),
    what_happened: z.string().nullable(),
    what_is_needed: z.string().nullable(),
    what_is_blocked: z.string().nullable(),
  })
  .superRefine((note, ctx) => {
    const fields = [note.what_happened, note.what_is_needed, note.what_is_blocked];
    if (note.status === "insufficient_input") {
      if (fields.some((field) => field !== null)) {
        ctx.addIssue({ code: "custom", message: "insufficient_input must have no note text" });
      }
      return;
    }
    if (fields.some((field) => !field?.trim())) {
      ctx.addIssue({ code: "custom", message: "a note needs all three fields filled" });
      return;
    }
    const words = fields.reduce((total, field) => total + wordCount(field ?? ""), 0);
    if (words >= WORD_LIMIT) {
      ctx.addIssue({ code: "custom", message: `must be under ${WORD_LIMIT} words, got ${words}` });
    }
  });

export type HandoverNote = z.infer<typeof HandoverNote>;
