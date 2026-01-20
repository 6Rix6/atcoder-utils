/**
 * Paiza.io API Client Module
 * https://api.paiza.io/
 */

const API_BASE = "https://api.paiza.io";
const API_KEY = "guest";

// Type Definitions
export interface CreateResponse {
  id: string;
  status: "running" | "completed";
  error?: string;
}

export interface StatusResponse {
  id: string;
  status: "running" | "completed";
  error?: string;
}

export interface DetailsResponse {
  id: string;
  language: string;
  status: "running" | "completed";
  build_stdout: string;
  build_stderr: string;
  build_exit_code: number;
  build_time: number;
  build_memory: number;
  build_result: "success" | "failure" | "error";
  stdout: string;
  stderr: string;
  exit_code: number;
  time: number;
  memory: number;
  result: "success" | "failure" | "error";
}

// Supported Languages
export const SUPPORTED_LANGUAGES = [
  { id: "python3", label: "Python 3" },
  { id: "python", label: "Python 2" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "c", label: "C" },
  { id: "cpp", label: "C++" },
  { id: "csharp", label: "C#" },
  { id: "java", label: "Java" },
  { id: "kotlin", label: "Kotlin" },
  { id: "scala", label: "Scala" },
  { id: "swift", label: "Swift" },
  { id: "go", label: "Go" },
  { id: "rust", label: "Rust" },
  { id: "ruby", label: "Ruby" },
  { id: "php", label: "PHP" },
  { id: "perl", label: "Perl" },
  { id: "bash", label: "Bash" },
  { id: "r", label: "R" },
  { id: "haskell", label: "Haskell" },
  { id: "erlang", label: "Erlang" },
  { id: "elixir", label: "Elixir" },
  { id: "clojure", label: "Clojure" },
  { id: "fsharp", label: "F#" },
  { id: "vb", label: "Visual Basic" },
  { id: "cobol", label: "COBOL" },
  { id: "d", label: "D" },
  { id: "scheme", label: "Scheme" },
  { id: "commonlisp", label: "Common Lisp" },
  { id: "coffeescript", label: "CoffeeScript" },
  { id: "objective-c", label: "Objective-C" },
  { id: "mysql", label: "MySQL" },
  { id: "nadesiko", label: "なでしこ" },
  { id: "brainfuck", label: "Brainfuck" },
  { id: "plain", label: "Plain Text" },
] as const;

export type LanguageId = (typeof SUPPORTED_LANGUAGES)[number]["id"];

// Mapping from VS Code languageId to Paiza language
const VSCODE_TO_PAIZA_MAP: Record<string, LanguageId> = {
  python: "python3",
  javascript: "javascript",
  typescript: "typescript",
  c: "c",
  cpp: "cpp",
  csharp: "csharp",
  java: "java",
  kotlin: "kotlin",
  scala: "scala",
  swift: "swift",
  go: "go",
  rust: "rust",
  ruby: "ruby",
  php: "php",
  perl: "perl",
  shellscript: "bash",
  r: "r",
  haskell: "haskell",
  erlang: "erlang",
  elixir: "elixir",
  clojure: "clojure",
  fsharp: "fsharp",
  vb: "vb",
  cobol: "cobol",
  d: "d",
  scheme: "scheme",
  lisp: "commonlisp",
  coffeescript: "coffeescript",
  "objective-c": "objective-c",
  sql: "mysql",
};

/**
 * Detect Paiza language from VS Code languageId
 * Returns undefined if no mapping found
 */
export function detectLanguage(
  vscodeLanguageId: string,
): LanguageId | undefined {
  return VSCODE_TO_PAIZA_MAP[vscodeLanguageId];
}

/**
 * Create a new runner session
 */
export async function createRunner(
  sourceCode: string,
  language: string,
  input?: string,
): Promise<CreateResponse> {
  const body = new URLSearchParams({
    api_key: API_KEY,
    source_code: sourceCode,
    language: language,
  });
  if (input) {
    body.append("input", input);
  }

  const response = await fetch(`${API_BASE}/runners/create.json`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<CreateResponse>;
}

/**
 * Get the status of a runner session
 */
export async function getStatus(id: string): Promise<StatusResponse> {
  const response = await fetch(
    `${API_BASE}/runners/get_status.json?api_key=${API_KEY}&id=${encodeURIComponent(
      id,
    )}`,
  );

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<StatusResponse>;
}

/**
 * Get detailed results of a runner session
 */
export async function getDetails(id: string): Promise<DetailsResponse> {
  const response = await fetch(
    `${API_BASE}/runners/get_details.json?api_key=${API_KEY}&id=${encodeURIComponent(
      id,
    )}`,
  );

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<DetailsResponse>;
}

/**
 * Wait for a runner session to complete, then return details
 */
export async function runAndWait(
  sourceCode: string,
  language: string,
  input?: string,
  maxWaitMs: number = 30000,
  pollIntervalMs: number = 500,
): Promise<DetailsResponse> {
  const createResult = await createRunner(sourceCode, language, input);

  if (createResult.error) {
    throw new Error(`Create failed: ${createResult.error}`);
  }

  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const status = await getStatus(createResult.id);

    if (status.error) {
      throw new Error(`Status check failed: ${status.error}`);
    }

    if (status.status === "completed") {
      return getDetails(createResult.id);
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error("Execution timed out");
}
