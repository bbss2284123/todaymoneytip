import { readFileSync } from "node:fs";
import path from "node:path";
import satori from "satori";
import sharp from "sharp";
import { FRAME, type BarFigure, type CompareFigure, type Figure, type StepsFigure, type SummaryFigure, type TimelineFigure, type Tone } from "./types";

const INK = "#111111";
const MUTED = "#4a463f";
const UP = "#1f5fbf";
const DOWN = "#b42318";
const PAPER = "#f3efe6";

/** Smallest glyph. 38px on a 720 canvas is ~18px CSS in a 350px column. */
const MIN = 38;
const LABEL = 42;
const TITLE = 52;
const NUM = 72;

const fonts = new Map<number, Buffer>();
const iconCache = new Map<string, string>();

const CATEGORY_ICON: Record<string, string> = {
  prepare: "calendar",
  pension: "landmark",
  severance: "receipt",
  basic: "shield",
  health: "heart-pulse",
  job: "briefcase",
  housing: "house",
  tax: "banknote",
  assets: "coins",
  business: "briefcase",
};

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

const WASH: Record<string, string> = {
  prepare: "#e4edf8",
  pension: "#e4edf8",
  severance: "#f8e8ea",
  basic: "#e3f3f1",
  health: "#e3f3f1",
  job: "#e5f3ea",
  housing: "#f8e8ea",
  tax: "#e5f3ea",
  assets: "#e5f3ea",
  business: "#f8e8ea",
};

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

