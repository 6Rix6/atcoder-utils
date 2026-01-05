import * as vscode from "vscode";
import * as path from "path";
import { runAndWait, detectLanguage, DetailsResponse } from "./paizaApi";

/**
 * Test case result for parallel execution
 */
export interface TestCaseResult {
  index: number;
  input: string;
  expectedOutput?: string;
  result: DetailsResponse | null;
  error?: string;
  status: "pending" | "running" | "completed" | "error";
}

/**
 * WebView Panel for Multi-Test Case Runner
 * Provides GUI for running multiple test cases in parallel
 */
export class MultiTestPanel {
  public static currentPanel: MultiTestPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _targetDocument: vscode.TextDocument | undefined;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._panel.webview.html = this._getWebviewContent(
      this._panel.webview,
      extensionUri
    );

    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "runAll":
            await this._runAllTestCases(message.language, message.testCases);
            break;

          case "getCurrentLanguage":
            if (this._targetDocument) {
              this._setTargetDocument(this._targetDocument);
            }
            break;

          case "getOpenEditors":
            this._sendOpenEditors();
            break;

          case "setTargetFile":
            const uri = message.uri;
            if (uri) {
              const document = vscode.workspace.textDocuments.find(
                (doc) => doc.uri.toString() === uri
              );
              if (document) {
                this._setTargetDocument(document);
              }
            }
            break;
        }
      },
      null,
      this._disposables
    );

    // Handle disposal
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  /**
   * Create or show the panel
   */
  public static createOrShow(
    extensionUri: vscode.Uri,
    document: vscode.TextDocument
  ) {
    const column = vscode.ViewColumn.Beside;

    if (MultiTestPanel.currentPanel) {
      MultiTestPanel.currentPanel._setTargetDocument(document);
      MultiTestPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "paizaMultiTest",
      "Paiza Multi-Test Runner",
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    MultiTestPanel.currentPanel = new MultiTestPanel(panel, extensionUri);
    MultiTestPanel.currentPanel._setTargetDocument(document);
  }

  /**
   * Update the target document (called when user switches editors)
   */
  public static updateTargetDocument(document: vscode.TextDocument) {
    if (MultiTestPanel.currentPanel) {
      MultiTestPanel.currentPanel._setTargetDocument(document);
      MultiTestPanel.currentPanel._sendOpenEditors();
    }
  }

  public dispose() {
    MultiTestPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  private _setTargetDocument(document: vscode.TextDocument) {
    this._targetDocument = document;
    // Auto-detect language and send to webview
    const detectedLanguage = detectLanguage(document.languageId);
    if (detectedLanguage) {
      this._panel.webview.postMessage({
        command: "setLanguage",
        language: detectedLanguage,
      });
    }
    // Send target file info
    this._panel.webview.postMessage({
      command: "setTargetFile",
      uri: document.uri.toString(),
      fileName: path.basename(document.fileName),
    });
  }

  private _sendOpenEditors() {
    // Get all visible text editors
    const openEditors = vscode.workspace.textDocuments
      .filter((doc) => !doc.isUntitled && doc.uri.scheme === "file")
      .map((doc) => ({
        uri: doc.uri.toString(),
        fileName: path.basename(doc.fileName),
        fullPath: doc.fileName,
      }));

    this._panel.webview.postMessage({
      command: "openEditors",
      editors: openEditors,
      currentUri: this._targetDocument?.uri.toString(),
    });
  }

  /**
   * Run all test cases in parallel
   */
  private async _runAllTestCases(
    language: string,
    testCases: { input: string; expectedOutput?: string }[]
  ) {
    // Get the latest source code from the target document
    if (!this._targetDocument) {
      this._panel.webview.postMessage({
        command: "error",
        error: "No file selected. Please open a file first.",
      });
      return;
    }

    // Get fresh content from the document (handles unsaved changes too)
    const sourceCode = this._targetDocument.getText();
    if (!sourceCode.trim()) {
      this._panel.webview.postMessage({
        command: "error",
        error: "The current file is empty.",
      });
      return;
    }

    // Show loading state
    this._panel.webview.postMessage({ command: "loading", loading: true });

    try {
      // Create promises for all test cases
      const promises = testCases.map(async (testCase, index) => {
        // Notify that this test case is running
        this._panel.webview.postMessage({
          command: "testCaseStatus",
          index,
          status: "running",
        });

        try {
          const result = await runAndWait(sourceCode, language, testCase.input);

          // Check if output matches expected (if provided)
          let verdict: "AC" | "WA" | "RE" | "CE" | null = null;
          if (
            testCase.expectedOutput !== undefined &&
            testCase.expectedOutput.trim() !== ""
          ) {
            const actualOutput = result.stdout.trim();
            const expectedOutput = testCase.expectedOutput.trim();
            if (result.result === "success") {
              verdict = actualOutput === expectedOutput ? "AC" : "WA";
            } else if (result.build_result === "failure") {
              verdict = "CE";
            } else {
              verdict = "RE";
            }
          }

          return {
            index,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            result,
            status: "completed" as const,
            verdict,
          };
        } catch (error) {
          return {
            index,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            result: null,
            error: error instanceof Error ? error.message : String(error),
            status: "error" as const,
            verdict: null,
          };
        }
      });

      // Wait for all test cases to complete
      const results = await Promise.all(promises);

      // Send all results
      this._panel.webview.postMessage({
        command: "allResults",
        results,
      });
    } catch (error) {
      this._panel.webview.postMessage({
        command: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this._panel.webview.postMessage({ command: "loading", loading: false });
    }
  }

  private _getUri(
    webview: vscode.Webview,
    extensionUri: vscode.Uri,
    pathList: string[]
  ) {
    return webview.asWebviewUri(
      vscode.Uri.file(path.join(extensionUri.fsPath, ...pathList))
    );
  }

  private _getNonce() {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  private _getWebviewContent(
    webview: vscode.Webview,
    extensionUri: vscode.Uri
  ) {
    const webviewUri = this._getUri(webview, extensionUri, [
      "dist",
      "multiTestWebview.js",
    ]);
    const nonce = this._getNonce();

    return `<!DOCTYPE html>
                  <html lang="en">
                  <head>
                      <meta charset="UTF-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <title>Paiza Multi-Test Runner</title>
                  </head>
                  <body>
                      <div id="app"></div>
                      <script type="module" nonce="${nonce}" src="${webviewUri}"></script>
                  </body>
              </html>`;
  }
}
