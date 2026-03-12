import React from "react";

interface LeftBorderdContainerProps {
  borderLeftColor?: string;
  className?: string;
  children: React.ReactNode;
}

export const LeftBorderdContainer = ({
  borderLeftColor,
  className,
  children,
}: LeftBorderdContainerProps) => {
  return (
    <div
      className={`rounded border-l-4 ${className}`}
      style={{ borderLeftColor }}
    >
      {children}
    </div>
  );
};
