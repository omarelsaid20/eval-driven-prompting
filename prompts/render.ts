import { PromptTemplate } from "@langchain/core/prompts";

// A slot is {{name}}: letters, digits or underscores, no spaces inside the braces.
const SLOT = /\{\{(\w+)\}\}/g;

// Fills every {{name}} in template from slots. LangChain's mustache does the
// filling (it does not HTML-escape), but mustache turns a missing value into an
// empty string, so every slot is checked first and a missing one throws.
export async function render(template: string, slots: Record<string, string>): Promise<string> {
  for (const [, name] of template.matchAll(SLOT)) {
    if (!(name in slots)) throw new Error(`missing prompt slot: ${name}`);
  }
  return PromptTemplate.fromTemplate(template, { templateFormat: "mustache" }).format(slots);
}
