import { ChatAnthropic } from "@langchain/anthropic";
import { AIMessage, type BaseMessage } from "@langchain/core/messages";
import { RunnableLambda } from "@langchain/core/runnables";

import { HandoverNote } from "./schema.js";

export const MODEL = "claude-sonnet-4-5";

// No temperature set, the same as the raw SDK calls that scored v1 and v2.
export const model = new ChatAnthropic({ model: MODEL, maxTokens: 2000 });

// "jsonSchema" sends the schema as output_config.format, like v1 and v2 did.
// includeRaw keeps the message when the Zod check fails (a note over the word
// limit): parsed comes back null instead of throwing, so the note is scored.
export const typedModel = model.withStructuredOutput(HandoverNote, {
  method: "jsonSchema",
  includeRaw: true,
});

// What one case produces, whatever chain made it.
export type Generation = {
  output: string;
  stop_reason: string | null;
  input_tokens: number;
  output_tokens: number;
};

function fromMessage(message: BaseMessage): Generation {
  const usage = AIMessage.isInstance(message) ? message.usage_metadata : undefined;
  return {
    output: message.text,
    stop_reason: (message.response_metadata as { stop_reason?: string }).stop_reason ?? null,
    input_tokens: usage?.input_tokens ?? 0,
    output_tokens: usage?.output_tokens ?? 0,
  };
}

// The scorer parses the raw text itself, so both chain endings keep only the raw message.
export const toGeneration = RunnableLambda.from(fromMessage);
export const typedToGeneration = RunnableLambda.from(({ raw }: { raw: BaseMessage }) => fromMessage(raw));
