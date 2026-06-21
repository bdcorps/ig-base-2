/** Turn escaped newline/tab sequences from LLM JSON into real characters for display. */
export function normalizeTextNewlines(text: string): string {
  return text.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
}
