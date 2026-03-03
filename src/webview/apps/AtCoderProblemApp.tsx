import React, { useEffect, useRef, useState } from "react";
import "katex/dist/katex.min.css";
import "../styles/atcoder.css";
import "../styles/scrollbar.css";
import katex from "katex";

import { AtCoderProblem, SampleInput } from "../../lib/scrapeAtCoder";
import { Divider } from "../components/Divider";
import { Button, Dropdown, DropdownOption } from "../components";
import {
  BoxArrowUpRight,
  Play,
  ChevronRight,
  Check2,
  Circle,
  Plus,
  X,
  Copy,
} from "../components/icons";
import { SUPPORTED_LANGUAGES } from "../../lib/paizaApi";
import { TestCaseResult } from "../../types/TestCaseResult";
import { getVscode } from "../utils/getVscode";
import { formatBytes } from "../utils/formatUtils";
import { getVerdictClass } from "../utils/getVerdictClass";
import { getSummary } from "../utils/getSummary";
import { TextArea } from "../components/TextArea";

const vscode = getVscode();

const AtCoderProblemApp = () => {
  const [problem, setProblem] = useState<AtCoderProblem | null>(null);
  const [language, setLanguage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TestCaseResult[]>([]);
  const [runningIndices, setRunningIndices] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [expandedTests, setExpandedTests] = useState<Set<number>>(new Set());
  const [customInputs, setCustomInputs] = useState<SampleInput[]>([]);
  const [isCopying, setIsCopying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.command) {
        case "setProblem":
          setProblem(message.problem);
          break;

        case "loading":
          setIsLoading(message.loading);
          if (message.loading) {
            setError(null);
            setResults([]);
          }
          break;

        case "testCaseStatus":
          setRunningIndices((prev) => {
            const next = new Set(prev);
            if (message.status === "running") {
              next.add(message.index);
            } else {
              next.delete(message.index);
            }
            return next;
          });
          break;

        case "allResults":
          setResults(message.results);
          setRunningIndices(new Set());
          setExpandedTests(
            new Set(
              message.results.map((result: TestCaseResult, i: number) =>
                result.verdict !== "AC" ? i : -1,
              ),
            ),
          );
          break;

        case "error":
          setError(message.error);
          setResults([]);
          break;

        case "setLanguage":
          setLanguage(message.language);
          break;
      }
    };
    window.addEventListener("message", handleMessage);

    getProblem();
    getCurrentLanguage();

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  // katex rendering
  useEffect(() => {
    if (!containerRef.current || !problem) return;

    const renderKatex = () => {
      const varElements = containerRef.current!.querySelectorAll("var");
      varElements.forEach((element) => {
        if (element.classList.contains("katex-rendered")) return;
        const tex = element.textContent || "";
        try {
          katex.render(tex, element, {
            throwOnError: false,
            displayMode: false,
          });
          element.classList.add("katex-rendered");
        } catch (e) {
          console.error(e);
        }
      });
    };

    renderKatex();

    const observer = new MutationObserver(renderKatex);
    observer.observe(containerRef.current, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [problem]);

  const getProblem = () => {
    if (vscode) {
      vscode.postMessage({
        command: "getProblem",
      });
    }
  };

  const getCurrentLanguage = () => {
    if (vscode) {
      vscode.postMessage({
        command: "getCurrentLanguage",
      });
    }
  };

  const handleRunAll = () => {
    if (vscode) {
      vscode.postMessage({
        command: "runAll",
        language,
        customInputs,
      });
      setExpandedTests(new Set());
    }
  };

  const openLink = () => {
    if (vscode && problem?.url) {
      vscode.postMessage({
        command: "openLink",
        url: problem.url,
      });
    }
  };

  const handleCopyMd = () => {
    if (vscode && !isCopying) {
      vscode.postMessage({
        command: "copyMd",
      });
      setIsCopying(true);
      setTimeout(() => setIsCopying(false), 2000);
    }
  };

  const toggleTestExpanded = (index: number) => {
    setExpandedTests((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleAddTestCase = () => {
    setCustomInputs((prev) => [...prev, { input: "", output: "" }]);
  };

  const handleRemoveTestCase = (index: number) => {
    setCustomInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInputChange = (index: number, value: string) => {
    setCustomInputs((prev) => {
      const next = [...prev];
      next[index].input = value;
      return next;
    });
  };

  const handleOutputChange = (index: number, value: string) => {
    setCustomInputs((prev) => {
      const next = [...prev];
      next[index].output = value;
      return next;
    });
  };

  const summary = getSummary(results);

  return problem?.bodyHtml ? (
    <div className="problem-container">
      <div className="problem-header">
        <div>
          <h1 className="text-2xl font-bold">{problem.title}</h1>
          <p className="text-primary">{problem.executeConstraints}</p>
        </div>
        <div className="control-buttons">
          <Dropdown
            value={language}
            className="w-32"
            onChange={(value) => setLanguage((value as DropdownOption)!.value)}
            options={SUPPORTED_LANGUAGES.map((lang) => ({
              value: lang.id,
              label: lang.label,
            }))}
          />
          <Button onClick={handleRunAll} disabled={isLoading} className="gap-2">
            <Play />
            <span className="hidden sm:block">
              {isLoading
                ? "Running..."
                : `Run (${problem.samples?.length || 0})`}
            </span>
          </Button>
          <Button onClick={openLink}>
            <BoxArrowUpRight />
          </Button>
        </div>
      </div>

      <div className="problem-body">
        {(results.length > 0 || runningIndices.size > 0) && problem.samples && (
          <Divider />
        )}
        {/* Summary */}
        {summary && (
          <div
            className={`summary-box ${summary.allPassed ? "all-passed" : ""}`}
          >
            <div className="summary-content">
              <div className="summary-icon">
                {summary.allPassed ? (
                  <Check2 width={20} height={20} />
                ) : (
                  <Circle width={20} height={20} />
                )}
              </div>
              <div className="summary-details">
                <div className="summary-label">Test Summary</div>
                <div className="summary-stats">
                  <span className="passed-count">{summary.ac}</span>
                  <span className="divider">/</span>
                  <span className="total-count">{summary.total}</span>
                  <span className="passed-label">Passed</span>
                </div>
              </div>
            </div>
            {summary.allPassed && (
              <div className="all-ac-badge">
                <span className="badge-icon">🎉</span>
                <span>All AC!</span>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && <div className="error-message active">{error}</div>}

        {/* Test Results */}
        {(results.length > 0 || runningIndices.size > 0) && problem.samples && (
          <div className="test-cases-section">
            <h2 className="text-lg font-bold mb-2">Results</h2>
            {[...problem.samples, ...(customInputs ?? [])].map((_, index) => (
              <div key={index} className="test-case-card">
                <div
                  className={`test-case-header ${
                    expandedTests.has(index) ? "expanded" : ""
                  }`}
                  onClick={() => toggleTestExpanded(index)}
                  style={{ cursor: "pointer" }}
                >
                  <ChevronRight
                    className={`chevron-icon ${
                      expandedTests.has(index) ? "expanded" : ""
                    }`}
                  />
                  <span className="test-case-header-text">
                    Test{" "}
                    <span className="test-case-header-number">
                      #{index + 1}
                    </span>
                  </span>
                  {runningIndices.has(index) && (
                    <span className="running-badge">Running...</span>
                  )}
                  {results[index] && (
                    <span
                      className={`verdict-badge ${getVerdictClass(
                        results[index].verdict,
                      )}`}
                    >
                      {results[index].verdict || results[index].result?.result}
                    </span>
                  )}
                </div>

                {expandedTests.has(index) && (
                  <>
                    {results[index] && results[index].result && (
                      <div className="test-case-result">
                        <div className="result-stats">
                          Time:{" "}
                          {(results[index].result!.time * 1000).toFixed(0)}
                          ms | Memory:{" "}
                          {formatBytes(results[index].result!.memory)}
                        </div>
                        <div className="result-content">
                          {results[index].result!.stdout && (
                            <div className="result-output">
                              <strong>Output</strong>
                              <pre>{results[index].result!.stdout}</pre>
                            </div>
                          )}
                          {results[index].verdict === "WA" &&
                            problem.samples[index] && (
                              <div className="result-expected-output">
                                <strong>Expected Output</strong>
                                <pre>{problem.samples[index].output}</pre>
                              </div>
                            )}
                          {results[index].result!.stderr && (
                            <div className="result-stderr">
                              <strong>Stderr</strong>
                              <pre>{results[index].result!.stderr}</pre>
                            </div>
                          )}
                          {results[index].result!.build_stderr &&
                            results[index].result!.build_result !==
                              "success" && (
                              <div className="result-build-error">
                                <strong>Build Error</strong>
                                <pre>{results[index].result!.build_stderr}</pre>
                              </div>
                            )}
                        </div>
                      </div>
                    )}

                    {results[index] && results[index].error && (
                      <div className="test-case-error">
                        Error: {results[index].error}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <Divider />
        <div className="problem-body-container">
          <div
            ref={containerRef}
            dangerouslySetInnerHTML={{ __html: problem.bodyHtml }}
          />
          <Button
            appearance="icon"
            onClick={handleCopyMd}
            className="icon-button problem-copy-button"
          >
            {isCopying ? (
              <Check2 width={12} height={12} />
            ) : (
              <Copy width={12} height={12} />
            )}
          </Button>
        </div>
        <Divider />
        {customInputs.map((input, index) => (
          <>
            <section>
              <div className="custom-test-case-header">
                <h3>Input {index + 1}</h3>
                <Button
                  appearance="icon"
                  onClick={() => handleRemoveTestCase(index)}
                  className="icon-button"
                >
                  <X width={20} height={20} />
                </Button>
              </div>
              <div className="custom-test-case-input">
                <TextArea
                  value={input.input}
                  onChange={(value) => handleInputChange(index, value)}
                />
              </div>

              <h3>Output {index + 1}</h3>
              <div className="custom-test-case-input">
                <TextArea
                  value={input.output}
                  onChange={(value) => handleOutputChange(index, value)}
                />
              </div>
            </section>
            <Divider />
          </>
        ))}

        <section className="test-case-add-section">
          <div className="test-case-add-button" onClick={handleAddTestCase}>
            <Plus width={20} height={20} />
          </div>
        </section>
      </div>
    </div>
  ) : (
    <></>
  );
};

export default AtCoderProblemApp;
