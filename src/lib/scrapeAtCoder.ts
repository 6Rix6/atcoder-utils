import * as vscode from "vscode";
import axios from "axios";
import * as cheerio from "cheerio";
import { Element as DomElement } from "domhandler";
import { getSettingValue } from "../utils/getSettingValue";
import { SETTINGS } from "../consts/appConfig";

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

export const scrapeAtCoder = async (
  url: string
): Promise<AtCoderProblem | null> => {
  try {
    const setting = getSettingValue<"English" | "Japanese">(
      SETTINGS.atCoderLanguage
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

    const body = container.find(`span.lang-${langCode}`).first();

    if (!title || !executeConstraints || !body) {
      throw new Error(`Failed to parse problem page.`);
    }

    const problem: AtCoderProblem = {
      language,
      id,
      url,
      title,
      executeConstraints,
      bodyHtml: body.html()?.trim() ?? "",
      samples: parseSamples($, body),
    };

    return problem;
  } catch (error) {
    throw error;
  }
};

const fetchHTML = async (url: string) => {
  try {
    const { data: html } = await axios.get(url);
    return html;
  } catch (error) {
    console.error(`Error fetching HTML from ${url}:`, error);
    throw error;
  }
};

const parseSamples = (
  $: cheerio.CheerioAPI,
  element: cheerio.Cheerio<DomElement>
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

export const requireTask = async (): Promise<AtCoderProblem | null> => {
  const result = await vscode.window.showInputBox({
    placeHolder: "https://atcoder.jp/contests/.../tasks/...",
    prompt: "Enter AtCoder contest task id or URL",
    password: false,
  });

  if (!result) {
    return null;
  }

  const url = generateAtCoderUrl(result);

  if (!url) {
    vscode.window.showErrorMessage("Invalid AtCoder task id");
    return null;
  }

  try {
    const problem = await scrapeAtCoder(url);
    return problem;
  } catch (error) {
    vscode.window.showErrorMessage(
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
};

const generateAtCoderUrl = (id: string): string | null => {
  const match = id.match(/([a-z0-9]+(?:_[a-z0-9]+)*)$/);

  if (!match) return null;

  const taskId = match[1];

  const parts = taskId.split("_");
  const contestId = parts.slice(0, -1).join("_") || parts[0];

  return `https://atcoder.jp/contests/${contestId.replace(
    /_/g,
    "-"
  )}/tasks/${taskId}`;
};
