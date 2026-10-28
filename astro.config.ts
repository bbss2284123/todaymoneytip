import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import { writeFileSync } from "node:fs";
import { siteConfig } from "./site.config";
import { highlightParts } from "./src/lib/highlight";
import { headingSlug } from "./src/lib/slug";

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function textOf(node?: HastNode): string {
  if (!node) return "";
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textOf).join("");
}

function rehypeArticle() {
  return (tree: HastNode) => {
    const visit = (node: HastNode) => {
      if (!node.children) return;
      node.children = node.children.map((child) => {
        if (child.type === "element" && child.tagName && /^h[23]$/.test(child.tagName)) {
          child.properties = { ...(child.properties ?? {}), id: headingSlug(textOf(child)) };
        }
        if (child.type === "element" && child.tagName === "table") {
          const thead = child.children?.find((item) => item.tagName === "thead");
          const headerRow = thead?.children?.find((item) => item.tagName === "tr");
          const headers = (headerRow?.children ?? [])
            .filter((item) => item.tagName === "th")
            .map((item) => textOf(item).trim());
          for (const row of child.children ?? []) {
            const rows = row.tagName === "tbody" ? row.children ?? [] : row.tagName === "tr" ? [row] : [];
            for (const tr of rows) {
              if (tr.tagName !== "tr") continue;
              let index = 0;
              for (const cell of tr.children ?? []) {
                if (cell.tagName !== "td") continue;
                cell.properties = { ...(cell.properties ?? {}), dataLabel: headers[index] ?? "" };
                index += 1;
              }
            }
          }
          return {
            type: "element",
            tagName: "div",
            properties: { className: ["table-scroll"] },
            children: [child],
          } as HastNode;
        }
        visit(child);
        return child;
      });
    };
    visit(tree);
  };
}

function remarkHighlight() {
  return (tree: { children?: unknown[] }) => {
    const walk = (node: { type?: string; value?: string; children?: unknown[] }) => {
      if (!node.children) return;
      const next: unknown[] = [];
      for (const child of node.children as { type?: string; value?: string; children?: unknown[] }[]) {
        if (child.type === "text" && child.value?.includes("==")) {
          for (const part of highlightParts(child.value)) {
            if (part.mark) {
              next.push({
                type: "mdxJsxTextElement",
                name: "mark",
                attributes: [{ type: "mdxJsxAttribute", name: "class", value: "mark" }],
                children: [{ type: "text", value: part.text }],
              });
            } else {
              next.push({ type: "text", value: part.text });
            }
          }
          continue;
        }
        walk(child);
        next.push(child);
      }
      node.children = next;
    };
    walk(tree as { type?: string; value?: string; children?: unknown[] });
  };
}

export default defineConfig({
  site: siteConfig.url,
  output: "static",
  trailingSlash: "always",
  build: { format: "directory" },
  integrations: [
    mdx(),
    {
      name: "indexnow-key",
      hooks: {
        "astro:build:done": ({ dir }) => {
          const file = new URL(`${siteConfig.indexNowKey}.txt`, dir);
          writeFileSync(file, siteConfig.indexNowKey);
        },
      },
    },
  ],
  markdown: {
    gfm: true,
    remarkPlugins: [remarkHighlight],
    rehypePlugins: [rehypeArticle],
  },
});
