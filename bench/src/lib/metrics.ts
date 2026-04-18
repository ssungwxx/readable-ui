// Shared metric calculators used by every runner.
// Spec: bench/docs/metrics.md §3.

import { countTokens } from "@anthropic-ai/tokenizer";
import { Buffer } from "node:buffer";

export interface BaseSizeMetrics {
  bytes: number;
  chars: number;
  tokens: number;
}

export function sizeMetrics(output: string): BaseSizeMetrics {
  return {
    bytes: Buffer.byteLength(output, "utf8"),
    chars: [...output].length,
    tokens: countTokens(output),
  };
}

// readable-ui actionable elements: `mcp://tool/<name>[?qs]` URLs in the output.
// Both directive forms (`::button{action=...}`) and link paragraphs (`[label](mcp://tool/...)`)
// emit the same URL, so deduping on the exact URL collapses the fallback-mode dual render
// into a single count (ADR 0012 / spec §3.1).
export function countReadableUiActions(markdown: string): number {
  const seen = new Set<string>();
  const pattern = /mcp:\/\/tool\/[^\s)"'<>{}]+/g;
  for (const match of markdown.matchAll(pattern)) {
    seen.add(match[0]);
  }
  return seen.size;
}
