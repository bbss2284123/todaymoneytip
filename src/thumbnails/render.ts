import { readFileSync } from "node:fs";
import path from "node:path";
import satori from "satori";
import sharp from "sharp";
import { thumbLines } from "./fit";

export interface ThumbCompare {
  leftLabel: string;
  left: string;
  rightLabel: string;
  right: string;
  signed?: boolean;
}

export interface ThumbInput {
  title: string;
  keyword: string;
  category: string;
  style: "number" | "question" | "compare" | "checklist" | "timeline";
  number?: string;
  width: number;
  height: number;
  lines?: [string, string];
  caption?: string;
  hero?: string;
  heroLabel?: string;
  compare?: ThumbCompare;
  checks?: [string, string, string];
  steps?: string[];
}

const THEME: Record<string, { accent: string; wash: string; icons: string[] }> = {
  prepare: { accent: "#1b3a6b", wash: "#e7eef8", icons: ["calendar", "landmark"] },
  pension: { accent: "#1b3a6b", wash: "#e7eef8", icons: ["landmark", "coins"] },
  severance: { accent: "#7a2e3a", wash: "#f8ecee", icons: ["receipt", "banknote"] },
  basic: { accent: "#0f6e6b", wash: "#e5f4f3", icons: ["users", "shield"] },
  health: { accent: "#0f6e6b", wash: "#e5f4f3", icons: ["heart-pulse", "shield"] },
  job: { accent: "#1f6b45", wash: "#e7f4ec", icons: ["briefcase", "calendar"] },
  housing: { accent: "#7a2e3a", wash: "#f8ecee", icons: ["house", "coins"] },
  tax: { accent: "#1f6b45", wash: "#e7f4ec", icons: ["banknote", "receipt"] },
  assets: { accent: "#1f6b45", wash: "#e7f4ec", icons: ["coins", "landmark"] },
  business: { accent: "#7a2e3a", wash: "#f8ecee", icons: ["briefcase", "shield"] },
};

const PAPER = "#f6f5f2";
const INK = "#111111";
const MINUS = "#b42318";
const PLUS = "#1f5fbf";
const fonts = new Map<number, Buffer>();
const iconCache = new Map<string, string>();

function font(weight: 700 | 800): Buffer {
  const cached = fonts.get(weight);
  if (cached) return cached;
  const file = weight === 800 ? "Pretendard-ExtraBold.otf" : "Pretendard-Bold.otf";
  const data = readFileSync(path.join(process.cwd(), "assets/fonts", file));
  fonts.set(weight, data);
  return data;
}

function satoriFonts() {
  return [
    { name: "Pretendard", data: font(700), weight: 700 as const, style: "normal" as const },
    { name: "Pretendard", data: font(800), weight: 800 as const, style: "normal" as const },
  ];
}

