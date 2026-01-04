import * as vscode from "vscode";

import { PaizaPanel } from "./PaizaPanel";


/**
 * Activate the extension
 */
export function activate(context: vscode.ExtensionContext) {
  // Track the last active text editor
  let lastActiveEditor = vscode.window.activeTextEditor;

  // Update target document when active editor changes
  const editorChangeListener = vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      if (editor) {
        lastActiveEditor = editor;
        PaizaPanel.updateTargetDocument(editor.document);
      }
    }
  );

  // Register the run command
  const runCommand = vscode.commands.registerCommand(
    "paiza-runner.run",
    () => {
      const editor = lastActiveEditor || vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage(
          "Paiza Runner: No active editor found. Please open a file first."
        );
        return;
      }

      const document = editor.document;
      if (!document.getText().trim()) {
        vscode.window.showWarningMessage(
          "Paiza Runner: The current file is empty."
        );
        return;
      }

      // Open the WebView panel with document reference
      PaizaPanel.createOrShow(context.extensionUri, document);
    }
  );

  context.subscriptions.push(editorChangeListener, runCommand);
}

export function deactivate() {}
