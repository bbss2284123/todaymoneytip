import { readFileSync } from "node:fs";
import path from "node:path";
import satori from "satori";
import sharp from "sharp";
import { fitLines } from "./fit";

export interface ThumbInput {
  title: string;
  keyword: string;
  category: string;
  style: "number" | "question" | "compare" | "checklist" | "timeline";
  number?: string;
  width: number;
  height: number;
}

const PALETTE: Record<string, { from: string; to: string; chip: string; chipText: string; icon: string }> = {
  prepare: { from: "#1f5fbf", to: "#163e86", chip: "#dbe8ff", chipText: "#12356e", icon: "calendar" },
  pension: { from: "#1f5fbf", to: "#0f3f86", chip: "#ffe7a3", chipText: "#5c3b00", icon: "landmark" },
  severance: { from: "#2457a8", to: "#17386e", chip: "#ffd7c2", chipText: "#6a2e12", icon: "receipt" },
  basic: { from: "#1c5cad", to: "#12407a", chip: "#d9f5ea", chipText: "#0e4a38", icon: "users" },
  health: { from: "#1a6aa8", to: "#0e3f6e", chip: "#d7f3e8", chipText: "#0d4a36", icon: "heart-pulse" },
  job: { from: "#1f5fbf", to: "#1a3f78", chip: "#e7e0ff", chipText: "#2c2170", icon: "briefcase" },
  housing: { from: "#1e5a9e", to: "#143860", chip: "#ffe8c4", chipText: "#6a3e08", icon: "house" },
  tax: { from: "#274e96", to: "#1a305f", chip: "#fde2e1", chipText: "#6d2420", icon: "banknote" },
  assets: { from: "#1f5fbf", to: "#18457a", chip: "#e5f4d8", chipText: "#24520f", icon: "coins" },
  business: { from: "#2a568f", to: "#173252", chip: "#fdecc8", chipText: "#6a4a10", icon: "shield" },
};

let fontData: Buffer | null = null;
const iconCache = new Map<string, string>();

function font(): Buffer {
  if (!fontData) {
    fontData = readFileSync(path.join(process.cwd(), "assets/fonts/Pretendard-SemiBold.otf"));
  }
  return fontData;
}

async function iconSrc(name: string): Promise<string> {
  const cached = iconCache.get(name);
  if (cached) return cached;
  const svg = readFileSync(path.join(process.cwd(), "src/thumbnails/icons", `${name}.svg`), "utf8").replace(
    /currentColor/g,
    "#ffffff",
  );
  const png = await sharp(Buffer.from(svg)).resize(128, 128).png().toBuffer();
  const uri = `data:image/png;base64,${png.toString("base64")}`;
  iconCache.set(name, uri);
  return uri;
}

function node(style: Record<string, unknown>, children: unknown): unknown {
  return { type: "div", props: { style: { display: "flex", ...style }, children } };
}

