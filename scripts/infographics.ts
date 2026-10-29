import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import sharp from "sharp";
import { figures } from "../src/infographics/catalog";
import { CATEGORY_ACCENT, renderFigure } from "../src/infographics/render";
import { figurePlain } from "../src/infographics/text";
import { FRAME } from "../src/infographics/types";
import { loadFacts, missingNumbers } from "../src/lib/check";
import { renderCaption } from "../src/thumbnails/render";

const postsDir = path.join(process.cwd(), "src/content/posts");
const outDir = path.join(process.cwd(), "public/figures");

function artifactsDir(): string | null {
  const raw = process.env.ARTIFACTS_DIR?.trim();
  if (!raw) return null;
  return path.resolve(raw);
}

async function contactSheet(cells: { caption: string; png: Buffer }[]): Promise<Buffer> {
  const cols = 2;
  const cellWidth = 640;
  const gap = 16;
  const labelH = 36;
  const sized = await Promise.all(
    cells.map(async (cell) => {
      const meta = await sharp(cell.png).metadata();
      const height = Math.round(((meta.height ?? 450) * cellWidth) / (meta.width ?? 800));
      const image = await sharp(cell.png).resize(cellWidth, height).png().toBuffer();
      const caption = await renderCaption(cell.caption, cellWidth);
      return { image, caption, height };
    }),
  );
  const rows = Math.ceil(sized.length / cols);
  const rowHeights: number[] = [];
  for (let row = 0; row < rows; row++) {
    const slice = sized.slice(row * cols, row * cols + cols);
    rowHeights.push(Math.max(...slice.map((cell) => cell.height)));
  }
  const width = gap + cols * (cellWidth + gap);
  const height = gap + rowHeights.reduce((sum, row) => sum + labelH + row + gap, 0);
  const composites: sharp.OverlayOptions[] = [];
  let top = gap;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = sized[row * cols + col];
      if (!cell) continue;
      const left = gap + col * (cellWidth + gap);
      composites.push({ input: cell.caption, left, top });
      composites.push({ input: cell.image, left, top: top + labelH });
    }
    top += labelH + rowHeights[row] + gap;
  }
  return sharp({ create: { width, height, channels: 3, background: "#f6f5f2" } }).composite(composites).png().toBuffer();
}

async function main() {
  const files = readdirSync(postsDir).filter((name) => name.endsWith(".mdx")).sort();
  const ids = files.map((name) => name.replace(/\.mdx$/, ""));
  const missingCatalog = ids.filter((id) => !figures[id]);
  const extra = Object.keys(figures).filter((id) => !ids.includes(id));
  if (missingCatalog.length || extra.length) {
    throw new Error(`그림 목록 불일치. 없음 ${missingCatalog.join(",")} / 남음 ${extra.join(",")}`);
  }

  mkdirSync(outDir, { recursive: true });
  const sheet: { caption: string; png: Buffer }[] = [];
  for (const file of files) {
    const id = file.replace(/\.mdx$/, "");
    const parsed = matter(readFileSync(path.join(postsDir, file), "utf8"));
    const category = String(parsed.data.category ?? "prepare");
    const accent = CATEGORY_ACCENT[category] ?? "#1f5fbf";
    const facts = loadFacts(path.join(process.cwd(), "work", id, "facts.yaml"));
    const dir = path.join(outDir, id);
    mkdirSync(dir, { recursive: true });
    for (const fig of figures[id]) {
      const missing = missingNumbers(figurePlain(fig), facts);
      if (missing.length) throw new Error(`${id}/${fig.id} 원장에 없는 숫자: ${missing.join(", ")}`);
      const { png, webp } = await renderFigure(fig, accent, category);
      writeFileSync(path.join(dir, `${fig.id}.png`), png);
      writeFileSync(path.join(dir, `${fig.id}.webp`), webp);
      const { width, height } = FRAME[fig.ratio];
      if (png.length < 500) throw new Error(`${id}/${fig.id} 파일이 너무 작습니다.`);
      sheet.push({ caption: `${id} · ${fig.id} · ${width}×${height}`, png });
    }
    console.log(`figure ${id} ${figures[id].length}`);
  }

  const contact = await contactSheet(sheet);
  writeFileSync(path.join(outDir, "contact-sheet.png"), contact);
  const artifactDir = artifactsDir() ?? "/opt/cursor/artifacts";
  mkdirSync(artifactDir, { recursive: true });
  writeFileSync(path.join(artifactDir, "infographics-contact-sheet.png"), contact);
  console.log(`contact ${sheet.length} images, ${contact.length} bytes`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
