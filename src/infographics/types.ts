export type Ratio = "1:1" | "4:5";
export type Tone = "up" | "down" | "base";

/** 720px wide. On a 350px column (390px phone minus page padding) 38px type is about 18px CSS. */
export const FRAME: Record<Ratio, { width: number; height: number }> = {
  "1:1": { width: 720, height: 720 },
  "4:5": { width: 720, height: 900 },
};

type Common = {
  id: string;
  alt: string;
  caption: string;
  source: string;
  ratio: Ratio;
};

export type SummaryFigure = Common & {
  kind: "summary";
  kicker: string;
  lead: string;
  rows: { label: string; value: string; tone?: Tone }[];
};

export type BarFigure = Common & {
  kind: "bar";
  title: string;
  bars: { label: string; value: string; amount: number; tone: Tone }[];
};

export type StepsFigure = Common & {
  kind: "steps";
  title: string;
  steps: { title: string; detail: string }[];
};

export type CompareFigure = Common & {
  kind: "compare";
  title: string;
  leftTitle: string;
  rightTitle: string;
  left: { text: string; ok: boolean }[];
  right: { text: string; ok: boolean }[];
};

export type TimelineFigure = Common & {
  kind: "timeline";
  title: string;
  marks: { label: string; detail: string }[];
};

export type Figure = SummaryFigure | BarFigure | StepsFigure | CompareFigure | TimelineFigure;
