import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import { writeFileSync } from "node:fs";
import { siteConfig } from "./site.config";

function rehypeTables() {
  return (tree: { children?: unknown[] }) => {
    const visit = (node: { children?: { type: string; tagName?: string }[] }) => {
      if (!node.children) return;
      node.children = node.children.map((child) => {
        if (child.type === "element" && child.tagName === "table") {
          return {
            type: "element",
            tagName: "div",
            properties: { className: ["table-scroll"] },
            children: [child],
          };
        }
        visit(child as { children?: { type: string; tagName?: string }[] });
        return child;
      });
    };
    visit(tree as { children?: { type: string; tagName?: string }[] });
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
    rehypePlugins: [rehypeTables],
  },
});
