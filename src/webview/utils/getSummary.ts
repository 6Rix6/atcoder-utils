import { TestCaseResult } from "../../types/TestCaseResult";

export const getSummary = (results: TestCaseResult[]) => {
  if (results.length === 0) return null;
  const ac = results.filter((r) => r.verdict === "AC").length;
  const total = results.length;
  const allPassed = ac === total && results.every((r) => r.verdict === "AC");
  return { ac, total, allPassed };
};
