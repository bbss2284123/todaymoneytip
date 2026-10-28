import { readFileSync } from "node:fs";
import path from "node:path";
import satori from "satori";
import sharp from "sharp";
import { thumbLines } from "./fit";

export interface ThumbInput {
  title: string;
  keyword: string;
  category: string;
  style: "number" | "question" | "compare" | "checklist" | "timeline";
  number?: string;
  width: number;
  height: number;
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

let fontData: Buffer | null = null;
const iconCache = new Map<string, string>();

function font(): Buffer {
  if (!fontData) fontData = readFileSync(path.join(process.cwd(), "assets/fonts/Pretendard-SemiBold.otf"));
  return fontData;
}

async function iconSrc(name: string, color: string): Promise<string> {
  const key = `${name}:${color}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const svg = readFileSync(path.join(process.cwd(), "src/thumbnails/icons", `${name}.svg`), "utf8")
    .replace(/currentColor/g, color)
    .replace(/stroke-width="2"/g, 'stroke-width="1.6"');
  const png = await sharp(Buffer.from(svg)).resize(160, 160).png().toBuffer();
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

export async function renderThumb(input: ThumbInput): Promise<Buffer> {
  const theme = THEME[input.category] ?? THEME.pension;
  const dark = input.style === "timeline";
  const ink = dark ? "#f6f5f2" : "#111111";
  const icons = await Promise.all(theme.icons.map((name) => iconSrc(name, dark ? "#f6f5f2" : theme.accent)));
  const lines = thumbLines(input.title).slice(0, 2);
  const longest = Math.max(...lines.map((line) => [...line].length), 1);
  const textWidth = input.width - 96 - (dark ? 80 : 340);
  const titleSize = Math.max(40, Math.min(62, Math.floor(textWidth / longest / 0.98)));
  const panels = figurePanels(input.number, input.keyword);
  const svg = await satori(
    layout(input, theme, dark, ink, icons, lines, titleSize, panels) as React.ReactNode,
    {
      width: input.width,
      height: input.height,
      fonts: [{ name: "Pretendard", data: font(), weight: 600, style: "normal" }],
    },
  );
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function layout(
  input: ThumbInput,
  theme: { accent: string; wash: string },
  dark: boolean,
  ink: string,
  icons: string[],
  lines: string[],
  titleSize: number,
  panels: { label: string; figure: string; tone: Tone }[],
): unknown {
  const title = el(
    { flexDirection: "column", gap: 2 },
    lines.map((line) => el({ fontSize: titleSize, fontWeight: 700, color: ink, letterSpacing: -1.5, lineHeight: 1.15 }, line)),
  );
  const badges = panels.length
    ? el(
        { gap: 12, marginTop: 20 },
        panels.map((panel) => {
          const colors = dark && panel.tone === "neutral" ? { bg: "#243656", fg: "#f6f5f2" } : TONE[panel.tone];
          return el(
            { flexDirection: "column", background: colors.bg, borderRadius: 16, padding: "12px 16px", gap: 2 },
            [
              el({ fontSize: 20, fontWeight: 700, color: colors.fg }, panel.label),
              el({ fontSize: input.style === "number" && panels.length === 1 ? 48 : 36, fontWeight: 700, color: colors.fg }, panel.figure),
            ],
          );
        }),
      )
    : el({ fontSize: 22, color: theme.accent, marginTop: 16 }, "기준일과 출처");
  const checks =
    input.style === "checklist"
      ? el(
          { flexDirection: "column", gap: 10, marginTop: 18 },
          ["조건", "금액", "기한"].map((item) =>
            el({ alignItems: "center", gap: 10, fontSize: 24, color: ink }, [
              el({ width: 22, height: 22, borderRadius: 6, background: theme.accent, color: "#fff", alignItems: "center", justifyContent: "center", fontSize: 16 }, "✓"),
              item,
            ]),
          ),
        )
      : null;
  const steps =
    input.style === "timeline"
      ? el(
          { gap: 18, marginTop: 22, alignItems: "center" },
          ["퇴직 전", "당일", "이후"].map((label, index) =>
            el({ flexDirection: "column", alignItems: "center", gap: 8 }, [
              el({ width: 16, height: 16, borderRadius: 8, background: index === 1 ? "#f6f5f2" : "#8ea0c0" }, ""),
              el({ fontSize: 22, color: ink }, label),
            ]),
          ),
        )
      : null;
  const left = el({ flexDirection: "column", flexGrow: 1, height: input.height - 96, paddingRight: 16 }, [
    el({ fontSize: 22, fontWeight: 700, color: dark ? "#d9e7ff" : theme.accent, marginBottom: 16 }, input.keyword),
    title,
    badges,
    checks,
    steps,
    el({ flexGrow: 1 }, " "),
    el({ fontSize: 18, color: dark ? "#c5d0e0" : "#5c584f" }, "오늘의 머니팁"),
  ].filter(Boolean));
  const art = dark
    ? el({ width: 220, height: input.height - 96, alignItems: "center", justifyContent: "center" }, [
        el(
          { width: 160, height: 160, borderRadius: 80, background: "#243656", alignItems: "center", justifyContent: "center" },
          { type: "img", props: { src: icons[0], width: 72, height: 72 } },
        ),
      ])
    : illustration(theme, icons, input.style, input.height - 96);
  return el(
    {
      width: input.width,
      height: input.height,
      background: dark ? "#1b2a4a" : "#f6f5f2",
      color: ink,
      fontFamily: "Pretendard",
    },
    [
      el({ width: 12, height: input.height, background: dark ? "#d9e7ff" : theme.accent }, " "),
      el(
        { width: input.width - 12, height: input.height, padding: 48, justifyContent: "space-between" },
        [left, art],
      ),
    ],
  );
}

function illustration(theme: { accent: string; wash: string }, icons: string[], style: string, height: number): unknown {
  const bars = style === "compare" ? [48, 96] : style === "number" ? [40, 72, 104] : [56, 80, 64];
  const mark = style === "question" ? el({ fontSize: 92, color: theme.accent, marginRight: 8 }, "?") : null;
  return el({ width: 300, height, alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }, [
    el({ width: 248, height: 248, borderRadius: 124, background: theme.wash, alignItems: "center", justifyContent: "center" }, [
      mark,
      el({ flexDirection: "column", alignItems: "center" }, [
        { type: "img", props: { src: icons[0], width: 88, height: 88 } },
        icons[1] ? el({ marginTop: -20, marginLeft: 48 }, { type: "img", props: { src: icons[1], width: 64, height: 64 } }) : el({}, " "),
      ]),
    ].filter(Boolean)),
    el(
      { gap: 8, alignItems: "flex-end", background: "#ffffff", borderRadius: 12, padding: "12px 16px", border: "1px solid #e6e4df" },
      bars.map((height) => el({ width: 16, height, background: theme.accent, borderRadius: 4 }, " ")),
    ),
  ]);
}

export async function renderExplainer(title: string, rows: { left: string; right: string }[]): Promise<Buffer> {
  const svg = await satori(
    el(
      { width: 1200, height: 675, background: "#f6f5f2", padding: 48, flexDirection: "column", fontFamily: "Pretendard", color: "#111111" },
      [
        el({ fontSize: 40, fontWeight: 700, marginBottom: 28 }, title),
        ...rows.map((row) =>
          el(
            { width: "100%", justifyContent: "space-between", borderTop: "1px solid #e6e4df", padding: "18px 0", fontSize: 32 },
            [el({ width: 420 }, row.left), el({ width: 420, justifyContent: "flex-end", color: "#1f5fbf", fontWeight: 700 }, row.right)],
          ),
        ),
      ],
    ) as React.ReactNode,
    { width: 1200, height: 675, fonts: [{ name: "Pretendard", data: font(), weight: 600, style: "normal" }] },
  );
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function renderCaption(text: string, width: number): Promise<Buffer> {
  const svg = await satori(
    el({ width, height: 36, alignItems: "center", fontSize: 20, color: "#111111", fontFamily: "Pretendard" }, text) as React.ReactNode,
    { width, height: 36, fonts: [{ name: "Pretendard", data: font(), weight: 600, style: "normal" }] },
  );
  return sharp(Buffer.from(svg)).png().toBuffer();
}
