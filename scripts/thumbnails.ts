import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import sharp from "sharp";
import { renderCaption, renderExplainer, renderThumb, type ThumbInput } from "../src/thumbnails/render";

const postsDir = path.join(process.cwd(), "src/content/posts");
const outDir = path.join(process.cwd(), "public/thumb");
const explainDir = path.join(process.cwd(), "public/explain");
const artifactDir = "/opt/cursor/artifacts";

const styles = ["number", "compare", "question", "checklist", "timeline"] as const;
const styleName: Record<(typeof styles)[number], string> = {
  number: "숫자",
  compare: "비교",
  question: "질문",
  checklist: "체크",
  timeline: "시간",
};

const explainers: Record<string, { title: string; rows: { left: string; right: string }[] }> = {
  "pension-early-defer": {
    title: "1년 차이, 평생 갑니다",
    rows: [
      { left: "1년 일찍", right: "6% 감소" },
      { left: "1년 미룸", right: "7.2% 증가" },
    ],
  },
  "severance-tax": {
    title: "예시. 1억 원, 20년",
    rows: [
      { left: "일시금 소득세", right: "112만 원" },
      { left: "연금 10년 안", right: "78만 4,000원" },
    ],
  },
  "health-dependent": {
    title: "피부양자, 두 칸만 먼저",
    rows: [
      { left: "연 소득", right: "2,000만 원 이하" },
      { left: "재산세 과세표준", right: "5억 4,000만 원 이하" },
    ],
  },
};

async function sheet(cells: { caption: string; png: Buffer }[], cols: number, cellWidth: number): Promise<Buffer> {
  const probed = await sharp(cells[0].png).metadata();
  const cellHeight = Math.round(((probed.height ?? 630) * cellWidth) / (probed.width ?? 1200));
  const labelH = 36;
  const gap = 16;
  const width = gap + cols * (cellWidth + gap);
  const rows = Math.ceil(cells.length / cols);
  const height = gap + rows * (labelH + cellHeight + gap);
  const composites: sharp.OverlayOptions[] = [];
  for (let i = 0; i < cells.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const left = gap + col * (cellWidth + gap);
    const top = gap + row * (labelH + cellHeight + gap);
    const image = await sharp(cells[i].png).resize(cellWidth, cellHeight).png().toBuffer();
    const caption = await renderCaption(cells[i].caption, cellWidth);
    composites.push({ input: caption, left, top });
    composites.push({ input: image, left, top: top + labelH });
  }
  return sharp({ create: { width, height, channels: 3, background: "#ffffff" } }).composite(composites).png().toBuffer();
}

async function main() {
  if (!readdirSync(postsDir).length) return;
  mkdirSync(outDir, { recursive: true });
  mkdirSync(explainDir, { recursive: true });
  mkdirSync(artifactDir, { recursive: true });
  const sheetCells: { caption: string; png: Buffer }[] = [];
  const smallCells: { caption: string; png: Buffer }[] = [];

  for (const file of readdirSync(postsDir).filter((name) => name.endsWith(".mdx")).sort()) {
    const id = file.replace(/\.mdx$/, "");
    const parsed = matter(readFileSync(path.join(postsDir, file), "utf8"));
    const data = parsed.data as {
      title: string;
      검색어: string;
      category: string;
      thumbStyle?: ThumbInput["style"];
      thumbTitle?: string;
      thumbNumber?: string;
      thumbImage?: string;
    };
    if (data.thumbImage) continue;
    const dir = path.join(outDir, id);
    mkdirSync(dir, { recursive: true });
    const base = {
      title: data.thumbTitle || data.title,
      keyword: data.검색어,
      category: data.category,
      number: data.thumbNumber,
    };
    for (const style of styles) {
      const png = await renderThumb({ ...base, style, width: 1200, height: 630 });
      writeFileSync(path.join(dir, `${style}.png`), png);
      const caption = `${data.검색어} · ${styleName[style]}`;
      sheetCells.push({ caption, png });
      smallCells.push({ caption, png: await sharp(png).resize(300).png().toBuffer() });
      if (style === (data.thumbStyle ?? "question")) {
        writeFileSync(path.join(dir, "og.png"), png);
        const discover = await renderThumb({ ...base, style, width: 1200, height: 675 });
        writeFileSync(path.join(dir, "discover.png"), discover);
        writeFileSync(path.join(dir, "feed.png"), discover);
        writeFileSync(path.join(artifactDir, `${id}-og.png`), png);
        writeFileSync(path.join(artifactDir, `${id}-w300.png`), await sharp(png).resize(300).png().toBuffer());
      }
    }
    const diagram = explainers[id];
    if (diagram) writeFileSync(path.join(explainDir, `${id}.png`), await renderExplainer(diagram.title, diagram.rows));
    console.log(`thumb ${id}`);
  }

  const fallback = path.join(outDir, "default");
  mkdirSync(fallback, { recursive: true });
  writeFileSync(
    path.join(fallback, "og.png"),
    await renderThumb({
      title: "퇴직 전후에 필요한 돈 정보",
      keyword: "은퇴",
      category: "prepare",
      style: "timeline",
      width: 1200,
      height: 630,
    }),
  );

  const contact = await sheet(sheetCells, 5, 460);
  const contactSmall = await sheet(smallCells, 5, 300);
  writeFileSync(path.join(outDir, "contact-sheet.png"), contact);
  writeFileSync(path.join(artifactDir, "contact-sheet.png"), contact);
  writeFileSync(path.join(artifactDir, "contact-sheet-300.png"), contactSmall);
  console.log(`contact ${sheetCells.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
