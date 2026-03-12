import React, { useEffect, useRef } from "react";
import { VscodeContextMenu as VscodeContextMenuElement } from "@vscode-elements/react-elements";

interface Props extends React.ComponentProps<typeof VscodeContextMenuElement> {
  onVisibilityChange?: (visible: boolean) => void;
}

/// extended vscode-context-menu to support onVisibilityChange
export const VscodeContextMenu = ({ onVisibilityChange, ...props }: Props) => {
  const elementRef = useRef<any>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || !onVisibilityChange) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "show") {
          const isVisible = el.hasAttribute("show");
          onVisibilityChange(isVisible);
        }
      });
    });

    observer.observe(el, { attributes: true });

    return () => observer.disconnect();
  }, [onVisibilityChange]);

  return <VscodeContextMenuElement {...props} ref={elementRef} />;
};
