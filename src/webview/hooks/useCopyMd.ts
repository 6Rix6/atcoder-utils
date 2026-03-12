import { useState } from "react";
import type { WebviewApi } from "vscode-webview";

export const useCopyMd = (vscode: WebviewApi<unknown>) => {
  const [isCopying, setIsCopying] = useState(false);

  const handleCopyMd = () => {
    if (isCopying) return;
    vscode.postMessage({ command: "copyMd" });
    setIsCopying(true);
    setTimeout(() => setIsCopying(false), 2000);
  };

  return { isCopying, handleCopyMd };
};
