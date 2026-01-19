import type { DetailsResponse } from "../lib/paizaApi";

/**
 * Test case result for parallel execution
 */
export interface TestCaseResult {
  index: number;
  input: string;
  expectedOutput?: string;
  result: DetailsResponse | null;
  error?: string;
  status: "pending" | "running" | "completed" | "error";
  verdict: Verdict;
}

export type Verdict = "AC" | "WA" | "RE" | "CE" | "TLE" | null;
