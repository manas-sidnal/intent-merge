import { ConflictBlock } from "../../types"

export function parseConflicts(fileContent: string): ConflictBlock[] {
  const regex = /<<<<<<<[^\n]*\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>>[^\n]*/g

  const matches = [...fileContent.matchAll(regex)]

  return matches.map(match => ({
    current: match[1].trim(),
    incoming: match[2].trim(),
  }))
}