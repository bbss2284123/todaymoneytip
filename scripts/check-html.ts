import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { markdownMarkersInVisibleHtml } from "../src/lib/check";

function htmlFiles(dir: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) found.push(...htmlFiles(full));
    else if (name.endsWith(".html")) found.push(full);
  }
  return found;
}

const root = path.join(process.cwd(), "dist");
const hits = htmlFiles(root).flatMap((file) => {
  const html = readFileSync(file, "utf8");
  const markers = markdownMarkersInVisibleHtml(html);
  const problems = markers.map((marker) => `${path.relative(root, file)}: 보이는 글자에 ${marker}`);
  if (/href=["'][^"']*\/author\/?/i.test(html)) {
    problems.push(`${path.relative(root, file)}: /author/ 링크가 남아 있습니다.`);
  }
  if (html.includes("contact@todaymoneytip.com")) {
    problems.push(`${path.relative(root, file)}: 이전 문의 메일이 남아 있습니다.`);
  }
  return problems;
});

const sitemap = path.join(root, "sitemap.xml");
const sitemapBody = readFileSync(sitemap, "utf8");
if (sitemapBody.includes("/author")) {
  hits.push("sitemap.xml: /author/ 가 남아 있습니다.");
}

if (hits.length) {
  for (const hit of hits) console.error(hit);
  process.exit(1);
}
console.log("HTML에 새어 나온 마크다운 강조가 없습니다.");
console.log("글쓴이 페이지 링크와 이전 문의 메일이 없습니다.");
