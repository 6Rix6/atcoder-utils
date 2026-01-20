import React from "react";
import { IconProps } from "../../types/IconProps";

export const Pause = ({
  className,
  width = 16,
  height = 16,
  fill = "currentColor",
  ...props
}: IconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      fill={fill}
      className={`bi bi-pause ${className}`}
      viewBox="0 0 16 16"
      {...props}
    >
      <path d="M6 3.5a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5m4 0a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5" />
    </svg>
  );
};
