import { ConflictBlock, ConflictType, ResolutionResult } from "../types"
import Groq from "groq-sdk"
import * as dotenv from "dotenv"

dotenv.config()

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function resolveConflict(
  block: ConflictBlock,
  type: ConflictType
): Promise<ResolutionResult> {

  const prompt = `
You are an expert software engineer resolving a Git merge conflict.

Conflict Type: ${type}

CURRENT VERSION:
${block.current}

INCOMING VERSION:
${block.incoming}

Instructions:
- Merge both intelligently
- Preserve important logic
- Avoid duplication
- Return clean, working code

Respond ONLY in JSON:
{
  "mergedCode": "...",
  "explanation": "...",
  "confidence": 0.0-1.0
}
`

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant", // fast + strong
      messages: [
        { role: "system", content: "You are a senior software engineer." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
    })

    const text = response.choices[0]?.message?.content || ""

    // 🧠 Important: clean JSON (LLMs sometimes add junk)
    const jsonMatch = text.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      throw new Error("Invalid JSON from model")
    }

    const parsed = JSON.parse(jsonMatch[0])

    return {
      mergedCode: parsed.mergedCode || "",
      explanation: parsed.explanation || "No explanation provided",
      confidence: parsed.confidence || 0.5,
      type
    }

  } catch (err) {
  console.error("❌ GROQ ERROR:", err)

  return {
    mergedCode: block.incoming,
    explanation: "Fallback: defaulted to incoming version due to AI error",
    confidence: 0.4,
    type
  }
}
}