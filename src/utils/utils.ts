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
  appType?: string,
) {
  const webviewUri = getUri(webview, extensionUri, pathList);
  const codiconCssUri = getUri(webview, extensionUri, [
    "assets",
    "codicon",
    "codicon.css",
  ]);
  const nonce = getNonce();

  return `<!DOCTYPE html>
                  <html lang="en">
                  <head>
                      <meta charset="UTF-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                      <link rel="stylesheet" href="${codiconCssUri}" id="vscode-codicon-stylesheet">
                      <title>AtCoder Utils</title>
                  </head>
                  <body>
                      <div id="app"></div>
                      <script nonce="${nonce}">window.__APP_TYPE__ = "${appType ?? "default"}";</script>
                      <script type="module" nonce="${nonce}" src="${webviewUri}"></script>
                  </body>
              </html>`;
}
