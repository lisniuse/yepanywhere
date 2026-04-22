function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderInlineMarkdown(value: string): string {
  let html = escapeHtml(value);

  html = html.replace(
    /`([^`]+)`/g,
    (_match, code: string) => `<code>${escapeHtml(code)}</code>`,
  );

  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, label: string, href: string) =>
      `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`,
  );

  return html;
}

export function renderMarkdownToHtml(markdown: string): string {
  const source = markdown.replace(/\r\n/g, "\n").trim();
  if (!source) {
    return "";
  }

  const lines = source.split("\n");
  const blocks: string[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let codeFence: string[] | null = null;

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }
    blocks.push(
      `<p>${renderInlineMarkdown(paragraphLines.join("<br />"))}</p>`,
    );
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }
    blocks.push(`<ul>${listItems.join("")}</ul>`);
    listItems = [];
  };

  const flushCodeFence = () => {
    if (!codeFence) {
      return;
    }
    blocks.push(
      `<pre><code>${escapeHtml(codeFence.join("\n"))}</code></pre>`,
    );
    codeFence = null;
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      flushParagraph();
      flushList();
      if (codeFence) {
        flushCodeFence();
      } else {
        codeFence = [];
      }
      continue;
    }

    if (codeFence) {
      codeFence.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const listMatch = /^[-*]\s+(.+)$/.exec(line.trim());
    if (listMatch?.[1]) {
      flushParagraph();
      listItems.push(`<li>${renderInlineMarkdown(listMatch[1])}</li>`);
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();
  flushCodeFence();

  return blocks.join("");
}
