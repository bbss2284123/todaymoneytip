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

const THEME: Record<string, { accent: string }> = {
  prepare: { accent: "#1b3a6b" },
  pension: { accent: "#1b3a6b" },
  severance: { accent: "#7a2e3a" },
  basic: { accent: "#0f6e6b" },
  health: { accent: "#0f6e6b" },
  job: { accent: "#1f6b45" },
  housing: { accent: "#7a2e3a" },
  tax: { accent: "#1f6b45" },
  assets: { accent: "#1f6b45" },
  business: { accent: "#7a2e3a" },
};

const PAPER = "#f6f5f2";
const INK = "#111111";
const fonts = new Map<number, Buffer>();

function font(weight: 600 | 700): Buffer {
  const cached = fonts.get(weight);
  if (cached) return cached;
  const file = weight === 700 ? "Pretendard-Bold.otf" : "Pretendard-SemiBold.otf";
  const data = readFileSync(path.join(process.cwd(), "assets/fonts", file));
  fonts.set(weight, data);
  return data;
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

function titlePx(lines: string[], boxWidth: number): number {
  const longest = Math.max(...lines.map((line) => [...line].length), 1);
  return Math.max(72, Math.min(88, Math.floor(boxWidth / longest)));
}

function heroPx(text: string, maxWidth: number): number {
  const units = [...text].reduce((sum, ch) => sum + (/[0-9%+−.,]/.test(ch) ? 0.62 : 1), 0);
  return Math.max(120, Math.min(160, Math.floor(maxWidth / Math.max(units, 1))));
}

function satoriFonts() {
  return [
    { name: "Pretendard", data: font(600), weight: 600 as const, style: "normal" as const },
    { name: "Pretendard", data: font(700), weight: 700 as const, style: "normal" as const },
  ];
}

export async function renderThumb(input: ThumbInput): Promise<Buffer> {
  const accent = (THEME[input.category] ?? THEME.pension).accent;
  const lines = input.lines ?? (thumbLines(input.title).slice(0, 2) as [string, string]);
  const svg = await satori(layout(input, accent, lines) as React.ReactNode, {
    width: input.width,
    height: input.height,
    fonts: satoriFonts(),
  });
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function titleBlock(lines: string[], size: number, color: string): unknown {
  return el(
    { flexDirection: "column" },
    lines.map((line) =>
      el({ fontSize: size, fontWeight: 700, color, letterSpacing: -2.5, lineHeight: 1.08, whiteSpace: "nowrap" }, line),
    ),
  );
}

function wordmark(color: string): unknown {
  return el({ fontSize: 24, fontWeight: 700, color }, "오늘의 머니팁");
}

function layout(input: ThumbInput, accent: string, lines: string[]): unknown {
  if (input.style === "compare") return compareLayout(input, accent, lines);
  if (input.style === "question") return questionLayout(input, accent, lines);
  if (input.style === "checklist") return checkLayout(input, accent, lines);
  if (input.style === "timeline") return timeLayout(input, lines);
  return numberLayout(input, accent, lines);
}

function numberLayout(input: ThumbInput, accent: string, lines: string[]): unknown {
  const hero = input.hero ?? input.number ?? lines[0];
  const textW = Math.round(input.width * 0.62);
  const panel = input.width - textW;
  const size = titlePx(lines, textW - 88);
  return el({ width: input.width, height: input.height, background: PAPER, fontFamily: "Pretendard", color: INK }, [
    el({ width: input.width - panel, height: input.height, flexDirection: "column", justifyContent: "space-between", padding: 48 }, [
      el({ flexDirection: "column" }, [
        el({ justifyContent: "space-between", alignItems: "center", marginBottom: 18 }, [
          el({ fontSize: 30, fontWeight: 700, color: accent }, input.keyword),
          wordmark("#5c584f"),
        ]),
        titleBlock(lines, size, INK),
      ]),
      input.caption ? el({ fontSize: 30, fontWeight: 700, color: "#3f3a32" }, input.caption) : el({}, " "),
    ]),
    el({ width: panel, height: input.height, background: accent, flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28 }, [
      el({ fontSize: 32, fontWeight: 700, color: "#f3efe6", marginBottom: 8 }, input.heroLabel ?? "핵심"),
      el({ fontSize: heroPx(hero, panel - 64), fontWeight: 700, color: "#ffffff", letterSpacing: -3, lineHeight: 1 }, hero),
    ]),
  ]);
}

function questionLayout(input: ThumbInput, accent: string, lines: string[]): unknown {
  const panel = Math.round(input.width * 0.38);
  const size = titlePx(lines, input.width - panel - 88);
  return el({ width: input.width, height: input.height, background: PAPER, fontFamily: "Pretendard", color: INK }, [
    el({ width: panel, height: input.height, background: accent, alignItems: "center", justifyContent: "center" }, [
      el({ fontSize: 280, fontWeight: 700, color: "#ffffff", lineHeight: 1 }, "?"),
    ]),
    el({ width: input.width - panel, height: input.height, flexDirection: "column", justifyContent: "space-between", padding: 48 }, [
      el({ flexDirection: "column" }, [
        el({ justifyContent: "space-between", alignItems: "center", marginBottom: 18 }, [
          el({ fontSize: 30, fontWeight: 700, color: accent }, input.keyword),
          wordmark("#5c584f"),
        ]),
        titleBlock(lines, size, INK),
      ]),
      input.caption ? el({ fontSize: 30, fontWeight: 700, color: "#3f3a32" }, input.caption) : el({}, " "),
    ]),
  ]);
}

function compareLayout(input: ThumbInput, accent: string, lines: string[]): unknown {
  const size = titlePx(lines, input.width - 96);
  const panels = input.compare ?? {
    leftLabel: "1년 일찍",
    left: "−6%",
    rightLabel: "1년 늦게",
    right: "+7.2%",
    signed: true,
  };
  const leftBg = panels.signed ? "#6e1b12" : accent;
  const rightBg = panels.signed ? "#0d3d86" : "#111111";
  const blockW = Math.round(input.width / 2) - 8;
  return el({ width: input.width, height: input.height, flexDirection: "column", background: PAPER, fontFamily: "Pretendard", color: INK }, [
    el({ flexDirection: "column", padding: "36px 48px 28px" }, [
      el({ justifyContent: "space-between", alignItems: "center", marginBottom: 12 }, [
        el({ fontSize: 30, fontWeight: 700, color: accent }, input.keyword),
        wordmark("#5c584f"),
      ]),
      titleBlock(lines, size, INK),
    ]),
    el({ flexGrow: 1, width: input.width }, [
      block(panels.leftLabel, panels.left, leftBg, blockW),
      block(panels.rightLabel, panels.right, rightBg, blockW),
    ]),
  ]);
}

function block(label: string, figure: string, bg: string, width: number): unknown {
  return el({ flexGrow: 1, height: "100%", background: bg, flexDirection: "column", justifyContent: "center", padding: "28px 40px" }, [
    el({ fontSize: 32, fontWeight: 700, color: "#f3efe6", marginBottom: 6 }, label),
    el({ fontSize: heroPx(figure, width - 80), fontWeight: 700, color: "#ffffff", letterSpacing: -3, lineHeight: 1 }, figure),
  ]);
}

function checkLayout(input: ThumbInput, accent: string, lines: string[]): unknown {
  const rows = input.checks ?? ["조건", "금액", "기한"];
  const size = titlePx(lines, input.width - 96);
  return el({ width: input.width, height: input.height, flexDirection: "column", background: PAPER, fontFamily: "Pretendard", color: INK }, [
    el({ height: 14, background: accent }, " "),
    el({ flexDirection: "column", padding: "28px 48px 32px", flexGrow: 1, justifyContent: "space-between" }, [
      el({ flexDirection: "column" }, [
        el({ justifyContent: "space-between", alignItems: "center", marginBottom: 12 }, [
          el({ fontSize: 30, fontWeight: 700, color: accent }, input.keyword),
          wordmark("#5c584f"),
        ]),
        titleBlock(lines, size, INK),
      ]),
      el({ flexDirection: "column", gap: 14, marginTop: 20 }, rows.map((row) => checkRow(row, accent))),
    ]),
  ]);
}

function checkRow(text: string, accent: string): unknown {
  return el({ alignItems: "center", background: "#ffffff", border: "1px solid #e6e4df", borderRadius: 12, padding: "16px 22px", gap: 18 }, [
    el({ width: 48, height: 48, borderRadius: 10, background: accent, alignItems: "center", justifyContent: "center" }, [
      el({ width: 14, height: 24, borderBottom: "5px solid #ffffff", borderRight: "5px solid #ffffff", transform: "rotate(40deg)", marginBottom: 6 }, " "),
    ]),
    el({ fontSize: 36, fontWeight: 700, color: INK }, text),
  ]);
}

function timeLayout(input: ThumbInput, lines: string[]): unknown {
  const steps = input.steps ?? ["퇴직 전", "당일", "이후"];
  const size = titlePx(lines, input.width - 96);
  const last = steps.length - 1;
  const inner = input.width - 96;
  return el({ width: input.width, height: input.height, boxSizing: "border-box", flexDirection: "column", justifyContent: "space-between", background: "#1b2a4a", fontFamily: "Pretendard", color: "#f6f5f2", padding: 48 }, [
    el({ width: inner, flexDirection: "column" }, [
      el({ width: inner, justifyContent: "space-between", alignItems: "center", marginBottom: 14 }, [
        el({ fontSize: 30, fontWeight: 700, color: "#d9e7ff" }, input.keyword),
        wordmark("#c5d0e0"),
      ]),
      titleBlock(lines, size, "#f6f5f2"),
    ]),
    el({ width: inner, height: 130, alignItems: "flex-start" }, steps.map((label, index) => step(label, index, last, Math.floor(inner / steps.length)))),
  ]);
}

function step(label: string, index: number, last: number, slot: number): unknown {
  const line = (on: boolean) => el({ flexGrow: 1, height: 6, background: on ? "#c5d0e0" : "transparent" }, " ");
  return el({ width: slot, height: 120, flexDirection: "column", alignItems: "center" }, [
    el({ width: slot, height: 28, alignItems: "center" }, [
      line(index > 0),
      el({ width: 28, height: 28, borderRadius: 14, background: "#f6f5f2", margin: "0 10px" }, " "),
      line(index < last),
    ]),
    el({ fontSize: 32, fontWeight: 700, color: "#ffffff", marginTop: 18 }, label),
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
    el({ width, height: 40, alignItems: "center", fontSize: 22, fontWeight: 700, color: INK, fontFamily: "Pretendard" }, text) as React.ReactNode,
    { width, height: 40, fonts: satoriFonts() },
  );
  return sharp(Buffer.from(svg)).png().toBuffer();
}
