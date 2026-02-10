/**
 * Local Runner Module
 * Compiles and executes code locally using child_process
 */

import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

import type { DetailsResponse } from "../types/Responses";
import { getSettingValue } from "../utils/getSettingValue";
import { SETTINGS } from "../consts/appConfig";

// Custom command configuration from user settings
interface CustomCommandConfig {
  compile?: string;
  run?: string;
}

// Language command configuration
interface LanguageCommand {
  /** File extension for source code */
  extension: string;
  /** Compile command template. Use {source} and {output} placeholders */
  compile?: (source: string, output: string) => string[];
  /** Run command template. Use {source} or {output} placeholder */
  run: (source: string, output: string) => string[];
}

const isWindows = os.platform() === "win32";
const EXE_EXT = isWindows ? ".exe" : "";

const LANGUAGE_COMMANDS: Record<string, LanguageCommand> = {
  python3: {
    extension: ".py",
    run: (source) => ["python", source],
  },
  python: {
    extension: ".py",
    run: (source) => ["python", source],
  },
  javascript: {
    extension: ".js",
    run: (source) => ["node", source],
  },
  typescript: {
    extension: ".ts",
    run: (source) => ["npx", "ts-node", source],
  },
  c: {
    extension: ".c",
    compile: (source, output) => ["gcc", source, "-o", output],
    run: (_source, output) => [output],
  },
  cpp: {
    extension: ".cpp",
    compile: (source, output) => ["g++", source, "-o", output],
    run: (_source, output) => [output],
  },
  java: {
    extension: ".java",
    compile: (source) => ["javac", source],
    run: (source) => [
      "java",
      "-cp",
      path.dirname(source),
      path.basename(source, ".java"),
    ],
  },
  go: {
    extension: ".go",
    run: (source) => ["go", "run", source],
  },
  rust: {
    extension: ".rs",
    compile: (source, output) => ["rustc", source, "-o", output],
    run: (_source, output) => [output],
  },
  ruby: {
    extension: ".rb",
    run: (source) => ["ruby", source],
  },
  kotlin: {
    extension: ".kt",
    compile: (source, output) => [
      "kotlinc",
      source,
      "-include-runtime",
      "-d",
      output + ".jar",
    ],
    run: (_source, output) => ["java", "-jar", output + ".jar"],
  },
  swift: {
    extension: ".swift",
    run: (source) => ["swift", source],
  },
  php: {
    extension: ".php",
    run: (source) => ["php", source],
  },
  perl: {
    extension: ".pl",
    run: (source) => ["perl", source],
  },
  bash: {
    extension: ".sh",
    run: (source) => ["bash", source],
  },
  r: {
    extension: ".r",
    run: (source) => ["Rscript", source],
  },
};

/**
 * Get custom commands from user settings for a specific language
 */
function getCustomCommands(language: string): CustomCommandConfig | undefined {
  const customCommands = getSettingValue<Record<string, CustomCommandConfig>>(
    SETTINGS.localCustomCommands,
  );
  if (!customCommands) {
    return undefined;
  }
  return customCommands[language];
}

/**
 * Parse a command string with placeholders into [cmd, ...args].
 * Supports: {source}, {output}, and any extra variables (e.g. {workspace}, {fileDir})
 */
function parseCommandString(
  template: string,
  source: string,
  output: string,
  variables?: Record<string, string>,
): string[] {
  let resolved = template
    .replace(/\{source\}/g, source)
    .replace(/\{output\}/g, output);
  // Replace extra variables like {workspace}, {fileDir}
  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      resolved = resolved.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    }
  }
  // Split on whitespace, respecting quoted strings
  const parts: string[] = [];
  let current = "";
  let inQuote: string | null = null;
  for (const char of resolved) {
    if (inQuote) {
      if (char === inQuote) {
        inQuote = null;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      inQuote = char;
    } else if (char === " " || char === "\t") {
      if (current) {
        parts.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }
  if (current) {
    parts.push(current);
  }
  return parts;
}

/**
 * Check if a language is supported for local execution
 */
export function isLocalSupported(language: string): boolean {
  return language in LANGUAGE_COMMANDS || !!getCustomCommands(language);
}

/**
 * Execute a command and return stdout, stderr, exit code
 */
function execCommand(
  cmd: string,
  args: string[],
  input?: string,
  timeoutMs: number = 30000,
): Promise<{ stdout: string; stderr: string; exitCode: number; time: number }> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const proc = cp.spawn(cmd, args, {
      timeout: timeoutMs,
      shell: isWindows,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    if (input) {
      proc.stdin.write(input);
      proc.stdin.end();
    } else {
      proc.stdin.end();
    }

    proc.on("close", (code) => {
      const elapsed = (Date.now() - startTime) / 1000;
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1,
        time: elapsed,
      });
    });

    proc.on("error", (err) => {
      const elapsed = (Date.now() - startTime) / 1000;
      resolve({
        stdout: "",
        stderr: err.message,
        exitCode: 1,
        time: elapsed,
      });
    });
  });
}

