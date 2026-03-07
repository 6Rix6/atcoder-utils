import React, { useEffect, useRef } from "react";
import { VscodeContextMenu as VscodeContextMenuElement } from "@vscode-elements/react-elements";

interface Props extends React.ComponentProps<typeof VscodeContextMenuElement> {
  onVisibilityChange?: (visible: boolean) => void;
}

/// extended vscode-context-menu to support onVisibilityChange
const VscodeContextMenu: React.FC<Props> = ({
  onVisibilityChange,
  ...props
}) => {
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

export default VscodeContextMenu;
