import { NodeHtmlMarkdown } from "node-html-markdown";
import { getSettingValue } from "./getSettingValue";
import { SETTINGS } from "../consts/appConfig";

const defaultDelimiter = "$";

const nhm = new NodeHtmlMarkdown(
  {
    bulletMarker: "-",
  },
  {
    pre: {
      prefix: "```\n",
      postfix: "```",
      noEscape: true,
    },
    var: {
      prefix: defaultDelimiter,
      postfix: defaultDelimiter,
      noEscape: true,
    },
  },
  {},
);

export const htmlToMarkdown = (html: string): string => {
  const delimiter = getSettingValue<string>(SETTINGS.texDelimiterMd);
  nhm.translators.set("var", {
    prefix: delimiter ?? defaultDelimiter,
    postfix: delimiter ?? defaultDelimiter,
    noEscape: true,
  });
  return nhm.translate(html);
};
