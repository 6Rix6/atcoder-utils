import React from "react";

import "./TestCaseAddButton.css";
import { VscodeIcon } from "@vscode-elements/react-elements";

interface TestCaseAddButtonProps {
  onClick: () => void;
  icon?: string;
}

export const TestCaseAddButton = ({
  onClick,
  icon = "add",
}: TestCaseAddButtonProps) => {
  return (
    <button className="test-case-add-button" onClick={onClick}>
      <VscodeIcon name={icon} size={12}></VscodeIcon>
    </button>
  );
};
