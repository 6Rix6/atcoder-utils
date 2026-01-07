import * as vscode from "vscode";

export function getSettingValue<T>(key: string): T | undefined {
  const value = vscode.workspace.getConfiguration("paiza-runner").get<T>(key);
  if (value === undefined) {
    return undefined;
  }
  return value;
}
