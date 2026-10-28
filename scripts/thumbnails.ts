import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import sharp from "sharp";
import { renderCaption, renderExplainer, renderThumb, type ThumbInput } from "../src/thumbnails/render";

const postsDir = path.join(process.cwd(), "src/content/posts");
const outDir = path.join(process.cwd(), "public/thumb");
const explainDir = path.join(process.cwd(), "public/explain");

/** Extra review copies. Unset on Cloudflare so the build never touches a machine path. */
function artifactsDir(): string | null {
  const raw = process.env.ARTIFACTS_DIR?.trim();
  if (!raw) return null;
  return path.resolve(raw);
}

const styles = ["number", "compare", "question", "checklist", "timeline"] as const;
const styleName: Record<(typeof styles)[number], string> = {
  number: "숫자",
  compare: "비교",
  question: "질문",
  checklist: "체크",
  timeline: "시간",
};

const cards: Record<string, Omit<ThumbInput, "title" | "keyword" | "category" | "style" | "width" | "height">> = {
  "pension-early-defer": {
    lines: ["1년 일찍 −6%", "미루면 +7.2%"],
    caption: "비율은 평생 갑니다",
    hero: "−6%",
    heroLabel: "1년마다",
    compare: { leftLabel: "1년 일찍", left: "−6%", rightLabel: "1년 늦게", right: "+7.2%", signed: true },
    checks: ["가입 10년 이상", "감액은 평생", "부양가족연금 제외"],
    steps: ["조기수령", "정상 개시", "1년 연기", "5년 한도"],
  },
  "severance-tax": {
    lines: ["일시금 112만", "연금은 −30%"],
    caption: "10년 안이면 세액의 70%",
    hero: "−30%",
    heroLabel: "10년 안",
    compare: { leftLabel: "일시금", left: "112만", rightLabel: "10년 연금", right: "78만4천", signed: false },
    checks: ["근속 연수 확인", "10년 안은 70%", "운용수익은 제외"],
    steps: ["퇴직할 때", "일시금", "10년 연금", "20년 이후"],
  },
  "health-dependent": {
    lines: ["소득 2,000만", "넘으면 탈락?"],
    caption: "재산 9억 초과도 탈락",
    hero: "9억",
    heroLabel: "넘으면 탈락",
    compare: { leftLabel: "소득 한도", left: "2,000만", rightLabel: "재산 한도", right: "9억", signed: false },
    checks: ["소득 2,000만 원", "9억 넘으면 탈락", "사이는 1,000만"],
    steps: ["퇴직 전", "퇴직 당일", "90일 신고", "지역보험"],
  },
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
    title: "피부양자 탈락, 두 기준",
    rows: [
      { left: "연 소득", right: "2,000만 원 초과면 탈락" },
      { left: "과세표준 9억 초과", right: "소득과 관계없이 탈락" },
      { left: "5억 4천만 초과, 9억 이하", right: "소득 1,000만 원 이하만" },
    ],
  },
};

async function sheet(cells: { caption: string; png: Buffer }[], cols: number, cellWidth: number): Promise<Buffer> {
  const probed = await sharp(cells[0].png).metadata();
  const cellHeight = Math.round(((probed.height ?? 630) * cellWidth) / (probed.width ?? 1200));
  const labelH = 40;
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

function writeArtifact(dir: string | null, name: string, data: Buffer) {
  if (!dir) return;
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, name), data);
}

async function main() {
  if (!readdirSync(postsDir).length) return;
  const artifactDir = artifactsDir();
  mkdirSync(outDir, { recursive: true });
  mkdirSync(explainDir, { recursive: true });
  if (!artifactDir) console.log("ARTIFACTS_DIR is unset; skipping extra artifact copies");
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
      ...cards[id],
    };
    for (const style of styles) {
      const png = await renderThumb({ ...base, style, width: 1200, height: 630 });
      writeFileSync(path.join(dir, `${style}.png`), png);
      const caption = `${data.검색어} · ${styleName[style]}`;
      sheetCells.push({ caption, png });
      if (artifactDir) smallCells.push({ caption, png: await sharp(png).resize(300).png().toBuffer() });
      if (style === (data.thumbStyle ?? "question")) {
        writeFileSync(path.join(dir, "og.png"), png);
        const discover = await renderThumb({ ...base, style, width: 1200, height: 675 });
        writeFileSync(path.join(dir, "discover.png"), discover);
        writeFileSync(path.join(dir, "feed.png"), discover);
        writeArtifact(artifactDir, `${id}-og.png`, png);
        if (artifactDir) writeArtifact(artifactDir, `${id}-w300.png`, await sharp(png).resize(300).png().toBuffer());
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
      lines: ["퇴직 전후", "돈의 순서"],
      steps: ["퇴직 전", "퇴직 당일", "다음 달", "그 이후"],
      width: 1200,
      height: 630,
    }),
  );

  const contact = await sheet(sheetCells, 5, 680);
  writeFileSync(path.join(outDir, "contact-sheet.png"), contact);
  writeArtifact(artifactDir, "contact-sheet.png", contact);
  if (artifactDir && smallCells.length) {
    writeArtifact(artifactDir, "contact-sheet-300.png", await sheet(smallCells, 5, 300));
  }
  console.log(`contact ${sheetCells.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
