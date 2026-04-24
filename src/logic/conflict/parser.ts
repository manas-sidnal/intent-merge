import { ConflictBlock } from "../../types";

/** Finds the minimum indentation (common prefix) across all non-empty lines. */
function detectMinIndent(text: string): string {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) { return ''; }
  const indents = lines.map(l => l.match(/^(\s*)/)?.[1] ?? '');
  return indents.reduce((min, curr) => curr.length < min.length ? curr : min);
}

/** Strips the common base indentation from every line. */
function dedent(text: string, indent: string): string {
  if (!indent) { return text.trim(); }
  return text
    .split(/\r?\n/)
    .map(line => line.startsWith(indent) ? line.slice(indent.length) : line.trimStart())
    .join('\n')
    .trim();
}

export function parseConflicts(fileContent: string): ConflictBlock[] {
  // Use \r?\n to handle both Windows (CRLF) and Unix (LF) line endings
  const regex = /<<<<<<< [^\r\n]*\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>> [^\r\n]*/g;

  const matches = [...fileContent.matchAll(regex)];

  return matches.map(match => {
    const rawCurrent = match[1];
    const rawIncoming = match[2];
    // Compute common indent from the current block (both sides share the same indent level)
    const baseIndent = detectMinIndent(rawCurrent);
    return {
      current: dedent(rawCurrent, baseIndent),
      incoming: dedent(rawIncoming, baseIndent),
      baseIndent,
    };
  });
}