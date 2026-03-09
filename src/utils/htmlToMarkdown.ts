import { NodeHtmlMarkdown } from "node-html-markdown";

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
      prefix: "$",
      postfix: "$",
      noEscape: true,
    },
  },
  {},
);

export const htmlToMarkdown = (html: string): string => {
  return nhm.translate(html);
};
