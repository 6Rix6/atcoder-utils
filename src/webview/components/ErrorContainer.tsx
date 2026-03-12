import React from "react";

import "./ErrorContainer.css";
import { LeftBorderdContainer } from "./LeftBorderdContainer";

interface ErrorContainerProps {
  message: string;
  className?: string;
}

export const ErrorContainer = ({ message, className }: ErrorContainerProps) => {
  return (
    <LeftBorderdContainer
      borderLeftColor="var(--color-error-border)"
      className={`error-container ${className}`}
    >
      {message}
    </LeftBorderdContainer>
  );
};
