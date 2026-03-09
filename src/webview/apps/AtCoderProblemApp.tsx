import React, { useEffect, useRef, useState } from "react";
import katex from "katex";

import "katex/dist/katex.min.css";
import "../styles/atcoder.css";
import "../styles/scrollbar.css";

import type { TestCaseResult } from "../../types/TestCaseResult";
import type { ExecutionMode } from "../../types/ExecutionMode";

import { AtCoderProblem, SampleInput } from "../../lib/scrapeAtCoder";
import { SUPPORTED_LANGUAGES } from "../../lib/paizaApi";
import { getVscode } from "../utils/getVscode";
import { formatBytes } from "../utils/formatUtils";
import { getVerdictClass } from "../utils/getVerdictClass";
import { getSummary } from "../utils/getSummary";

import { Check2, Circle } from "../components/icons";
import {
  VscodeButton,
  VscodeButtonGroup,
  VscodeSingleSelect,
  VscodeOption,
  VscodeIcon,
  VscodeTextarea,
} from "@vscode-elements/react-elements";
import { Divider } from "../components/Divider";
import VscodeContextMenu from "../components/VscodeContextMenu";

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
  const [showMore, setShowMore] = useState(false);
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

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    const handleCopySelection = (e: ClipboardEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const container = document.createElement("div");
      container.appendChild(range.cloneContents());

      const varElements = container.querySelectorAll("var.katex-rendered");

      const prefix = !!vscode ? "" : "$";
      varElements.forEach((el) => {
        const tex = el.getAttribute("data-tex");
        if (tex) {
          el.textContent = prefix + tex + prefix;
        }
      });

      console.log(container.innerHTML);

      if (vscode) {
        e.preventDefault();
        vscode.postMessage({
          command: "copyMdSelection",
          html: container.innerHTML,
        });
      } else {
        e.clipboardData?.setData("text/plain", container.innerText);
        e.preventDefault();
      }
    };
    window.addEventListener("copy", handleCopySelection);

    return () => window.removeEventListener("copy", handleCopySelection);
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
          element.setAttribute("data-tex", tex);
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

  const handleRunAll = (execution?: ExecutionMode) => {
    if (vscode) {
      vscode.postMessage({
        command: "runAll",
        language,
        customInputs,
        execution,
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

  const handleChangeLanguage = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    setLanguage(target.value);
  };

  const handleAddTestCase = () => {
    setCustomInputs((prev) => [...prev, { input: "", output: "" }]);
  };

  const handleRemoveTestCase = (index: number) => {
    setCustomInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInputChange = (index: number, event: Event) => {
    const target = event.target as HTMLTextAreaElement;
    const value = target.value;
    setCustomInputs((prev) => {
      const next = [...prev];
      next[index].input = value;
      return next;
    });
  };

  const handleOutputChange = (index: number, event: Event) => {
    const target = event.target as HTMLTextAreaElement;
    const value = target.value;
    setCustomInputs((prev) => {
      const next = [...prev];
      next[index].output = value;
      return next;
    });
  };

  const summary = getSummary(results);

  return problem?.bodyHtml ? (
    <div className="problem-container">
      <div className="control-buttons">
        <VscodeSingleSelect value={language} onChange={handleChangeLanguage}>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <VscodeOption key={lang.id} value={lang.id}>
              {lang.label}
            </VscodeOption>
          ))}
        </VscodeSingleSelect>

        <div className="run-button-group">
          <VscodeButtonGroup>
            <VscodeButton
              onClick={() => handleRunAll()}
              disabled={isLoading}
              icon="debug-all"
              title="テストケースをすべて実行"
            >
              Run
            </VscodeButton>
            <VscodeButton
              disabled={isLoading}
              icon="chevron-down"
              title="その他..."
              onClick={() => setShowMore(!showMore)}
            />
          </VscodeButtonGroup>

          <VscodeContextMenu
            data={[
              { label: "Paizaで実行", value: "paiza" },
              { label: "Localで実行", value: "local" },
            ]}
            show={showMore}
            className="more-context-menu"
            onVscContextMenuSelect={(e) =>
              handleRunAll(e.detail.value as ExecutionMode)
            }
            onVisibilityChange={(visible) => {
              setShowMore(visible);
            }}
          />
        </div>
      </div>

      <div className="problem-header">
        <div>
          <h1 className="text-2xl font-bold">{problem.title}</h1>
          <p className="text-primary">{problem.executeConstraints}</p>
        </div>
        <div className="problem-header-buttons">
          <VscodeButton
            secondary
            icon={isCopying ? "check" : "copy"}
            onClick={handleCopyMd}
            title={isCopying ? "Copied!" : "Markdownでコピー"}
          />
          <VscodeButton
            secondary
            icon="link-external"
            onClick={openLink}
            title="ブラウザで問題を開く"
          />
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
                  <VscodeIcon
                    name="chevron-right"
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
        </div>
        <Divider />
        {customInputs.map((input, index) => (
          <>
            <section>
              <div className="custom-test-case-header">
                <h3>Input {index + 1}</h3>
                <VscodeIcon
                  name="close"
                  title="削除"
                  actionIcon
                  onClick={() => handleRemoveTestCase(index)}
                />
              </div>
              <div className="custom-test-case-input">
                <VscodeTextarea
                  value={input.input}
                  onChange={(e) => handleInputChange(index, e)}
                />
              </div>

              <h3>Output {index + 1}</h3>
              <div className="custom-test-case-input">
                <VscodeTextarea
                  value={input.output}
                  onChange={(e) => handleOutputChange(index, e)}
                />
              </div>
            </section>
            <Divider />
          </>
        ))}

        <section className="test-case-add-section">
          <div className="test-case-add-button" onClick={handleAddTestCase}>
            <VscodeIcon name="add" size={12}></VscodeIcon>
          </div>
        </section>
      </div>
    </div>
  ) : (
    <></>
  );
};

export default AtCoderProblemApp;
