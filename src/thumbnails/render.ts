import { readFileSync } from "node:fs";
import path from "node:path";
import satori from "satori";
import sharp from "sharp";
import { illustrationSvg, motifFor, type Motif } from "./art";
import { thumbLines } from "./fit";
import { BADGE, THEME, type ThumbTheme } from "./theme";

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
  lines?: [string, string] | string[];
  caption?: string;
  hero?: string;
  heroLabel?: string;
  compare?: ThumbCompare;
  checks?: [string, string, string];
  steps?: string[];
  motif?: Motif;
}

const INK = "#111111";
const PAPER = "#f6f5f2";
const fonts = new Map<number, Buffer>();
const iconCache = new Map<string, string>();
const artCache = new Map<string, string>();

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
    .replace(/stroke-width="2"/g, 'stroke-width="2.4"');
  const png = await sharp(Buffer.from(svg)).resize(96, 96).png().toBuffer();
  const uri = `data:image/png;base64,${png.toString("base64")}`;
  iconCache.set(key, uri);
  return uri;
}

async function artSrc(motif: Motif, theme: ThumbTheme): Promise<string> {
  const key = `${motif}:${theme.from}`;
  const cached = artCache.get(key);
  if (cached) return cached;
  const png = await sharp(Buffer.from(illustrationSvg(motif, theme.art))).png().toBuffer();
  const uri = `data:image/png;base64,${png.toString("base64")}`;
  artCache.set(key, uri);
  return uri;
}

function el(style: Record<string, unknown>, children: unknown): unknown {
  return { type: "div", props: { style: { display: "flex", ...style }, children } };
}

type Tone = "minus" | "plus" | "neutral";

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

function pillTone(figure: string): Tone {
  if (/^[−-]/.test(figure)) return "minus";
  if (/^\+/.test(figure)) return "plus";
  return "neutral";
}

interface Badge {
  label: string;
  figure: string;
  tone: Tone;
}

function badgesFor(input: ThumbInput): Badge[] {
  if (input.style === "compare" && input.compare) {
    return [
      { label: input.compare.leftLabel, figure: input.compare.left, tone: input.compare.signed ? "minus" : "neutral" },
      { label: input.compare.rightLabel, figure: input.compare.right, tone: input.compare.signed ? "plus" : "neutral" },
    ];
  }
  if (input.number?.includes("/")) {
    return figurePanels(input.number, input.keyword).map((panel) => ({
      label: panel.label,
      figure: panel.figure.replace(" / 년", ""),
      tone: panel.tone,
    }));
  }
  if (input.hero) return [{ label: input.heroLabel ?? "", figure: input.hero, tone: pillTone(input.hero) }];
  return figurePanels(input.number, input.keyword).map((panel) => ({
    label: panel.tone === "neutral" ? "" : panel.label,
    figure: panel.figure,
    tone: panel.tone,
  }));
}