/**
 * Run code locally and return a DetailsResponse-compatible result.
 * Falls back to throwing an error if the language is not supported.
 */
export async function localRunAndWait(
  sourceCode: string,
  language: string,
  input?: string,
  timeoutMs: number = 30000,
  variables?: Record<string, string>,
): Promise<DetailsResponse> {
  const langConfig = LANGUAGE_COMMANDS[language];
  const customConfig = getCustomCommands(language);

  if (!langConfig && !customConfig) {
    throw new Error(
      `Language "${language}" is not supported for local execution. Please switch to Paiza mode.`,
    );
  }

  // Determine file extension from built-in config or fallback
  const extension = langConfig?.extension ?? ".txt";

  // Create temp directory and write source file
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "atcoder-utils-"));
  const sourceFile = path.join(tempDir, `main${extension}`);
  const outputFile = path.join(tempDir, `main${EXE_EXT}`);

  try {
    fs.writeFileSync(sourceFile, sourceCode, "utf-8");

    let buildStdout = "";
    let buildStderr = "";
    let buildExitCode = 0;
    let buildTime = 0;
    let buildResult: "success" | "failure" | "error" = "success";

    // Determine compile command: custom > built-in > none
    let compileArgs: string[] | undefined;
    if (customConfig?.compile) {
      compileArgs = parseCommandString(
        customConfig.compile,
        sourceFile,
        outputFile,
        variables,
      );
    } else if (langConfig?.compile) {
      compileArgs = langConfig.compile(sourceFile, outputFile);
    }

    // Compile step (if needed)
    if (compileArgs) {
      const [compileCmd, ...compileRest] = compileArgs;
      const compileResult = await execCommand(
        compileCmd,
        compileRest,
        undefined,
        timeoutMs,
      );

      buildStdout = compileResult.stdout;
      buildStderr = compileResult.stderr;
      buildExitCode = compileResult.exitCode;
      buildTime = compileResult.time;

      if (compileResult.exitCode !== 0) {
        buildResult = "failure";
        // Return early with compile error
        return {
          id: "local",
          language,
          status: "completed",
          build_stdout: buildStdout,
          build_stderr: buildStderr,
          build_exit_code: buildExitCode,
          build_time: buildTime,
          build_memory: 0,
          build_result: buildResult,
          stdout: "",
          stderr: "",
          exit_code: 0,
          time: 0,
          memory: 0,
          result: "failure",
        };
      }

      // Brief delay to ensure the compiled binary is fully flushed to disk
      const delayMs = getSettingValue<number>(SETTINGS.compileDelayMs) ?? 100;
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    // Determine run command: custom > built-in
    let runArgs: string[];
    if (customConfig?.run) {
      runArgs = parseCommandString(
        customConfig.run,
        sourceFile,
        outputFile,
        variables,
      );
    } else if (langConfig) {
      runArgs = langConfig.run(sourceFile, outputFile);
    } else {
      throw new Error(
        `No run command configured for language "${language}". Please set a custom run command.`,
      );
    }
    const [runCmd, ...runRest] = runArgs;
    const runResult = await execCommand(runCmd, runRest, input, timeoutMs);

    const result: "success" | "failure" | "error" =
      runResult.exitCode === 0 ? "success" : "failure";

    return {
      id: "local",
      language,
      status: "completed",
      build_stdout: buildStdout,
      build_stderr: buildStderr,
      build_exit_code: buildExitCode,
      build_time: buildTime,
      build_memory: 0,
      build_result: buildResult,
      stdout: runResult.stdout,
      stderr: runResult.stderr,
      exit_code: runResult.exitCode,
      time: runResult.time,
      memory: 0,
      result,
    };
  } finally {
    // Cleanup temp files
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}
