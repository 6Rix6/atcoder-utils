import axios from "axios";
import * as cheerio from "cheerio";
import { Element as DomElement } from "domhandler";

export interface SampleInput {
  input: string;
  output: string;
  description?: string;
}

export interface AtCoderProblem {
  language: "english" | "japanese";
  title: string;
  executeConstraints: string;
  bodyHtml: string;
  samples: SampleInput[];
}

async function scrapeAtCoder(
  url: string
): Promise<{ problemEn: AtCoderProblem; problemJp: AtCoderProblem } | null> {
  try {
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    const container = $("#main-container").first();
    const title = container.find("span.h2").contents().first().text().trim();
    const executeConstraints = container.find("p").first().text().trim();

    const bodyEn = container.find("span.lang-en").first();
    const bodyJp = container.find("span.lang-ja").first();

    const problemEn: AtCoderProblem = {
      language: "english",
      title,
      executeConstraints,
      bodyHtml: bodyEn.html()?.trim() ?? "",
      samples: parseSamples($, bodyEn),
    };

    const problemJp: AtCoderProblem = {
      language: "japanese",
      title,
      executeConstraints,
      bodyHtml: bodyJp.html()?.trim() ?? "",
      samples: parseSamples($, bodyJp),
    };

    return { problemEn, problemJp };
  } catch (error) {
    throw error;
  }
}

async function fetchHTML(url: string) {
  try {
    const { data: html } = await axios.get(url);
    return html;
  } catch (error) {
    console.error(`Error fetching HTML from ${url}:`, error);
    throw error;
  }
}

export function parseSamples(
  $: cheerio.CheerioAPI,
  element: cheerio.Cheerio<DomElement>
): SampleInput[] {
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
      const description = outputSection.find("p, ul").html()?.trim() || "";

      samples.push({
        input,
        output,
        description: description || undefined,
      });
    }
  }

  return samples;
}
export default scrapeAtCoder;