function subtitleFor(input: ThumbInput, lines: string[]): string {
  const raw = (input.caption || input.keyword || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  const title = lines.join(" ");
  if (title.includes(raw)) return "";
  return raw;
}

/** 한 줄 글자 수에 맞춰 제목 크기를 고릅니다. 48px 아래로 내리지 않습니다. */
export function titleSize(lines: string[], textWidth: number): number {
  const longest = Math.max(...lines.map((line) => [...line].length), 1);
  const tracking = 0.045;
  const factor = longest - tracking * Math.max(longest - 1, 0);
  return Math.max(48, Math.min(86, Math.floor(textWidth / factor)));
}

function figureSize(text: string): number {
  const n = [...text].length;
  if (n <= 4) return 56;
  if (n <= 7) return 48;
  return 42;
}

export async function renderThumb(input: ThumbInput): Promise<Buffer> {
  const theme = THEME[input.category] ?? THEME.pension;
  const motif = input.motif ?? motifFor("", input.category);
  const [icon, art] = await Promise.all([iconSrc(theme.pillIcon, theme.pillFg), artSrc(motif, theme)]);
  const lines = (input.lines?.length ? input.lines : thumbLines(input.title)).slice(0, 2);
  const svg = await satori(layout(input, theme, icon, art, lines) as React.ReactNode, {
    width: input.width,
    height: input.height,
    fonts: satoriFonts(),
  });
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function layout(input: ThumbInput, theme: ThumbTheme, icon: string, art: string, lines: string[]): unknown {
  const padL = 52;
  const padR = 28;
  const artSize = Math.round(Math.min(input.height * 0.7, 460));
  const textWidth = input.width - padL - padR - artSize - 8;
  const size = titleSize(lines, textWidth);
  const subtitle = subtitleFor(input, lines);
  const badges = badgesFor(input);
  return el(
    {
      width: input.width,
      height: input.height,
      position: "relative",
      overflow: "hidden",
      backgroundImage: `linear-gradient(108deg, ${theme.from} 0%, ${theme.from} 46%, ${theme.to} 100%)`,
      backgroundColor: theme.from,
      fontFamily: "Pretendard",
      color: "#ffffff",
    },
    [
      circle(input.width - 380, 20, 460, theme.glow),
      circle(-140, input.height - 280, 520, theme.glow),
      circle(36, 26, 14, "rgba(255,255,255,0.7)"),
      el(
        {
          width: input.width,
          height: input.height,
          padding: `44px ${padR}px 36px ${padL}px`,
          flexDirection: "row",
          alignItems: "center",
          boxSizing: "border-box",
        },
        [
          el(
            { width: textWidth, height: input.height - 80, flexDirection: "column", justifyContent: "center" },
            [
              pill(theme, icon),
              el({ height: 26 }, " "),
              ...lines.map((line) =>
                el(
                  {
                    fontSize: size,
                    fontWeight: 800,
                    color: "#ffffff",
                    letterSpacing: -2,
                    lineHeight: 1.12,
                    whiteSpace: "nowrap",
                  },
                  line,
                ),
              ),
              el({ width: 72, height: 6, borderRadius: 3, background: "#ffffff", marginTop: 20, marginBottom: subtitle ? 16 : 18 }, " "),
              subtitle
                ? el(
                    { fontSize: subtitle.length > 16 ? 32 : 36, fontWeight: 700, color: "#e7eef6", marginBottom: 18, whiteSpace: "nowrap" },
                    subtitle,
                  )
                : el({}, " "),
              badgeRow(badges),
              extras(input),
            ],
          ),
          el({ width: artSize, height: artSize, alignItems: "center", justifyContent: "center" }, [
            { type: "img", props: { src: art, width: artSize, height: artSize } },
          ]),
        ],
      ),
      el(
        {
          position: "absolute",
          top: 18,
          left: input.width - 168,
          fontSize: 16,
          fontWeight: 700,
          color: "#ffffff",
          opacity: 0.55,
        },
        "오늘의 머니팁",
      ),
    ],
  );
}

function circle(left: number, top: number, size: number, color: string): unknown {
  return el(
    {
      position: "absolute",
      left,
      top,
      width: size,
      height: size,
      borderRadius: size / 2,
      background: color,
    },
    " ",
  );
}

function pill(theme: ThumbTheme, icon: string): unknown {
  return el(
    {
      alignSelf: "flex-start",
      alignItems: "center",
      background: theme.pillBg,
      color: theme.pillFg,
      borderRadius: 999,
      padding: "8px 18px 8px 12px",
    },
    [
      { type: "img", props: { src: icon, width: 34, height: 34 } },
      el({ fontSize: 32, fontWeight: 800, color: theme.pillFg, marginLeft: 8 }, theme.label),
    ],
  );
}

function badgeRow(badges: Badge[]): unknown {
  if (!badges.length) return el({}, " ");
  return el(
    { gap: 12, alignItems: "flex-end" },
    badges.map((badge) => {
      const tone = BADGE[badge.tone];
      const figure = figureSize(badge.figure);
      return el(
        {
          flexDirection: "column",
          alignSelf: "flex-start",
          background: tone.bg,
          borderRadius: 18,
          padding: badge.label ? "10px 18px 12px" : "12px 20px",
        },
        [
          badge.label
            ? el({ fontSize: 26, fontWeight: 700, color: tone.fg, marginBottom: 2 }, badge.label)
            : el({}, " "),
          el({ fontSize: figure, fontWeight: 800, color: tone.fg, letterSpacing: -1, lineHeight: 1.05 }, badge.figure),
        ],
      );
    }),
  );
}

function extras(input: ThumbInput): unknown {
  if (input.style === "checklist" && input.checks?.length) {
    return el(
      { flexDirection: "column", gap: 10, marginTop: 16 },
      input.checks.map((item) =>
        el({ alignItems: "center" }, [
          el(
            { width: 28, height: 28, borderRadius: 8, background: "#ffffff", alignItems: "center", justifyContent: "center", marginRight: 10 },
            el({ width: 8, height: 14, borderBottom: "3px solid #14202c", borderRight: "3px solid #14202c", transform: "rotate(40deg)", marginBottom: 4 }, " "),
          ),
          el({ fontSize: 30, fontWeight: 700, color: "#ffffff" }, item),
        ]),
      ),
    );
  }
  if (input.style === "timeline" && input.steps?.length) {
    return el(
      { gap: 10, marginTop: 16, flexWrap: "wrap" },
      input.steps.map((step) =>
        el(
          { background: "rgba(255,255,255,0.16)", borderRadius: 999, padding: "8px 14px", fontSize: 28, fontWeight: 700, color: "#ffffff" },
          step,
        ),
      ),
    );
  }
  return el({}, " ");
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
