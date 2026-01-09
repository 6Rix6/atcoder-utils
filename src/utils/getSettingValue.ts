import * as vscode from "vscode";
import { APP_CONFIG } from "../consts/appConfig";

export function getSettingValue<T>(key: string): T | undefined {
  const value = vscode.workspace
    .getConfiguration(APP_CONFIG.appName)
    .get<T>(key);
  if (value === undefined) {
    return undefined;
  }
  return value;
}
