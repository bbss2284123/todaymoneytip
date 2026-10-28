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
  const markers = markdownMarkersInVisibleHtml(readFileSync(file, "utf8"));
  return markers.map((marker) => `${path.relative(root, file)}: 보이는 글자에 ${marker}`);
});

if (hits.length) {
  for (const hit of hits) console.error(hit);
  process.exit(1);
}
console.log("HTML에 새어 나온 마크다운 강조가 없습니다.");
