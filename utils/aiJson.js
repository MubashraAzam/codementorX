// LLMs often wrap JSON in code fences or add a sentence before it. This pulls
// out the first JSON array/object and parses it, throwing if nothing valid is found.
function parseAIJson(text) {
  if (typeof text !== "string") throw new Error("AI returned no text");
  const cleaned = text.replace(/```json|```/gi, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.search(/[[{]/);
    if (start === -1) throw new Error("AI response contained no JSON");
    const open = cleaned[start];
    const close = open === "[" ? "]" : "}";
    const end = cleaned.lastIndexOf(close);
    if (end <= start) throw new Error("AI response contained no complete JSON");
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

module.exports = { parseAIJson };
