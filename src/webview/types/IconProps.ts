import React from "react";

export interface IconProps
  extends Omit<React.SVGProps<SVGSVGElement>, "viewBox" | "className"> {
  className?: string;
}
