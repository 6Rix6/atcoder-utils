import React from "react";

import "./TestCaseResultCard.css";

import type { TestCaseResult, Verdict } from "../../types/TestCaseResult";
import type { DetailsResponse } from "../../types/Responses";
import type { SampleInput } from "../../lib/scrapeAtCoder";

import { formatBytes } from "../utils/formatUtils";

import { VscodeIcon } from "@vscode-elements/react-elements";
import { VerdictBadge, RunningBadge } from "./Badges";
import { LeftBorderdContainer } from "./LeftBorderdContainer";

interface TestCaseResultCardProps {
  index: number;
  running: boolean;
  expanded: boolean;
  onToggleExpanded: (index: number) => void;
  result?: TestCaseResult;
  sampleInput: SampleInput;
}

export const TestCaseResultCard = ({
  index,
  running,
  expanded,
  onToggleExpanded,
  result,
  sampleInput,
}: TestCaseResultCardProps) => {
  const verdict = result?.verdict || null;
  return (
    <div className="test-case-card">
      <div
        className={`test-case-header ${expanded ? "expanded" : ""}`}
        onClick={() => onToggleExpanded(index)}
      >
        <VscodeIcon
          name="chevron-right"
          className={`chevron-icon ${expanded ? "expanded" : ""}`}
        />
        <span className="test-case-header-text">
          Test <span className="test-case-header-number">#{index + 1}</span>
        </span>
        {running && <RunningBadge />}
        {result && (
          <VerdictBadge verdict={verdict}>
            {verdict || result.result?.result}
          </VerdictBadge>
        )}
      </div>

      {result && expanded && (
        <>
          {result.result && (
            <DetailsCard
              verdict={verdict}
              details={result.result}
              sample={sampleInput}
            />
          )}

          {result.error && (
            <LeftBorderdContainer
              borderLeftColor="var(--color-error-border)"
              className="test-case-error"
            >
              Error: {result.error}
            </LeftBorderdContainer>
          )}
        </>
      )}
    </div>
  );
};

const DetailsCard = ({
  verdict,
  details,
  sample,
}: {
  verdict: Verdict;
  details: DetailsResponse;
  sample: SampleInput;
}) => {
  return (
    <div className="test-case-result">
      <LeftBorderdContainer
        className="result-stats"
        borderLeftColor="var(--vscode-textLink-foreground)"
      >
        Time: {(details.time * 1000).toFixed(0)}
        ms | Memory: {formatBytes(details.memory)}
      </LeftBorderdContainer>
      <div className="result-content">
        {details.stdout && (
          <div className="result-output">
            <strong>Output</strong>
            <pre>{details.stdout}</pre>
          </div>
        )}
        {verdict === "WA" && sample && (
          <div className="result-expected-output">
            <strong>Expected Output</strong>
            <pre>{sample.output}</pre>
          </div>
        )}
        {details.stderr && (
          <div className="result-stderr">
            <strong>Stderr</strong>
            <LeftBorderdContainer borderLeftColor="var(--color-atcoder-re)">
              <pre>{details.stderr}</pre>
            </LeftBorderdContainer>
          </div>
        )}
        {details.build_stderr && details.build_result !== "success" && (
          <div className="result-build-error">
            <strong>Build Error</strong>
            <LeftBorderdContainer borderLeftColor="var(--color-atcoder-ce)">
              <pre>{details.build_stderr}</pre>
            </LeftBorderdContainer>
          </div>
        )}
      </div>
    </div>
  );
};
