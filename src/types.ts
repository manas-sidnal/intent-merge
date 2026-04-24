export type ConflictBlock = {
  current: string
  incoming: string
  contextBefore?: string
  contextAfter?: string
}

export type ConflictType =
  | "logic"
  | "formatting"
  | "import"
  | "dependency"

export type ResolutionResult = {
  mergedCode: string
  explanation: string
  confidence: number
  type: ConflictType
}