async function iconUri(name: string, color: string): Promise<string> {
  const key = `${name}:${color}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const svg = readFileSync(path.join(process.cwd(), "src/thumbnails/icons", `${name}.svg`), "utf8")
    .replace(/currentColor/g, color)
    .replace(/stroke-width="2"/g, 'stroke-width="2.4"');
  const png = await sharp(Buffer.from(svg)).resize(128, 128).png().toBuffer();
  const uri = `data:image/png;base64,${png.toString("base64")}`;
  iconCache.set(key, uri);
  return uri;
}

function iconBadge(src: string, wash: string): unknown {
  return el(
    { width: 112, height: 112, borderRadius: 56, background: wash, alignItems: "center", justifyContent: "center" },
    { type: "img", props: { src, width: 64, height: 64 } },
  );
}

function footer(source: string): unknown {
  return el({ marginTop: 18, fontSize: MIN, fontWeight: 700, color: MUTED }, `출처: ${source}`);
}

function frame(width: number, height: number, children: unknown): unknown {
  return el(
    {
      width,
      height,
      background: PAPER,
      padding: 28,
      flexDirection: "column",
      fontFamily: "Pretendard",
      color: INK,
    },
    children,
  );
}

function summary(fig: SummaryFigure, accent: string, wash: string, icon: string, width: number, height: number): unknown {
  return frame(width, height, [
    el({ alignItems: "center", marginBottom: 18 }, [
      iconBadge(icon, wash),
      el({ flexDirection: "column", marginLeft: 18, flex: 1 }, [
        el({ fontSize: LABEL, fontWeight: 800, color: accent }, fig.kicker),
        el({ fontSize: NUM, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.15, marginTop: 4 }, fig.lead),
      ]),
    ]),
    el({ flexGrow: 1, flexDirection: "column", justifyContent: "space-around" }, fig.rows.map((row) =>
      el(
        {
          background: "#ffffff",
          borderRadius: 28,
          padding: "18px 22px",
          alignItems: "center",
          justifyContent: "space-between",
          border: `3px solid ${toneColor(row.tone)}`,
        },
        [
          el({ fontSize: LABEL, fontWeight: 800, color: MUTED }, row.label),
          el({ fontSize: 56, fontWeight: 800, color: toneColor(row.tone), marginLeft: 12 }, row.value),
        ],
      ),
    )),
    footer(fig.source),
  ]);
}

function bars(fig: BarFigure, accent: string, width: number, height: number): unknown {
  const max = Math.max(...fig.bars.map((bar) => bar.amount), 1);
  const track = width - 56;
  return frame(width, height, [
    el({ fontSize: TITLE, fontWeight: 800, color: accent, marginBottom: 8 }, fig.title),
    el({ flexGrow: 1, flexDirection: "column", justifyContent: "space-around" }, fig.bars.map((bar) => {
      const color = toneColor(bar.tone);
      const fill = Math.max(96, Math.round((bar.amount / max) * track));
      return el({ flexDirection: "column" }, [
        el({ width: track, justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }, [
          el({ fontSize: LABEL, fontWeight: 800 }, bar.label),
          el({ fontSize: NUM, fontWeight: 800, color }, bar.value),
        ]),
        el({ width: track, height: 56, background: "#e7e1d6", borderRadius: 28 }, [
          el({ width: fill, height: 56, background: color, borderRadius: 28 }, " "),
        ]),
      ]);
    })),
    footer(fig.source),
  ]);
}

function badge(ok: boolean): unknown {
  return el(
    {
      width: 72,
      height: 72,
      borderRadius: 36,
      background: ok ? UP : DOWN,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    el({ fontSize: 40, fontWeight: 800, color: "#ffffff" }, ok ? "✓" : "×"),
  );
}

function compare(fig: CompareFigure, accent: string, wash: string, width: number, height: number): unknown {
  const band = (title: string, rows: { text: string; ok: boolean }[], bg: string) =>
    el({ background: bg, borderRadius: 28, padding: "16px 18px", flexDirection: "column", marginBottom: 12 }, [
      el({ fontSize: 44, fontWeight: 800, color: accent, marginBottom: 8 }, title),
      ...rows.map((row) =>
        el({ alignItems: "center", marginTop: 8 }, [
          badge(row.ok),
          el({ fontSize: LABEL, fontWeight: 800, lineHeight: 1.2, flex: 1 }, row.text),
        ]),
      ),
    ]);
  return frame(width, height, [
    el({ fontSize: TITLE, fontWeight: 800, marginBottom: 14 }, fig.title),
    el({ flexGrow: 1, flexDirection: "column", justifyContent: "space-around" }, [
      band(fig.leftTitle, fig.left, wash),
      band(fig.rightTitle, fig.right, "#fde8e4"),
    ]),
    footer(fig.source),
  ]);
}

function steps(fig: StepsFigure, accent: string, wash: string, width: number, height: number): unknown {
  const last = fig.steps.length - 1;
  return frame(width, height, [
    el({ fontSize: TITLE, fontWeight: 800, color: accent, marginBottom: 8 }, fig.title),
    el({ flexGrow: 1, flexDirection: "column", justifyContent: "space-around" }, fig.steps.map((step, index) =>
      el({ alignItems: "center" }, [
        el({ width: 88, flexDirection: "column", alignItems: "center", marginRight: 16 }, [
          el(
            {
              width: 84,
              height: 84,
              borderRadius: 42,
              background: accent,
              color: "#ffffff",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              fontWeight: 800,
            },
            String(index + 1),
          ),
          index < last ? el({ width: 6, height: 28, background: wash, marginTop: 6 }, " ") : el({}, " "),
        ]),
        el({ flex: 1, background: "#ffffff", borderRadius: 24, padding: "14px 18px", flexDirection: "column" }, [
          el({ fontSize: 44, fontWeight: 800 }, step.title),
          el({ fontSize: MIN, fontWeight: 700, color: MUTED, marginTop: 4 }, step.detail),
        ]),
      ]),
    )),
    footer(fig.source),
  ]);
}

function timeline(fig: TimelineFigure, accent: string, width: number, height: number): unknown {
  const last = fig.marks.length - 1;
  return frame(width, height, [
    el({ fontSize: TITLE, fontWeight: 800, color: accent, marginBottom: 8 }, fig.title),
    el({ flexGrow: 1, flexDirection: "column", justifyContent: "space-around" }, fig.marks.map((item, index) =>
      el({ alignItems: "stretch" }, [
        el({ width: 48, flexDirection: "column", alignItems: "center", marginRight: 16 }, [
          el({ width: 32, height: 32, borderRadius: 16, background: accent, marginTop: 10 }, " "),
          index < last ? el({ width: 6, flexGrow: 1, background: "#d5deee", minHeight: 24 }, " ") : el({}, " "),
        ]),
        el({ flex: 1, flexDirection: "column", paddingBottom: 8 }, [
          el({ fontSize: 46, fontWeight: 800 }, item.label),
          el({ fontSize: LABEL, fontWeight: 800, color: UP, marginTop: 2 }, item.detail),
        ]),
      ]),
    )),
    footer(fig.source),
  ]);
}

export async function renderFigure(fig: Figure, accent: string, category = "pension"): Promise<{ png: Buffer; webp: Buffer }> {
  const { width, height } = FRAME[fig.ratio];
  const wash = WASH[category] ?? "#e4edf8";
  const icon = await iconUri(CATEGORY_ICON[category] ?? "landmark", accent);
  let tree: unknown;
  if (fig.kind === "summary") tree = summary(fig, accent, wash, icon, width, height);
  else if (fig.kind === "bar") tree = bars(fig, accent, width, height);
  else if (fig.kind === "compare") tree = compare(fig, accent, wash, width, height);
  else if (fig.kind === "steps") tree = steps(fig, accent, wash, width, height);
  else tree = timeline(fig, accent, width, height);
  const svg = await satori(tree as React.ReactNode, { width, height, fonts: satoriFonts() });
  const source = Buffer.from(svg);
  const png = await sharp(source).png({ compressionLevel: 9 }).toBuffer();
  const webp = await sharp(source).webp({ quality: 78 }).toBuffer();
  return { png, webp };
}
