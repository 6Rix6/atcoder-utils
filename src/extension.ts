import * as vscode from "vscode";

const api_key = "guest";

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "paiza-runner.run",
    async function () {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found!");
        return;
      }

      // Get the source code from the active editor
      const sourceCode = editor.document.getText();
      const languageId = editor.document.languageId === "cpp" ? "cpp" : "c"; // Simplified language mapping

      vscode.window.showInformationMessage("Running on Paiza...");

      try {
        // 1. Create runner
        const createRes = await fetch(
          "https://api.paiza.io/runners/create.json",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              source_code: sourceCode,
              language: languageId,
              api_key,
            }),
          }
        );
        const { id } = (await createRes.json()) as { id: string };

        // 2. Poll for results (Wait 3 seconds for simplicity)
        // Ideally, you should check 'status' repeatedly, but this is a quick version.
        setTimeout(async () => {
          const detailRes = await fetch(
            `https://api.paiza.io/runners/get_details.json?id=${id}&api_key=${api_key}`
          );
          const result = (await detailRes.json()) as any;

          // Show output in a new OutputChannel
          const channel = vscode.window.createOutputChannel("Paiza Output");
          channel.show();

          if (result.stdout) channel.appendLine("[Stdout]\n" + result.stdout);
          if (result.stderr) channel.appendLine("[Stderr]\n" + result.stderr);
          if (result.build_stderr)
            channel.appendLine("[Build Error]\n" + result.build_stderr);
        }, 3000);
      } catch (err: unknown) {
        if (err instanceof Error) {
          vscode.window.showErrorMessage("Error: " + err.message);
        }
      }
    }
  );

  context.subscriptions.push(disposable);
}

function deactivate() {}

export { activate, deactivate };
