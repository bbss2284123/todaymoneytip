import type { Figure } from "./types";

export function figurePlain(fig: Figure): string {
  const bits: string[] = [fig.alt, fig.caption, fig.source];
  if (fig.kind === "summary") {
    bits.push(fig.kicker, fig.lead, ...fig.rows.flatMap((row) => [row.label, row.value]));
  } else if (fig.kind === "bar") {
    bits.push(fig.title, ...fig.bars.flatMap((bar) => [bar.label, bar.value, String(bar.amount)]));
  } else if (fig.kind === "steps") {
    bits.push(fig.title, ...fig.steps.flatMap((step) => [step.title, step.detail]));
  } else if (fig.kind === "compare") {
    bits.push(
      fig.title,
      fig.leftTitle,
      fig.rightTitle,
      ...fig.left.map((row) => row.text),
      ...fig.right.map((row) => row.text),
    );
  } else {
    bits.push(fig.title, ...fig.marks.flatMap((mark) => [mark.label, mark.detail]));
  }
  return bits.join("\n");
}