export async function renderThumb(input: ThumbInput): Promise<Buffer> {
  const palette = PALETTE[input.category] ?? PALETTE.pension;
  const pad = Math.round(input.width * 0.045);
  const inner = input.width - pad * 2;
  const fitted = fitLines(input.title, inner, input.width >= 1000 ? 68 : 54, 36);
  const icon = await iconSrc(palette.icon);
  const svg = await satori(card(input, palette, pad, fitted, icon) as React.ReactNode, {
    width: input.width,
    height: input.height,
    fonts: [{ name: "Pretendard", data: font(), weight: 600, style: "normal" }],
  });
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function card(
  input: ThumbInput,
  palette: { from: string; to: string; chip: string; chipText: string },
  pad: number,
  fitted: { lines: string[]; size: number },
  icon: string,
): unknown {
  const title = node(
    { flexDirection: "column", gap: 6 },
    fitted.lines.map((line) =>
      node(
        { fontSize: fitted.size, fontWeight: 700, color: "#ffffff", lineHeight: 1.25, letterSpacing: -0.5 },
        line,
      ),
    ),
  );
  const chip = node(
    {
      background: palette.chip,
      color: palette.chipText,
      fontSize: 28,
      fontWeight: 700,
      padding: "10px 18px",
      borderRadius: 999,
    },
    input.keyword,
  );
  const mark = node({ alignItems: "center", gap: 10 }, [
    node(
      { width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
      { type: "img", props: { src: icon, width: 22, height: 22 } },
    ),
    node({ fontSize: 24, color: "#ffffff" }, "오늘의 머니팁"),
  ]);
  const top = node({ flexDirection: "column", alignItems: "flex-start", gap: 14, marginBottom: 8 }, [chip, mark]);

  let body: unknown = node({ flexDirection: "column", gap: 20 }, [top, title]);
  if (input.style === "number" && input.number) {
    body = node({ flexDirection: "column", gap: 18 }, [
      top,
      node({ fontSize: input.width >= 1000 ? 108 : 84, fontWeight: 700, color: "#ffffff", letterSpacing: -2 }, input.number),
      title,
    ]);
  } else if (input.style === "compare" && input.number?.includes("/")) {
    const [left, right] = input.number.split("/").map((part) => part.trim());
    body = node({ flexDirection: "column", gap: 22 }, [
      top,
      node({ gap: 16 }, [
        pillar("일찍", left, "rgba(255,255,255,0.14)"),
        pillar("미룸", right, "rgba(255,255,255,0.24)"),
      ]),
      title,
    ]);
  } else if (input.style === "checklist") {
    body = node({ flexDirection: "column", gap: 16 }, [
      top,
      title,
      node({ flexDirection: "column", gap: 10, marginTop: 8 }, ["기준일을 봐요", "내 숫자를 넣어요", "공식 안내와 맞춰요"].map((item) =>
        node({ fontSize: 30, color: "#ffffff", alignItems: "center", gap: 12 }, [
          node({ width: 28, height: 28, borderRadius: 8, background: "#ffffff", color: palette.to, alignItems: "center", justifyContent: "center", fontSize: 20 }, "✓"),
          item,
        ]),
      )),
    ]);
  } else if (input.style === "timeline") {
    body = node({ flexDirection: "column", gap: 18 }, [
      top,
      node({ gap: 18, alignItems: "center" }, ["퇴직 전", "당일", "이후"].map((label, index) =>
        node({ flexDirection: "column", alignItems: "center", gap: 8 }, [
          node({ width: 22, height: 22, borderRadius: 11, background: index === 1 ? "#ffffff" : "rgba(255,255,255,0.45)" }, ""),
          node({ fontSize: 26, color: "#ffffff" }, label),
        ]),
      )),
      title,
    ]);
  }

  return node(
    {
      width: input.width,
      height: input.height,
      padding: pad,
      flexDirection: "column",
      backgroundImage: `linear-gradient(145deg, ${palette.from} 0%, ${palette.to} 100%)`,
      color: "#ffffff",
      fontFamily: "Pretendard",
    },
      [body],
  );
}

function pillar(label: string, value: string, bg: string): unknown {
  return node(
    {
      flexDirection: "column",
      background: bg,
      borderRadius: 18,
      padding: "18px 22px",
      minWidth: 240,
      gap: 6,
    },
    [node({ fontSize: 24, color: "#ffffff" }, label), node({ fontSize: 54, fontWeight: 700, color: "#ffffff" }, value)],
  );
}

export async function renderExplainer(
  title: string,
  rows: { left: string; right: string }[],
): Promise<Buffer> {
  const svg = await satori(
    node(
      {
        width: 1200,
        height: 675,
        background: "#ffffff",
        padding: 48,
        flexDirection: "column",
        fontFamily: "Pretendard",
        color: "#111111",
      },
      [
        node({ fontSize: 40, fontWeight: 700, marginBottom: 28, color: "#1f5fbf" }, title),
        ...rows.map((row) =>
          node(
            {
              width: "100%",
              justifyContent: "space-between",
              borderTop: "1px solid #e6e6e6",
              padding: "18px 0",
              fontSize: 32,
            },
            [
              node({ color: "#111111", width: 420 }, row.left),
              node({ color: "#1f5fbf", fontWeight: 700, width: 520, justifyContent: "flex-end" }, row.right),
            ],
          ),
        ),
      ],
    ) as React.ReactNode,
    {
      width: 1200,
      height: 675,
      fonts: [{ name: "Pretendard", data: font(), weight: 600, style: "normal" }],
    },
  );
  return sharp(Buffer.from(svg)).png().toBuffer();
}
