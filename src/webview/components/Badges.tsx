import React from "react";

import "./Badges.css";

import type { Verdict } from "../../types/TestCaseResult";
import { getVerdictClass } from "../utils/getVerdictClass";

interface VerdictBadgeProps {
  verdict: Verdict | null;
  className?: string;
  children: React.ReactNode;
}

export const VerdictBadge = ({
  verdict,
  className,
  children,
}: VerdictBadgeProps) => {
  return (
    <span className={`badge verdict ${getVerdictClass(verdict)} ${className}`}>
      {children}
    </span>
  );
};

export const RunningBadge = () => {
  return <span className="badge running">Running...</span>;
};
