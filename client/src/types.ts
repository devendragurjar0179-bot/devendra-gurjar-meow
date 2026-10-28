export type Risk = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";

export interface Assessment {
  risk: Risk;
  payloadType: string;
  evidence: string[];
  uncertainty: string;
  recommendedAction: string[];
  deterministicObservations: string[];
  disclaimer: string;
}

const VALID_RISKS: readonly string[] = ["LOW", "MEDIUM", "HIGH", "UNKNOWN"];

/** Narrow runtime check — returns true only if every required field is present. */
export function isAssessment(value: unknown): value is Assessment {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.risk === "string" &&
    VALID_RISKS.includes(v.risk) &&
    typeof v.payloadType === "string" &&
    Array.isArray(v.evidence) &&
    typeof v.uncertainty === "string" &&
    Array.isArray(v.recommendedAction) &&
    Array.isArray(v.deterministicObservations) &&
    typeof v.disclaimer === "string"
  );
}
