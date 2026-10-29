import { readFileSync } from "node:fs";
import path from "node:path";
import satori from "satori";
import sharp from "sharp";
import { FRAME, type BarFigure, type CompareFigure, type Figure, type StepsFigure, type SummaryFigure, type TimelineFigure, type Tone } from "./types";

const PAPER = "#f6f5f2";
const INK = "#111111";
const MUTED = "#5c574e";
const UP = "#1f5fbf";
const DOWN = "#b42318";
const LINE = "#e6e4df";

const fonts = new Map<number, Buffer>();

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

function el(style: Record<string, unknown>, children: unknown): unknown {
  return { type: "div", props: { style: { display: "flex", ...style }, children } };
}

function toneColor(tone: Tone | undefined): string {
  if (tone === "down") return DOWN;
  if (tone === "up" || tone === "base") return UP;
  return INK;
}

function shell(width: number, height: number, accent: string, source: string, body: unknown, spread = false): unknown {
  return el(
    {
      width,
      height,
      background: PAPER,
      padding: 22,
      flexDirection: "column",
      fontFamily: "Pretendard",
      color: INK,
    },
    [
      el(
        {
          width: width - 44,
          flexGrow: 1,
          background: "#ffffff",
          borderRadius: 22,
          border: `2px solid ${LINE}`,
          borderLeft: `12px solid ${accent}`,
          padding: "22px 26px",
          flexDirection: "column",
          justifyContent: spread ? "space-between" : "flex-start",
        },
        body,
      ),
      el({ marginTop: 12, fontSize: 28, fontWeight: 700, color: MUTED }, `출처: ${source}`),
    ],
  );
}

function summary(fig: SummaryFigure, accent: string, width: number, height: number): unknown {
  return shell(width, height, accent, fig.source, [
    el({ fontSize: 32, fontWeight: 800, color: accent, marginBottom: 8 }, fig.kicker),
    el({ fontSize: 64, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.15, marginBottom: 16 }, fig.lead),
    ...fig.rows.map((row) =>
      el(
        {
          width: "100%",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: `2px solid ${LINE}`,
          padding: "10px 0",
        },
        [
          el({ fontSize: 32, fontWeight: 700, color: MUTED }, row.label),
          el({ fontSize: 36, fontWeight: 800, color: toneColor(row.tone) }, row.value),
        ],
      ),
    ),
  ]);
}

function bars(fig: BarFigure, accent: string, width: number, height: number): unknown {
  const max = Math.max(...fig.bars.map((bar) => bar.amount));
  const track = width - 44 - 52 - 24;
  return shell(width, height, accent, fig.source, [
    el({ fontSize: 40, fontWeight: 800, marginBottom: 16, letterSpacing: -0.5 }, fig.title),
    ...fig.bars.map((bar) => {
      const fill = Math.max(36, Math.round((bar.amount / max) * track));
      const color = toneColor(bar.tone);
      return el({ flexDirection: "column", marginBottom: 12 }, [
        el({ width: "100%", justifyContent: "space-between", marginBottom: 6 }, [
          el({ fontSize: 30, fontWeight: 700 }, bar.label),
          el({ fontSize: 32, fontWeight: 800, color }, bar.value),
        ]),
        el({ width: track, height: 28, background: "#f3f1ec", borderRadius: 14 }, [
          el({ width: fill, height: 28, background: color, borderRadius: 14 }, " "),
        ]),
      ]);
    }),
  ], fig.ratio === "4:5");
}

function mark(ok: boolean): unknown {
  const bg = ok ? UP : DOWN;
  const glyph = ok
    ? el(
        {
          width: 14,
          height: 22,
          borderBottom: "5px solid #ffffff",
          borderRight: "5px solid #ffffff",
          transform: "rotate(40deg)",
          marginBottom: 6,
        },
        " ",
      )
    : el({ fontSize: 32, fontWeight: 800, color: "#ffffff", lineHeight: 1 }, "×");
  return el(
    { width: 44, height: 44, borderRadius: 22, background: bg, alignItems: "center", justifyContent: "center", marginRight: 12 },
    glyph,
  );
}

