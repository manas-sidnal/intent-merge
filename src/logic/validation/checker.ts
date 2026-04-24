export function validateMerge(code: string): string[] {
  const issues: string[] = []

  if (code.includes("<<<<<<<")) {
    issues.push("Unresolved conflict markers remain")
  }

  // naive duplicate import check (good enough for hackathon)
  const importMatches = code.match(/import .* from .*/g)
  if (importMatches && new Set(importMatches).size !== importMatches.length) {
    issues.push("Possible duplicate imports")
  }

  return issues
}