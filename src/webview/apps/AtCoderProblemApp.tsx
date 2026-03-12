import React from "react";

import type { ExecutionMode } from "../../types/ExecutionMode";

import { SUPPORTED_LANGUAGES } from "../../lib/paizaApi";
import { getVscode } from "../utils/getVscode";
import { getSummary } from "../utils/getSummary";

import { useAtCoderProblem } from "../hooks/useAtCoderProblem";
import { useCopyMd } from "../hooks/useCopyMd";
import { useCustomInputs } from "../hooks/useCustomInputs";

import {
  VscodeButton,
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
  const {
    problem,
    language,
    setLanguage,
    isLoading,
    results,
    runningIndices,
    error,
    expandedTests,
    setExpandedTests,
  } = useAtCoderProblem(vscode);
  const { isCopying, handleCopyMd } = useCopyMd(vscode);
  const { customInputs, handleAdd, handleRemove, handleChange } =
    useCustomInputs();

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
                  onClick={() => handleRemove(index)}
                />
              </div>
              <div className="w-full">
                <VscodeTextarea
                  className="w-full"
                  value={input.input}
                  onChange={(e) => handleChange(index, "input", e)}
                />
              </div>

              <h3>Output {index + 1}</h3>
              <div className="w-full">
                <VscodeTextarea
                  className="w-full"
                  value={input.output}
                  onChange={(e) => handleChange(index, "output", e)}
                />
              </div>
            </section>
            <Divider />
          </>
        ))}

        <section>
          <TestCaseAddButton onClick={handleAdd} />
        </section>
      </div>
    </div>
  ) : (
    <></>
  );
};

export default AtCoderProblemApp;
