import React from "react";

import "./SummaryBox.css";

import { Summary } from "../types/Summary";
import { Check2, Circle } from "./icons";
import { LeftBorderdContainer } from "./LeftBorderdContainer";
import { VerdictBadge } from "./Badges";

interface SummaryBoxProps {
  summary: Summary;
}

export const SummaryBox = ({ summary }: SummaryBoxProps) => {
  return (
    <LeftBorderdContainer
      borderLeftColor={
        summary.allPassed
          ? "var(--color-atcoder-ac)"
          : "var(--color-vscode-link)"
      }
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
        <VerdictBadge verdict={"AC"} className="all-ac-badge">
          <span className="badge-icon">🎉</span>
          <span>All AC!</span>
        </VerdictBadge>
      )}
    </LeftBorderdContainer>
  );
};
