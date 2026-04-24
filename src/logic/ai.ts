import { ConflictBlock, ConflictType, ResolutionResult } from "../types";
import Groq from "groq-sdk";
import * as dotenv from "dotenv";
import * as path from "path";
import * as vscode from "vscode";

// __dirname inside dist/ → go up two levels to reach the extension root where .env lives
dotenv.config({ path: path.resolve(__dirname, "../.env") });

function getGroqClient() {
  // Priority: process.env (from .env) → VS Code setting
  const apiKey =
    process.env.GROQ_API_KEY ||
    vscode.workspace.getConfiguration("intent-merge").get<string>("groqApiKey") ||
    "";

  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY not found. Add it to your .env file or set intent-merge.groqApiKey in VS Code settings."
    );
  }

  return new Groq({ apiKey });
}

export async function resolveConflict(
  block: ConflictBlock,
  type: ConflictType
): Promise<ResolutionResult> {

  const prompt = `
You are an expert software engineer resolving a Git merge conflict.

Conflict Type: ${type}

CURRENT VERSION (HEAD):
${block.current}

INCOMING VERSION:
${block.incoming}

Instructions:
- Merge both intelligently
- Preserve important logic
- Avoid duplication
- Return clean, working code

Respond ONLY in this exact JSON format (no markdown, no extra text):
{
  "mergedCode": "the final merged code",
  "currentDescription": "one sentence: what the HEAD version does or represents",
  "incomingDescription": "one sentence: what the incoming version does or represents",
  "reasoning": "2-3 sentences explaining why you merged it this way",
  "confidence": 0.0-1.0
}
`;

  try {
    const groq = getGroqClient();
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are a senior software engineer." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 1024,
    });

    const text = response.choices[0]?.message?.content || "";

    // 🧠 Important: clean JSON (LLMs sometimes add junk)
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("Invalid JSON from model");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      mergedCode: parsed.mergedCode || "",
      currentDescription: parsed.currentDescription || "No description available",
      incomingDescription: parsed.incomingDescription || "No description available",
      reasoning: parsed.reasoning || "No reasoning provided",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      type
    };

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ GROQ ERROR:", message);

    return {
      mergedCode: block.incoming,
      currentDescription: "Could not analyze — AI error",
      incomingDescription: "Could not analyze — AI error",
      reasoning: `AI error: ${message}`,
      confidence: 0.0,
      type
    };
  }
}