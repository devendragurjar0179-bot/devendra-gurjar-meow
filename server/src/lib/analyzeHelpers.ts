/**
 * analyzeHelpers.ts
 * Pure helper utilities for the /api/analyze route.
 * No Express, no network — keeps logic easily unit-testable.
 */

export const VALID_RISKS = ["LOW", "MEDIUM", "HIGH", "UNKNOWN"] as const;
export type RiskLevel = (typeof VALID_RISKS)[number];

/** Max length of any single string returned inside an array field. */
const MAX_ITEM_LENGTH = 400;
/** Max number of items returned in any array field. */
const MAX_ITEMS = 8;

/**
 * Extract the first JSON object from free-form model text.
 * Handles markdown code fences (```json … ```) and leading/trailing prose.
 * Returns null if no valid object can be found.
 */
export function parseJsonObject(text: string): Record<string, unknown> | null {
  // Strip markdown fences if present (``` or ```json)
  const stripped = text.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/im, "");

  const start = stripped.indexOf("{");
  if (start < 0) return null;

  // Walk forward from the first '{' counting depth to find the matching '}'.
  // This ensures we always extract the FIRST complete object, never a later
  // one appended by adversarial model output (e.g., "... ignore {\"risk\":\"HIGH\"}").
  let depth = 0;
  let end = -1;
  for (let i = start; i < stripped.length; i++) {
    if (stripped[i] === "{") depth++;
    else if (stripped[i] === "}") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end < 0) return null;

  try {
    const parsed: unknown = JSON.parse(stripped.slice(start, end + 1));
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * Coerce an unknown value into a bounded string array.
 * Non-string items are dropped. Each string is capped at MAX_ITEM_LENGTH.
 * Falls back to `fallback` if the value is not an array or yields no strings.
 */
export function stringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const result = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.slice(0, MAX_ITEM_LENGTH))
    .slice(0, MAX_ITEMS);
  return result.length > 0 ? result : fallback;
}

/**
 * Normalise a raw risk string from model output.
 * Anything not in VALID_RISKS is coerced to "UNKNOWN".
 */
export function normaliseRisk(raw: unknown): RiskLevel {
  const upper = String(raw ?? "").toUpperCase().trim();
  return (VALID_RISKS as readonly string[]).includes(upper)
    ? (upper as RiskLevel)
    : "UNKNOWN";
}

/** Standard disclaimer appended to every response. */
export const DISCLAIMER =
  "Preliminary text-based assessment only. No website was visited or live reputation checked. " +
  "A LOW rating does not confirm the destination — always verify through an official channel.";
