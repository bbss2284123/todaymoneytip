import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { renderExplainer, renderThumb, type ThumbInput } from "../src/thumbnails/render";

const postsDir = path.join(process.cwd(), "src/content/posts");
const outDir = path.join(process.cwd(), "public/thumb");
const explainDir = path.join(process.cwd(), "public/explain");

const sizes = [
  { name: "og", width: 1200, height: 630 },
  { name: "discover", width: 1200, height: 675 },
  { name: "feed", width: 1200, height: 675 },
] as const;

const explainers: Record<string, { title: string; rows: { left: string; right: string }[] }> = {
  "pension-early-or-late": {
    title: "1년 차이, 평생 갑니다",
      rows: [
      { left: "1년 일찍", right: "6% 감소" },
      { left: "1년 미룸", right: "7.2% 증가" },
    ],
  },
  "severance-tax-example": {
    title: "예시. 1억 원, 20년",
    rows: [
      { left: "일시금 소득세", right: "112만 원" },
      { left: "연금 10년 안", right: "78만 4,000원" },
    ],
  },
  "retire-health-dependent": {
    title: "피부양자, 두 칸만 먼저",
    rows: [
      { left: "연 소득", right: "2,000만 원 이하" },
      { left: "재산세 과세표준", right: "5억 4,000만 원 이하" },
    ],
  },
};

async function main() {
  if (!readdirSync(postsDir).length) return;
  mkdirSync(outDir, { recursive: true });
  mkdirSync(explainDir, { recursive: true });
  for (const file of readdirSync(postsDir)) {
    if (!file.endsWith(".mdx")) continue;
    const id = file.replace(/\.mdx$/, "");
    const parsed = matter(readFileSync(path.join(postsDir, file), "utf8"));
    const data = parsed.data as {
      title: string;
      검색어: string;
      category: string;
      thumbStyle?: ThumbInput["style"];
      thumbNumber?: string;
      thumbImage?: string;
    };
    if (data.thumbImage) continue;
    const dir = path.join(outDir, id);
    mkdirSync(dir, { recursive: true });
    for (const size of sizes) {
      const png = await renderThumb({
        title: data.title,
        keyword: data.검색어,
        category: data.category,
        style: data.thumbStyle ?? "question",
        number: data.thumbNumber,
        width: size.width,
        height: size.name === "feed" ? 675 : size.height,
      });
      writeFileSync(path.join(dir, `${size.name}.png`), png);
    }
    const diagram = explainers[id];
    if (diagram) {
      const png = await renderExplainer(diagram.title, diagram.rows);
      writeFileSync(path.join(explainDir, `${id}.png`), png);
    }
    console.log(`thumb ${id}`);
  }
  const fallback = path.join(outDir, "default");
  mkdirSync(fallback, { recursive: true });
  const png = await renderThumb({
    title: "퇴직 전후에 필요한 돈 정보",
    keyword: "은퇴",
    category: "prepare",
    style: "timeline",
    width: 1200,
    height: 630,
  });
  writeFileSync(path.join(fallback, "og.png"), png);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
