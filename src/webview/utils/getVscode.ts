import type { WebviewApi } from "vscode-webview";

declare function acquireVsCodeApi<T = unknown>(): WebviewApi<T>;

export const getVscode = () => {
  return acquireVsCodeApi();
};
