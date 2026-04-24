import { parseConflicts } from "../logic/conflict/parser"
import { classifyConflict } from "./conflict/classifier"
import { resolveConflict } from "./ai"
import { validateMerge } from "./validation/checker"
import { assessRisk } from "./risk"

export async function processFile(content: string) {
  const blocks = parseConflicts(content)

  const results = []

  for (const block of blocks) {
    const type = classifyConflict(block)

    const resolution = await resolveConflict(block, type)

    const issues = validateMerge(resolution.mergedCode)

    // Lightweight heuristic — no extra AI call
    const riskData = assessRisk(block.current, block.incoming, type)

    results.push({
      ...resolution,
      issues,
      _current: block.current,
      _incoming: block.incoming,
      _risk: riskData.risk,
      _recommendedAction: riskData.recommendedAction,
    })
  }

  return results
}