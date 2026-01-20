import * as vscode from "vscode";
import { getWebviewContent } from "../utils/utils";
import {
  requestContest,
  AtCoderContest,
  ProblemLink,
  scrapeContest,
} from "../lib/scrapeAtCoder";
import { AtCoderProblemPanel } from "./AtCoderProblemPanel";
import { APP_CONFIG } from "../consts/appConfig";

export class AtCoderContestPanelProvider implements vscode.WebviewViewProvider {
  private _extensionUri: vscode.Uri;
  private _contest: AtCoderContest | null = null;
  private _webviewView: vscode.WebviewView | null = null;
  private static _instance: AtCoderContestPanelProvider | null = null;

  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
    AtCoderContestPanelProvider._instance = this;
  }

  public static refresh() {
    AtCoderContestPanelProvider._instance?._refresh();
  }

  public static async open() {
    await AtCoderContestPanelProvider._instance?._openContest();
  }

  private async _refresh() {
    if (this._contest && this._webviewView) {
      try {
        const url = this._contest.url;
        const refreshed = await scrapeContest(url);
        this._contest = refreshed;
        this._webviewView.webview.postMessage({
          command: "setContest",
          contest: refreshed,
        });
      } catch (error) {
        vscode.window.showErrorMessage(
          "Failed to refresh contest. Please try again.",
        );
      }
    }
  }

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._webviewView = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = getWebviewContent(
      webviewView.webview,
      this._extensionUri,
      ["dist", "webview.js"],
      "atcoder-contest",
    );

    webviewView.webview.onDidReceiveMessage((message) => {
      this._handleMessage(message, webviewView.webview);
    });
  }

  private async _openContest() {
    try {
      const contest = await requestContest();
      if (contest) {
        this._contest = contest;
        this._webviewView?.webview.postMessage({
          command: "setContest",
          contest,
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  private async _handleMessage(message: any, webview: vscode.Webview) {
    switch (message.command) {
      case "openContest":
        await this._openContest();
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
            `${APP_CONFIG.appDisplayName}: No active editor found. Please open a file first.`,
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

      case "openInBrowser":
        const url = message.url as string | undefined;
        if (url) {
          vscode.env.openExternal(vscode.Uri.parse(url));
        }
        return;
    }
  }
}
