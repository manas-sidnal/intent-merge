import { parseConflicts } from "../logic/conflict/parser"
import { classifyConflict } from "./conflict/classifier"
import { resolveConflict } from "./ai"
import { validateMerge } from "./validation/checker"

export async function processFile(content: string) {
  const blocks = parseConflicts(content)

  const results = []

  for (const block of blocks) {
    const type = classifyConflict(block)

    const resolution = await resolveConflict(block, type)

    const issues = validateMerge(resolution.mergedCode)

    results.push({
      ...resolution,
      issues,
    })
  }

  return results
}