async function iconSrc(name: string, color: string): Promise<string> {
  const key = `${name}:${color}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const svg = readFileSync(path.join(process.cwd(), "src/thumbnails/icons", `${name}.svg`), "utf8")
    .replace(/currentColor/g, color)
    .replace(/stroke-width="2"/g, 'stroke-width="1.5"');
  const png = await sharp(Buffer.from(svg)).resize(128, 128).png().toBuffer();
  const uri = `data:image/png;base64,${png.toString("base64")}`;
  iconCache.set(key, uri);
  return uri;
}

function el(style: Record<string, unknown>, children: unknown): unknown {
  return { type: "div", props: { style: { display: "flex", ...style }, children } };
}

type Tone = "minus" | "plus" | "neutral";
const TONE = {
  minus: { bg: "#f8d4ce", fg: "#6e1b12" },
  plus: { bg: "#d9e7ff", fg: "#0d3d86" },
  neutral: { bg: "#ffffff", fg: "#111111" },
} as const;

export function figurePanels(number: string | undefined, keyword: string): { label: string; figure: string; tone: Tone }[] {
  if (!number?.trim()) return [];
  if (number.includes("/")) {
    const [left, right] = number.split("/").map((part) => part.trim());
    return [
      { label: "1년 일찍", figure: signedFigure(left, "minus", true), tone: "minus" },
      { label: "1년 늦게", figure: signedFigure(right, "plus", true), tone: "plus" },
    ];
  }
  const minus = /^[−-]/.test(number) || /감소|덜/.test(number);
  const plus = /^\+/.test(number) || /증가|더/.test(number);
  if (minus || plus) {
    return [{ label: minus ? "줄어드는 금액" : "늘어나는 금액", figure: signedFigure(number, minus ? "minus" : "plus", false), tone: minus ? "minus" : "plus" }];
  }
  return [{ label: keyword, figure: number.trim(), tone: "neutral" }];
}

function signedFigure(raw: string, tone: "minus" | "plus", perYear: boolean): string {
  const body = raw.replace(/^[+−-]\s*/, "").replace(/\s*\/\s*년$/, "").trim();
  const sign = tone === "minus" ? "−" : "+";
  return perYear ? `${sign}${body} / 년` : `${sign}${body}`;
}

function titlePx(lines: string[], width: number): number {
  const longest = Math.max(...lines.map((line) => [...line].length), 1);
  const fitted = Math.round((width * 0.6) / longest);
  return Math.max(84, Math.min(96, fitted));
}

function pillTone(figure: string): "minus" | "plus" | "neutral" {
  if (/^[−-]/.test(figure)) return "minus";
  if (/^\+/.test(figure)) return "plus";
  return "neutral";
}

function pillBg(tone: "minus" | "plus" | "neutral", accent: string): string {
  if (tone === "minus") return MINUS;
  if (tone === "plus") return PLUS;
  return accent;
}

export async function renderThumb(input: ThumbInput): Promise<Buffer> {
  const theme = THEME[input.category] ?? THEME.pension;
  const icons = await Promise.all(theme.icons.map((name) => iconSrc(name, theme.accent)));
  const lines = input.lines ?? (thumbLines(input.title).slice(0, 2) as [string, string]);
  const svg = await satori(layout(input, theme, icons, lines) as React.ReactNode, {
    width: input.width,
    height: input.height,
    fonts: satoriFonts(),
  });
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function layout(
  input: ThumbInput,
  theme: { accent: string; wash: string },
  icons: string[],
  lines: string[],
): unknown {
  const size = titlePx(lines, input.width);
  const rail = 10;
  const art = 280;
  return el({ width: input.width, height: input.height, background: PAPER, fontFamily: "Pretendard", color: INK }, [
    el({ width: rail, height: input.height, background: theme.accent }, " "),
    el(
      {
        width: input.width - rail - art,
        height: input.height,
        boxSizing: "border-box",
        padding: "36px 24px 32px 40px",
        flexDirection: "column",
        justifyContent: "space-between",
      },
      [
        el({ flexDirection: "column" }, [
          el({ fontSize: 32, fontWeight: 800, color: theme.accent, marginBottom: 14 }, input.keyword),
          ...lines.map((line) =>
            el(
              { fontSize: size, fontWeight: 800, color: INK, letterSpacing: -2.5, lineHeight: 1.15, whiteSpace: "nowrap" },
              line,
            ),
          ),
          el({ marginTop: 20 }, variant(input, theme.accent)),
        ]),
        el({ fontSize: 26, fontWeight: 700, color: "#333333" }, "오늘의 머니팁"),
      ],
    ),
    el({ width: art, height: input.height, alignItems: "center", justifyContent: "center" }, [
      iconCircle(theme, icons, input.style),
    ]),
  ]);
}

function variant(input: ThumbInput, accent: string): unknown {
  if (input.style === "compare" && input.compare) return comparePills(input.compare, accent);
  if (input.style === "checklist") {
    return el({ flexDirection: "column", gap: 12 }, [
      input.hero ? pill(input.heroLabel ?? input.keyword, input.hero, pillBg(pillTone(input.hero), accent), 44) : el({}, " "),
      ...(input.checks ?? []).map((item) => checkRow(item, accent)),
    ]);
  }
  if (input.style === "timeline") {
    return el({ flexDirection: "column", gap: 16 }, [
      input.hero ? pill(input.heroLabel ?? input.keyword, input.hero, pillBg(pillTone(input.hero), accent), 44) : el({}, " "),
      stepsRow(input.steps ?? ["퇴직 전", "당일", "이후"], accent),
    ]);
  }
  const figure = input.hero ?? input.number ?? "";
  if (!figure) return el({ fontSize: 28, fontWeight: 700, color: "#333333" }, input.caption ?? " ");
  return el({ flexDirection: "column", gap: 14 }, [
    pill(input.heroLabel ?? input.keyword, figure, pillBg(pillTone(figure), accent), input.style === "number" ? 52 : 48),
    input.caption ? el({ fontSize: 26, fontWeight: 700, color: "#333333" }, input.caption) : el({}, " "),
  ]);
}

function comparePills(compare: ThumbCompare, accent: string): unknown {
  const leftTone = compare.signed ? "minus" : "neutral";
  return el({ gap: 14 }, [
    pill(compare.leftLabel, compare.left, pillBg(leftTone, accent), 48),
    pill(compare.rightLabel, compare.right, compare.signed ? PLUS : "#111111", 48),
  ]);
}

function pill(label: string, figure: string, bg: string, figureSize: number): unknown {
  return el({ flexDirection: "column", alignSelf: "flex-start", background: bg, borderRadius: 18, padding: "12px 20px" }, [
    el({ fontSize: 26, fontWeight: 700, color: "#ffffff" }, label),
    el({ fontSize: figureSize, fontWeight: 800, color: "#ffffff", letterSpacing: -1, lineHeight: 1.05 }, figure),
  ]);
}

function checkRow(text: string, accent: string): unknown {
  return el({ alignItems: "center", gap: 12 }, [
    el({ width: 28, height: 28, borderRadius: 8, background: accent, alignItems: "center", justifyContent: "center" }, [
      el({ width: 8, height: 14, borderBottom: "3px solid #ffffff", borderRight: "3px solid #ffffff", transform: "rotate(40deg)", marginBottom: 4 }, " "),
    ]),
    el({ fontSize: 28, fontWeight: 700, color: INK }, text),
  ]);
}

function stepsRow(steps: string[], accent: string): unknown {
  const last = steps.length - 1;
  const slot = 188;
  const line = (on: boolean) => el({ flexGrow: 1, height: 4, background: on ? accent : "transparent" }, " ");
  return el({ alignItems: "flex-start", marginTop: 4, width: slot * steps.length }, steps.map((label, index) =>
    el({ width: slot, flexDirection: "column", alignItems: "center" }, [
      el({ width: slot, alignItems: "center" }, [
        line(index > 0),
        el({ width: 18, height: 18, borderRadius: 9, background: accent, margin: "0 6px" }, " "),
        line(index < last),
      ]),
      el({ width: slot, justifyContent: "center", marginTop: 10 }, [
        el({ fontSize: 26, fontWeight: 700, color: INK }, label),
      ]),
    ]),
  ));
}

function iconCircle(theme: { accent: string; wash: string }, icons: string[], style: string): unknown {
  return el({ width: 240, height: 240, borderRadius: 120, background: theme.wash, alignItems: "center", justifyContent: "center" }, [
    el({ flexDirection: "column", alignItems: "center" }, [
      style === "question" ? el({ fontSize: 64, fontWeight: 800, color: theme.accent, marginBottom: -8 }, "?") : el({}, " "),
      { type: "img", props: { src: icons[0], width: 88, height: 88 } },
      icons[1]
        ? el({ marginTop: -28, marginLeft: 64 }, { type: "img", props: { src: icons[1], width: 64, height: 64 } })
        : el({}, " "),
    ]),
  ]);
}

export async function renderExplainer(title: string, rows: { left: string; right: string }[]): Promise<Buffer> {
  const svg = await satori(
    el(
      { width: 1200, height: 675, background: PAPER, padding: 48, flexDirection: "column", fontFamily: "Pretendard", color: INK },
      [
        el({ fontSize: 40, fontWeight: 700, marginBottom: 28 }, title),
        ...rows.map((row) =>
          el({ width: "100%", justifyContent: "space-between", borderTop: "1px solid #e6e4df", padding: "18px 0", fontSize: 32 }, [
            el({ width: 460 }, row.left),
            el({ width: 560, justifyContent: "flex-end", color: "#1b3a6b", fontWeight: 700 }, row.right),
          ]),
        ),
      ],
    ) as React.ReactNode,
    { width: 1200, height: 675, fonts: satoriFonts() },
  );
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function renderCaption(text: string, width: number): Promise<Buffer> {
  const svg = await satori(
    el({ width, height: 40, alignItems: "center", fontSize: 24, fontWeight: 700, color: INK, fontFamily: "Pretendard" }, text) as React.ReactNode,
    { width, height: 40, fonts: satoriFonts() },
  );
  return sharp(Buffer.from(svg)).png().toBuffer();
}
