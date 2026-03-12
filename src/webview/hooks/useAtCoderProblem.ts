import { useState, useEffect } from "react";

import type { WebviewApi } from "vscode-webview";
import type { AtCoderProblem } from "../../lib/scrapeAtCoder";
import type { TestCaseResult } from "../../types/TestCaseResult";

import { useVscodeMessages } from "./useVscodeMessages.ts";

export const useAtCoderProblem = (vscode: WebviewApi<unknown>) => {
  const [problem, setProblem] = useState<AtCoderProblem | null>(null);
  const [language, setLanguage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TestCaseResult[]>([]);
  const [runningIndices, setRunningIndices] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [expandedTests, setExpandedTests] = useState<Set<number>>(new Set());

  useVscodeMessages({
    setProblem: ({ problem }) => setProblem(problem),
    loading: ({ loading }) => {
      setIsLoading(loading);
      if (loading) {
        setError(null);
        setResults([]);
      }
    },
    testCaseStatus: ({ status, index }) => {
      setRunningIndices((prev) => {
        const next = new Set(prev);
        status === "running" ? next.add(index) : next.delete(index);
        return next;
      });
    },
    allResults: ({ results }) => {
      setResults(results);
      setRunningIndices(new Set());
      setExpandedTests(
        new Set(
          results.map((r: TestCaseResult, i: number) =>
            r.verdict !== "AC" ? i : -1,
          ),
        ),
      );
    },
    error: ({ error }) => {
      setError(error);
      setResults([]);
    },
    setLanguage: ({ language }) => setLanguage(language),
  });

  useEffect(() => {
    vscode.postMessage({ command: "getProblem" });
    vscode.postMessage({ command: "getCurrentLanguage" });
  }, []);

  return {
    problem,
    language,
    setLanguage,
    isLoading,
    results,
    runningIndices,
    error,
    expandedTests,
    setExpandedTests,
  };
};
