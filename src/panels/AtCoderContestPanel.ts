import * as vscode from "vscode";
import { getWebviewContent } from "../utils/utils";
import {
  requestContest,
  AtCoderContest,
  ProblemLink,
} from "../lib/scrapeAtCoder";
import { AtCoderProblemPanel } from "./AtCoderProblemPanel";

export class AtCoderContestPanelProvider implements vscode.WebviewViewProvider {
  private _extensionUri: vscode.Uri;
  private _contest: AtCoderContest | null = null;

  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
  }

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = getWebviewContent(
      webviewView.webview,
      this._extensionUri,
      ["dist", "atCoderContestWebview.js"],
    );

    webviewView.webview.onDidReceiveMessage((message) => {
      this._handleMessage(message, webviewView.webview);
    });
  }

  private async _handleMessage(message: any, webview: vscode.Webview) {
    switch (message.command) {
      case "openContest":
        try {
          const contest = await requestContest();
          this._contest = contest;
          webview.postMessage({ command: "setContest", contest });
        } catch (error) {
          console.error(error);
        }
        return;

      case "getContest":
        if (this._contest) {
          webview.postMessage({
            command: "setContest",
            contest: this._contest,
          });
        }
        return;

      case "openProblem":
        const problem = message.problem as ProblemLink;
        const document = vscode.window.activeTextEditor?.document;
        if (!document) {
          vscode.window.showErrorMessage(
            "No active editor found. Please open a file first.",
          );
          return;
        }
        if (problem.url) {
          AtCoderProblemPanel.createOrShowFromUrl(
            this._extensionUri,
            document,
            problem.url,
          );
        }
        return;
    }
  }
}
