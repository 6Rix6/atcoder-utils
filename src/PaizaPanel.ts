import * as vscode from "vscode";
import { SUPPORTED_LANGUAGES, runAndWait, detectLanguage } from "./paizaApi";

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
    this._panel.webview.html = this._getHtmlContent();

    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "run":
            await this._runCode(message.language, message.input);
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

  private _getHtmlContent(): string {
    const languageOptions = SUPPORTED_LANGUAGES.map(
      (lang) => `<option value="${lang.id}">${lang.label}</option>`
    ).join("\n");

    return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paiza Runner</title>
  <style>
    :root {
      --bg-primary: #1e1e1e;
      --bg-secondary: #252526;
      --bg-tertiary: #2d2d30;
      --text-primary: #cccccc;
      --text-secondary: #9d9d9d;
      --accent: #0e639c;
      --accent-hover: #1177bb;
      --success: #4ec9b0;
      --error: #f14c4c;
      --warning: #cca700;
      --border: #3c3c3c;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      padding: 20px;
      line-height: 1.5;
    }

    h1 {
      font-size: 1.4em;
      margin-bottom: 20px;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    h1::before {
      content: "▶";
      color: var(--success);
    }

    .form-group {
      margin-bottom: 16px;
    }

    label {
      display: block;
      margin-bottom: 6px;
      font-weight: 500;
      color: var(--text-secondary);
      font-size: 0.9em;
    }

    select, textarea {
      width: 100%;
      padding: 10px 12px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--text-primary);
      font-size: 14px;
      transition: border-color 0.2s;
    }

    select:focus, textarea:focus {
      outline: none;
      border-color: var(--accent);
    }

    textarea {
      font-family: 'Consolas', 'Monaco', monospace;
      resize: vertical;
      min-height: 100px;
    }

    .btn {
      background: var(--accent);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .btn:hover:not(:disabled) {
      background: var(--accent-hover);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-icon {
      font-size: 1.1em;
    }

    .result-section {
      margin-top: 24px;
      border-top: 1px solid var(--border);
      padding-top: 20px;
    }

    .result-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .result-title {
      font-size: 1.1em;
      font-weight: 500;
    }

    .result-stats {
      font-size: 0.85em;
      color: var(--text-secondary);
    }

    .result-box {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 12px;
      margin-bottom: 12px;
    }

    .result-box-header {
      font-size: 0.8em;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .result-box-header.stdout { color: var(--success); }
    .result-box-header.stderr { color: var(--error); }
    .result-box-header.build-error { color: var(--warning); }

    .result-content {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 13px;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 300px;
      overflow-y: auto;
    }

    .loading {
      display: none;
      align-items: center;
      gap: 10px;
      color: var(--text-secondary);
      margin-top: 16px;
    }

    .loading.active {
      display: flex;
    }

    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-message {
      background: rgba(241, 76, 76, 0.1);
      border: 1px solid var(--error);
      color: var(--error);
      padding: 12px;
      border-radius: 4px;
      margin-top: 16px;
      display: none;
    }

    .error-message.active {
      display: block;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      margin-bottom: 8px;
      border-radius: 4px;
      font-size: 0.75em;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.success {
      background: rgba(78, 201, 176, 0.2);
      color: var(--success);
    }

    .status-badge.failure, .status-badge.error {
      background: rgba(241, 76, 76, 0.2);
      color: var(--error);
    }

    .hidden {
      display: none !important;
    }
  </style>
</head>
<body>
  <h1>Paiza Runner</h1>
  
  <div class="form-group">
    <label for="language">Language</label>
    <select id="language">
      ${languageOptions}
    </select>
  </div>

  <div class="form-group">
    <label for="stdin">Standard Input (stdin)</label>
    <textarea id="stdin" placeholder="Enter input data here..."></textarea>
  </div>

  <button id="runBtn" class="btn">
    <span class="btn-icon">▶</span>
    Run Code
  </button>

  <div id="loading" class="loading">
    <div class="spinner"></div>
    <span>Running on Paiza.io...</span>
  </div>

  <div id="errorMessage" class="error-message"></div>

  <div id="resultSection" class="result-section hidden">
    <div class="result-header">
      <span class="result-title">Execution Result</span>
      <span id="resultStats" class="result-stats"></span>
    </div>
    <span id="statusBadge" class="status-badge"></span>

    <div id="stdoutBox" class="result-box hidden">
      <div class="result-box-header stdout">Standard Output</div>
      <div id="stdout" class="result-content"></div>
    </div>

    <div id="stderrBox" class="result-box hidden">
      <div class="result-box-header stderr">Standard Error</div>
      <div id="stderr" class="result-content"></div>
    </div>

    <div id="buildErrorBox" class="result-box hidden">
      <div class="result-box-header build-error">Build Error</div>
      <div id="buildError" class="result-content"></div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    
    const runBtn = document.getElementById('runBtn');
    const languageSelect = document.getElementById('language');
    const stdinInput = document.getElementById('stdin');
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('errorMessage');
    const resultSection = document.getElementById('resultSection');
    const stdoutBox = document.getElementById('stdoutBox');
    const stderrBox = document.getElementById('stderrBox');
    const buildErrorBox = document.getElementById('buildErrorBox');
    const stdout = document.getElementById('stdout');
    const stderr = document.getElementById('stderr');
    const buildError = document.getElementById('buildError');
    const resultStats = document.getElementById('resultStats');
    const statusBadge = document.getElementById('statusBadge');

    runBtn.addEventListener('click', () => {
      vscode.postMessage({
        command: 'run',
        language: languageSelect.value,
        input: stdinInput.value
      });
    });

    window.addEventListener('message', (event) => {
      const message = event.data;
      
      switch (message.command) {
        case 'loading':
          loading.classList.toggle('active', message.loading);
          runBtn.disabled = message.loading;
          if (message.loading) {
            errorMessage.classList.remove('active');
          }
          break;
          
        case 'result':
          displayResult(message.result);
          break;
          
        case 'error':
          errorMessage.textContent = message.error;
          errorMessage.classList.add('active');
          resultSection.classList.add('hidden');
          break;
          
        case 'setLanguage':
          languageSelect.value = message.language;
          break;
      }
    });

    function displayResult(result) {
      resultSection.classList.remove('hidden');
      errorMessage.classList.remove('active');
      
      // Status badge
      statusBadge.textContent = result.result;
      statusBadge.className = 'status-badge ' + result.result;
      
      // Stats
      resultStats.textContent = 
        'Time: ' + (result.time * 1000).toFixed(0) + 'ms | ' +
        'Memory: ' + formatBytes(result.memory);
      
      // Stdout
      if (result.stdout) {
        stdout.textContent = result.stdout;
        stdoutBox.classList.remove('hidden');
      } else {
        stdoutBox.classList.add('hidden');
      }
      
      // Stderr
      if (result.stderr) {
        stderr.textContent = result.stderr;
        stderrBox.classList.remove('hidden');
      } else {
        stderrBox.classList.add('hidden');
      }
      
      // Build error
      if (result.build_stderr && result.build_result !== 'success') {
        buildError.textContent = result.build_stderr;
        buildErrorBox.classList.remove('hidden');
      } else {
        buildErrorBox.classList.add('hidden');
      }
    }

    function formatBytes(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
  </script>
</body>
</html>`;
  }
}
