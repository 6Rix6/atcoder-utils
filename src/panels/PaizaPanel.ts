import * as vscode from "vscode";
import * as path from "path";
import { runAndWait, detectLanguage } from "../lib/paizaApi";

/**
 * WebView Panel for Paiza Runner
 * Provides GUI for language selection and stdin input
 */
export class PaizaPanel {
  public static currentPanel: PaizaPanel | undefined;
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
          case "run":
            await this._runCode(message.language, message.input);
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

    if (PaizaPanel.currentPanel) {
      PaizaPanel.currentPanel._setTargetDocument(document);
      PaizaPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "paizaRunner",
      "Paiza Runner",
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    PaizaPanel.currentPanel = new PaizaPanel(panel, extensionUri);
    PaizaPanel.currentPanel._setTargetDocument(document);
  }

  /**
   * Update the target document (called when user switches editors)
   */
  public static updateTargetDocument(document: vscode.TextDocument) {
    if (PaizaPanel.currentPanel) {
      PaizaPanel.currentPanel._setTargetDocument(document);
      PaizaPanel.currentPanel._sendOpenEditors();
    }
  }

  public dispose() {
    PaizaPanel.currentPanel = undefined;
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

  private async _runCode(language: string, input: string) {
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
      const result = await runAndWait(sourceCode, language, input);
      this._panel.webview.postMessage({
        command: "result",
        result: result,
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
      "webview.js",
    ]);
    const nonce = this._getNonce();

    return `<!DOCTYPE html>
                  <html lang="en">
                  <head>
                      <meta charset="UTF-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <title>Paiza Runner</title>
                  </head>
                  <body>
                      <div id="app"></div>
                      <script type="module" nonce="${nonce}" src="${webviewUri}"></script>
                  </body>
              </html>`;
  }
}
