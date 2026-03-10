import * as vscode from "vscode";
import axios from "axios";
import * as cheerio from "cheerio";
import { Element as DomElement } from "domhandler";
import { getSettingValue } from "../utils/getSettingValue";
import { SETTINGS } from "../consts/appConfig";
import { loadCookie } from "../utils/cookieStore";

export interface SampleInput {
  input: string;
  output: string;
}

export interface AtCoderProblem {
  language: "English" | "Japanese";
  id: string;
  url: string;
  title: string;
  executeConstraints: string;
  bodyHtml: string;
  samples: SampleInput[];
}

export interface AtCoderContest {
  id: string;
  url: string;
  title: string;
  beginAt: Date;
  endAt: Date;
  durationMinutes: number;
  problems: ProblemLink[];
}

export interface ProblemLink {
  id: string;
  url: string;
  name?: string;
  timeLimit?: string;
  memoryLimit?: string;
  submitUrl?: string;
}

export const requestTask = async (): Promise<AtCoderProblem | null> => {
  const result = await vscode.window.showInputBox({
    placeHolder: "https://atcoder.jp/contests/.../tasks/...",
    prompt: "Enter AtCoder task ID or URL",
    password: false,
  });

  if (!result) {
    return null;
  }

  const url = generateTaskUrl(result);

  if (!url) {
    vscode.window.showErrorMessage("Invalid AtCoder task id");
    return null;
  }

  try {
    const problem = await scrapeTask(url);
    return problem;
  } catch (error) {
    vscode.window.showErrorMessage(
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
};

export const requestContest = async (): Promise<AtCoderContest | null> => {
  const result = await vscode.window.showInputBox({
    placeHolder: "https://atcoder.jp/contests/...",
    prompt: "Enter AtCoder contest ID or URL",
    password: false,
  });

  if (!result) {
    return null;
  }

  const url = generateContestUrl(result);

  if (!url) {
    vscode.window.showErrorMessage("Invalid AtCoder contest id");
    return null;
  }

  try {
    const contest = await scrapeContest(url);
    return contest;
  } catch (error) {
    vscode.window.showErrorMessage(
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
};

export const getTaskFromUrlOrId = async (
  urlOrId: string,
): Promise<AtCoderProblem | null> => {
  const url = generateTaskUrl(urlOrId);
  if (!url) {
    vscode.window.showErrorMessage("Invalid AtCoder task id");
    return null;
  }
  try {
    const problem = await scrapeTask(url);
    return problem;
  } catch (error) {
    vscode.window.showErrorMessage(
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
};

export const scrapeTask = async (
  url: string,
): Promise<AtCoderProblem | null> => {
  try {
    const setting = getSettingValue<"English" | "Japanese">(
      SETTINGS.atCoderLanguage,
    );
    const language = setting ?? "English";

    const langCode = getLanguageCode(language);
    const targetUrl = updateLangParam(url, langCode);

    const html = await fetchHTML(targetUrl);
    const $ = cheerio.load(html);

    const id = url.split("/").pop()?.split("?").shift() ?? "";
    const container = $("#main-container").first();
    const title = container.find("span.h2").contents().first().text().trim();
    const executeConstraints = container.find("p").first().text().trim();

    let body = container.find(`span.lang-${langCode}`).first();
    if (body.length === 0) {
      body = container.find("div#task-statement").first();
    }

    if (!title || !executeConstraints || !body.html()) {
      throw new Error(`Failed to parse problem page.`);
    }

    const problem: AtCoderProblem = {
      language,
      id,
      url,
      title,
      executeConstraints,
      bodyHtml: body.html()?.trim() ?? "",
      samples: extractSamples($, body),
    };

    return problem;
  } catch (error) {
    throw error;
  }
};

/**
 * Scrape contest information from the contest page and tasks page.
 */
export const scrapeContest = async (
  url: string,
): Promise<AtCoderContest | null> => {
  try {
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);
    const id = url.split("/contests/")[1].replace(/\/$/, "");

    const title =
      $(".contest-title").text().trim() ||
      $("h1.text-center").first().text().trim();

    const contestDuration = $("small.contest-duration");
    const timeElements = contestDuration.find("time");
    const beginAt = new Date(timeElements.eq(0).html() || "");
    const endAt = new Date(timeElements.eq(1).html() || "");

    const durationMinutes = Math.floor(
      (endAt.getTime() - beginAt.getTime()) / 1000 / 60,
    );

    const extractProblems = (selector: string): ProblemLink[] => {
      const problems: ProblemLink[] = [];

      $(`${selector} table tbody tr`).each((_, row) => {
        const problemNames = $(row).find("td").first().text().trim().split(",");

        problemNames.forEach((name) => {
          const normalized = name.trim() === "Ex" ? "H" : name.trim();

          if (/^[A-Z]\d?$/.test(normalized)) {
            const problemId = `${id}_${normalized.toLowerCase()}`;
            problems.push({
              id: problemId,
              url: `https://atcoder.jp/contests/${id}/tasks/${problemId}`,
              name: name.trim(),
              submitUrl: `https://atcoder.jp/contests/${id}/submit?taskScreenName=${problemId}`,
            });
          }
        });
      });

      return problems;
    };

    const problems: ProblemLink[] = [];
    const fromTasksPage = await scrapeProblemsFromTasksPage(url, id);
    if (fromTasksPage && fromTasksPage.length > 0) {
      problems.push(...fromTasksPage);
    } else {
      const jaProblems = extractProblems(".lang-ja");
      problems.push(
        ...(jaProblems.length > 0 ? jaProblems : extractProblems(".lang-en")),
      );
    }

    return { id, url, title, beginAt, endAt, durationMinutes, problems };
  } catch (error) {
    throw error;
  }
};

/**
 * Try to scrape problems from the tasks page.
 * Return `null` if tasks page is not accessible.
 * @param url contest **root** page's url.
 * @param id contest id.
 */
const scrapeProblemsFromTasksPage = async (
  url: string,
  id: string,
): Promise<ProblemLink[] | null> => {
  try {
    const html = await fetchHTML(`${url}/tasks`);
    const $ = cheerio.load(html);
    const problems: ProblemLink[] = [];

    $("table.table-bordered tbody tr").each((_, row) => {
      const $row = $(row);

      const idElm = $row.find("td:nth-child(1) a");
      const taskId =
        idElm.attr("href")?.split("/tasks/")[1] ?? idElm.text().trim();
      const nameElm = $row.find("td:nth-child(2) a");
      const name = `${idElm.text().trim()} - ${nameElm.text().trim()}`;
      const taskUrl = nameElm.attr("href") ?? `/contests/${id}/tasks/${taskId}`;
      const timeLimit = $row.find("td:nth-child(3)").text().trim();
      const memoryLimit = $row.find("td:nth-child(4)").text().trim();
      const submitUrl =
        $row.find("td:nth-child(5) a").attr("href") ??
        `/contests/${id}/submit?taskScreenName=${taskId}`;

      if (taskId && name) {
        problems.push({
          id: taskId,
          name,
          url: `https://atcoder.jp${taskUrl}`,
          timeLimit,
          memoryLimit,
          submitUrl: `https://atcoder.jp${submitUrl}`,
        });
      }
    });

    return problems;
  } catch (error) {
    return null;
  }
};

/**
 * Fetch HTML from the given URL with cookie.
 */
const fetchHTML = async (url: string) => {
  try {
    const cookie = await loadCookie(false);
    const headers = cookie
      ? {
          Cookie: `REVEL_SESSION=${cookie};`,
        }
      : undefined;
    const { data: html } = await axios.get(url, {
      headers,
    });
    return html;
  } catch (error) {
    console.error(`Error fetching HTML from ${url}:`, error);
    throw error;
  }
};

/**
 * Extract samples from the problem page.
 */
const extractSamples = (
  $: cheerio.CheerioAPI,
  element: cheerio.Cheerio<DomElement>,
): SampleInput[] => {
  const samples: SampleInput[] = [];

  const sampleSections = element.find(".part").filter((i, el) => {
    const heading = $(el).find("h3").first().text();
    return (
      heading.includes("入力例") ||
      heading.includes("出力例") ||
      heading.includes("Sample Input") ||
      heading.includes("Sample Output")
    );
  });
  for (let i = 0; i < sampleSections.length; i += 2) {
    const inputSection = $(sampleSections[i]);
    const outputSection = $(sampleSections[i + 1]);

    if (inputSection.length && outputSection.length) {
      const input = inputSection.find("pre").first().text().trim();
      const output = outputSection.find("pre").first().text().trim();

      samples.push({
        input,
        output,
      });
    }
  }

  return samples;
};

const getLanguageCode = (language: "English" | "Japanese") => {
  return language === "Japanese" ? "ja" : "en";
};

const updateLangParam = (url: string, langCode: string) => {
  const urlObj = new URL(url);

  // Set or update the 'lang' parameter
  urlObj.searchParams.set("lang", langCode);

  return urlObj.toString();
};

const generateTaskUrl = (id: string): string | null => {
  const match = id.match(/([a-z0-9]+(?:_[a-z0-9]+)*)$/);

  if (!match) return null;

  const taskId = match[1];

  const parts = taskId.split("_");
  const contestId = parts.slice(0, -1).join("_") || parts[0];

  return `https://atcoder.jp/contests/${contestId.replace(
    /_/g,
    "-",
  )}/tasks/${taskId}`;
};

const generateContestUrl = (id: string): string | null => {
  const urlMatch = id.match(/atcoder\.jp\/contests\/([^/]+)/);

  if (urlMatch) {
    const contestId = urlMatch[1];
    return `https://atcoder.jp/contests/${contestId}`;
  }

  const match = id.match(/([^/]+)\/?$/);

  if (!match) return null;

  const contestId = match[1].replace(/\/$/, "");

  return `https://atcoder.jp/contests/${contestId}`;
};
