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
  currentDescription: string   // what the HEAD version does
  incomingDescription: string  // what the incoming version does
  reasoning: string            // why this specific merge was chosen
  confidence: number
  type: ConflictType
}