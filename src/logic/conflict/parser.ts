import { ConflictBlock } from "../../types"

export function parseConflicts(fileContent: string): ConflictBlock[] {
  // Use \r?\n to handle both Windows (CRLF) and Unix (LF) line endings
  const regex = /<<<<<<< [^\r\n]*\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>> [^\r\n]*/g

  const matches = [...fileContent.matchAll(regex)]

  return matches.map(match => ({
    current: match[1].trim(),
    incoming: match[2].trim(),
  }))
}