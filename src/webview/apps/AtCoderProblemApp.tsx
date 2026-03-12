import React, { useEffect, useState } from "react";

import type { TestCaseResult } from "../../types/TestCaseResult";
import type { ExecutionMode } from "../../types/ExecutionMode";

import { AtCoderProblem, SampleInput } from "../../lib/scrapeAtCoder";
import { SUPPORTED_LANGUAGES } from "../../lib/paizaApi";
import { getVscode } from "../utils/getVscode";
import { getSummary } from "../utils/getSummary";

import {
  VscodeButton,
  VscodeButtonGroup,
  VscodeSingleSelect,
  VscodeOption,
  VscodeIcon,
  VscodeTextarea,
} from "@vscode-elements/react-elements";
import { Divider } from "../components/elements/Divider";
import { SummaryBox } from "../components/SummaryBox";
import { TestCaseResultCard } from "../components/TestCaseResultCard";
import { AtCoderProblemRenderer } from "../components/AtCoderProbremRenderer";
import { ButtonsWithContextMenu } from "../components/ButtonsWithContextMenu";
import { ErrorContainer } from "../components/ErrorContainer";
import { TestCaseAddButton } from "../components/TestCaseAddButton";

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
    <div className="relative p-5">
      {/* controll buttons */}
      <div className="fixed flex gap-2 items-end top-2 right-5 z-10">
        <VscodeSingleSelect
          className="w-32"
          value={language}
          onChange={handleChangeLanguage}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <VscodeOption key={lang.id} value={lang.id}>
              {lang.label}
            </VscodeOption>
          ))}
        </VscodeSingleSelect>

        <ButtonsWithContextMenu
          buttons={
            <VscodeButton
              onClick={() => handleRunAll()}
              disabled={isLoading}
              icon="debug-all"
              title="テストケースをすべて実行"
            >
              Run
            </VscodeButton>
          }
          menuItems={[
            { label: "Paizaで実行", value: "paiza" },
            { label: "Localで実行", value: "local" },
          ]}
          onMenuItemSelect={(value) => handleRunAll(value as ExecutionMode)}
          disabled={isLoading}
          menuButtonTitle="その他..."
        />
      </div>

      {/* problem header */}
      <div className="flex items-center justify-between mt-5">
        <div>
          <h1 className="text-2xl font-bold">{problem.title}</h1>
          <p>{problem.executeConstraints}</p>
        </div>
        <div className="flex gap-2 items-end">
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

      <div>
        {(results.length > 0 || runningIndices.size > 0) && problem.samples && (
          <Divider />
        )}
        {/* Summary */}
        {summary && <SummaryBox summary={summary} />}

        {/* Error Message */}
        {error && <ErrorContainer message={error} className="my-4" />}

        {/* Test Results */}
        {(results.length > 0 || runningIndices.size > 0) && problem.samples && (
          <div className="my-2">
            <h3>Results</h3>
            <Divider />
            <div className="flex flex-col gap-2">
              {[...problem.samples, ...(customInputs ?? [])].map((_, index) => (
                <TestCaseResultCard
                  key={index}
                  index={index}
                  running={runningIndices.has(index)}
                  expanded={expandedTests.has(index)}
                  onToggleExpanded={(index) => toggleTestExpanded(index)}
                  result={results[index]}
                  sampleInput={problem.samples[index]}
                />
              ))}
            </div>
          </div>
        )}

        <Divider />
        <AtCoderProblemRenderer html={problem.bodyHtml} vscode={vscode} />
        <Divider />
        {customInputs.map((input, index) => (
          <>
            <section>
              <div className="flex justify-between items-center">
                <h3>Input {index + 1}</h3>
                <VscodeIcon
                  name="close"
                  title="削除"
                  actionIcon
                  onClick={() => handleRemoveTestCase(index)}
                />
              </div>
              <div className="w-full">
                <VscodeTextarea
                  className="w-full"
                  value={input.input}
                  onChange={(e) => handleInputChange(index, e)}
                />
              </div>

              <h3>Output {index + 1}</h3>
              <div className="w-full">
                <VscodeTextarea
                  className="w-full"
                  value={input.output}
                  onChange={(e) => handleOutputChange(index, e)}
                />
              </div>
            </section>
            <Divider />
          </>
        ))}

        <section>
          <TestCaseAddButton onClick={handleAddTestCase} />
        </section>
      </div>
    </div>
  ) : (
    <></>
  );
};

export default AtCoderProblemApp;
