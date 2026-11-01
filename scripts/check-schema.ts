// The Zod schema rejects a note over the word limit. Run: npx tsx scripts/check-schema.ts
import { HandoverNote, WORD_LIMIT } from "../src/schema.js";

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");

const tooLong = {
  status: "note",
  what_happened: words(50),
  what_is_needed: words(40),
  what_is_blocked: words(30),
};
const justUnder = { ...tooLong, what_is_blocked: words(WORD_LIMIT - 91) };

for (const [name, note] of Object.entries({ "120 words": tooLong, [`${WORD_LIMIT - 1} words`]: justUnder })) {
  const result = HandoverNote.safeParse(note);
  console.log(`${name}: ${result.success ? "accepted" : `rejected (${result.error.issues[0].message})`}`);
}
