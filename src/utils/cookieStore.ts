import * as vscode from "vscode";

const COOKIE_KEY = "atcoder-utils.cookie";

let extensionContext: vscode.ExtensionContext | undefined;

/**
 * Initialize the cookie store with the extension context.
 * Must be called in the activate function.
 */
export function initializeCookieStore(context: vscode.ExtensionContext): void {
  extensionContext = context;
}

/**
 * Save a cookie string to the extension's secret storage.
 * @param cookie The cookie string to save
 */
export async function saveCookie(cookie: string): Promise<void> {
  if (!extensionContext) {
    throw new Error(
      "Cookie store not initialized. Call initializeCookieStore first."
    );
  }
  await extensionContext.secrets.store(COOKIE_KEY, cookie);
}

/**
 * Load the cookie string from the extension's secret storage.
 * @returns The saved cookie string, or undefined if not set
 */
export async function loadCookie(
  throwError: boolean = true
): Promise<string | undefined> {
  if (!extensionContext) {
    if (throwError) {
      throw new Error(
        "Cookie store not initialized. Call initializeCookieStore first."
      );
    }
    return undefined;
  }
  return await extensionContext.secrets.get(COOKIE_KEY);
}

/**
 * Clear the saved cookie.
 */
export async function clearCookie(): Promise<void> {
  if (!extensionContext) {
    throw new Error(
      "Cookie store not initialized. Call initializeCookieStore first."
    );
  }
  await extensionContext.secrets.delete(COOKIE_KEY);
}

/**
 * Check if a cookie is saved.
 * @returns true if a cookie is saved, false otherwise
 */
export async function hasCookie(): Promise<boolean> {
  const cookie = await loadCookie();
  return cookie !== undefined;
}
