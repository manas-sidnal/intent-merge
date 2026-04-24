import { ConflictBlock, ConflictType } from "../../types"

export function classifyConflict(block: ConflictBlock): ConflictType {
  const text = block.current + block.incoming

  if (/import|require/.test(text)) return "import"
  if (/^\s*$/.test(block.current) || /^\s*$/.test(block.incoming)) return "formatting"
  if (/function|=>|if|for/.test(text)) return "logic"

  return "dependency"
}