import * as vscode from "vscode";
import * as path from "path";

export function getUri(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  pathList: string[],
) {
  return webview.asWebviewUri(
    vscode.Uri.file(path.join(extensionUri.fsPath, ...pathList)),
  );
}

export function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export function getWebviewContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  pathList: string[],
) {
  const webviewUri = getUri(webview, extensionUri, pathList);
  const nonce = getNonce();

  return `<!DOCTYPE html>
                  <html lang="en">
                  <head>
                      <meta charset="UTF-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <title>AtCoder Utils</title>
                  </head>
                  <body>
                      <div id="app"></div>
                      <script type="module" nonce="${nonce}" src="${webviewUri}"></script>
                  </body>
              </html>`;
}
