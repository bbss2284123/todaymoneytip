export interface HighlightPart {
  mark: boolean;
  text: string;
}

/** Split a markdown text node on ==highlight==. Unclosed markers stay plain text. */
export function highlightParts(value: string): HighlightPart[] {
  if (!value.includes("==")) return [{ mark: false, text: value }];
  const pieces = value.split(/==([^=\n]+)==/g);
  const out: HighlightPart[] = [];
  pieces.forEach((text, index) => {
    if (!text) return;
    out.push({ mark: index % 2 === 1, text });
  });
  return out;
}
