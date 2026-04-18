import type { EnvelopeTool } from "@readable-ui/core";

/**
 * ADR 0028 — `defineTools` helper.
 *
 * Preserves the literal tuple type of the `tools` array so that
 * `Tools[number]["name"]` stays a union of string literals rather than
 * widening to `string`.  Authors can pass the result directly to
 * `envelope.tools` without needing `as const satisfies EnvelopeTool[]`.
 *
 * Example:
 *   const tools = defineTools([
 *     { name: "listUsers" },
 *     { name: "createUser" },
 *   ]);
 *   // typeof tools[number]["name"] === "listUsers" | "createUser"
 */
export function defineTools<const T extends readonly EnvelopeTool[]>(tools: T): T {
  return tools;
}
