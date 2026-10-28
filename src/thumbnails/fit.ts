/** 제목을 공백 단위로만 잘라 최대 두 줄에 맞춥니다. 음절 중간은 자르지 않습니다. */
export function fitLines(
  title: string,
  maxWidthPx: number,
  maxSize: number,
  minSize = 42,
): { lines: string[]; size: number } {
  const words = title.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const widthOf = (text: string, size: number) => [...text].length * size * 0.98;

  for (let size = maxSize; size >= minSize; size -= 2) {
    if (words.length <= 1) {
      if (widthOf(words[0] ?? "", size) <= maxWidthPx) return { lines: words, size };
      continue;
    }
    let best: { lines: [string, string]; delta: number } | null = null;
    for (let i = 1; i < words.length; i++) {
      const left = words.slice(0, i).join(" ");
      const right = words.slice(i).join(" ");
      if (widthOf(left, size) <= maxWidthPx && widthOf(right, size) <= maxWidthPx) {
        const delta = Math.abs([...left].length - [...right].length);
        if (!best || delta < best.delta) best = { lines: [left, right], delta };
      }
    }
    if (best) return { lines: best.lines, size };
  }

  const chars = [...title.replace(/\s+/g, "")];
  const mid = Math.ceil(chars.length / 2);
  return {
    lines: [chars.slice(0, mid).join(""), chars.slice(mid).join("")].filter(Boolean),
    size: minSize,
  };
}
