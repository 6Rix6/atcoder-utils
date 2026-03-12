import React, { useEffect, useRef } from "react";

import type { WebviewApi } from "vscode-webview";
import katex from "katex";

interface AtCoderProblemRendererProps {
  html: string;
  vscode: WebviewApi<unknown>;
}

export const AtCoderProblemRenderer = ({
  html,
  vscode,
}: AtCoderProblemRendererProps) => {
  const ref = useRef<HTMLDivElement>(null);

  // katex rendering
  useEffect(() => {
    if (!ref.current) return;

    const renderKatex = () => {
      const varElements = ref.current!.querySelectorAll("var");
      varElements.forEach((element) => {
        if (element.classList.contains("katex-rendered")) return;
        const tex = element.textContent || "";
        try {
          katex.render(tex, element, {
            throwOnError: false,
            displayMode: false,
          });
          element.classList.add("katex-rendered");
          element.setAttribute("data-tex", tex);
        } catch (e) {
          console.error(e);
        }
      });
    };

    renderKatex();

    const observer = new MutationObserver(renderKatex);
    observer.observe(ref.current, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleCopySelection = (e: ClipboardEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      if (!ref.current?.contains(range.commonAncestorContainer)) return;

      const container = document.createElement("div");
      container.appendChild(range.cloneContents());

      const varElements = container.querySelectorAll("var.katex-rendered");
      varElements.forEach((el) => {
        const tex = el.getAttribute("data-tex");
        if (tex) {
          el.textContent = tex;
        }
      });

      if (vscode) {
        e.preventDefault();
        vscode.postMessage({
          command: "copyMdSelection",
          html: container.innerHTML,
        });
      } else {
        e.clipboardData?.setData("text/plain", container.innerText);
        e.preventDefault();
      }
    };

    window.addEventListener("copy", handleCopySelection);
    return () => window.removeEventListener("copy", handleCopySelection);
  }, []);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
};
