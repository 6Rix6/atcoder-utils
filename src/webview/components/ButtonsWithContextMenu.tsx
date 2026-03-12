import React from "react";
import {
  VscodeButton,
  VscodeButtonGroup,
  VscodeOption,
} from "@vscode-elements/react-elements";
import { VscodeContextMenu } from "./elements/VscodeContextMenu";

interface ButtonsWithContextMenuProps {
  buttons: React.ReactNode;
  menuItems: { label: string; value: string }[];
  onMenuItemSelect?: (value: string) => void;
  disabled?: boolean;
  menuButtonTitle?: string;
  menuButtonIcon?: string;
  className?: string;
}

export const ButtonsWithContextMenu = ({
  buttons,
  menuItems,
  onMenuItemSelect,
  disabled,
  menuButtonTitle,
  menuButtonIcon = "chevron-down",
  className,
}: ButtonsWithContextMenuProps) => {
  const [showMenu, setShowMenu] = React.useState(false);

  return (
    <div className={`inline-block relative ${className}`}>
      <VscodeButtonGroup>
        {buttons}

        {/* menu toggle button */}
        <VscodeButton
          disabled={disabled}
          icon={menuButtonIcon}
          title={menuButtonTitle}
          onClick={() => setShowMenu(!showMenu)}
        />
      </VscodeButtonGroup>

      {/* menu */}
      <VscodeContextMenu
        data={menuItems}
        show={showMenu}
        className="absolute right-0 top-full w-auto z-10"
        onVscContextMenuSelect={(e) => onMenuItemSelect?.(e.detail.value)}
        onVisibilityChange={(visible) => {
          setShowMenu(visible);
        }}
      />
    </div>
  );
};