function column(title: string, rows: { text: string; ok: boolean }[], accent: string): unknown {
  return el({ flex: 1, flexDirection: "column", padding: "0 8px" }, [
    el({ fontSize: 34, fontWeight: 800, color: accent, marginBottom: 12 }, title),
    ...rows.map((row) =>
      el({ alignItems: "center", marginBottom: 10 }, [
        mark(row.ok),
        el({ fontSize: 28, fontWeight: 700, lineHeight: 1.25 }, row.text),
      ]),
    ),
  ]);
}

function compare(fig: CompareFigure, accent: string, width: number, height: number): unknown {
  return shell(width, height, accent, fig.source, [
    el({ fontSize: 38, fontWeight: 800, marginBottom: 14 }, fig.title),
    el({ width: "100%" }, [column(fig.leftTitle, fig.left, accent), column(fig.rightTitle, fig.right, accent)]),
  ]);
}

function steps(fig: StepsFigure, accent: string, width: number, height: number): unknown {
  return shell(width, height, accent, fig.source, [
    el({ fontSize: 42, fontWeight: 800, marginBottom: 18 }, fig.title),
    ...fig.steps.map((step, index) =>
      el({ alignItems: "center", marginBottom: 16 }, [
        el(
          {
            width: 64,
            height: 64,
            borderRadius: 32,
            background: index === 0 ? accent : "#e7eef8",
            color: index === 0 ? "#ffffff" : accent,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 16,
          },
          " ",
        ),
        el({ flexDirection: "column", flex: 1 }, [
          el({ fontSize: 36, fontWeight: 800 }, step.title),
          el({ fontSize: 30, fontWeight: 700, color: MUTED, marginTop: 2 }, step.detail),
        ]),
      ]),
    ),
  ], true);
}

function timeline(fig: TimelineFigure, accent: string, width: number, height: number): unknown {
  const last = fig.marks.length - 1;
  return shell(width, height, accent, fig.source, [
    el({ fontSize: 42, fontWeight: 800, marginBottom: 16 }, fig.title),
    ...fig.marks.map((markItem, index) =>
      el({ alignItems: "stretch" }, [
        el({ width: 36, flexDirection: "column", alignItems: "center", marginRight: 14 }, [
          el({ width: 22, height: 22, borderRadius: 11, background: accent, marginTop: 8 }, " "),
          index < last ? el({ width: 4, flexGrow: 1, background: "#d9e2f2", minHeight: 28 }, " ") : el({}, " "),
        ]),
        el({ flexDirection: "column", flex: 1, paddingBottom: 16 }, [
          el({ fontSize: 36, fontWeight: 800 }, markItem.label),
          el({ fontSize: 30, fontWeight: 700, color: MUTED, marginTop: 2 }, markItem.detail),
        ]),
      ]),
    ),
  ], true);
}

function tree(fig: Figure, accent: string): unknown {
  const { width, height } = FRAME[fig.ratio];
  if (fig.kind === "summary") return summary(fig, accent, width, height);
  if (fig.kind === "bar") return bars(fig, accent, width, height);
  if (fig.kind === "compare") return compare(fig, accent, width, height);
  if (fig.kind === "steps") return steps(fig, accent, width, height);
  return timeline(fig, accent, width, height);
}

export async function renderFigure(fig: Figure, accent: string): Promise<{ png: Buffer; webp: Buffer }> {
  const { width, height } = FRAME[fig.ratio];
  const svg = await satori(tree(fig, accent) as React.ReactNode, { width, height, fonts: satoriFonts() });
  const source = Buffer.from(svg);
  const png = await sharp(source).png({ compressionLevel: 9 }).toBuffer();
  const webp = await sharp(source).webp({ quality: 76 }).toBuffer();
  return { png, webp };
}

export const CATEGORY_ACCENT: Record<string, string> = {
  prepare: "#1b3a6b",
  pension: "#1b3a6b",
  severance: "#7a2e3a",
  basic: "#0f6e6b",
  health: "#0f6e6b",
  job: "#1f6b45",
  housing: "#7a2e3a",
  tax: "#1f6b45",
  assets: "#1f6b45",
  business: "#7a2e3a",
};
