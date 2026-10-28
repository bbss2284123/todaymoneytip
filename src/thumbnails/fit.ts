/** 썸네일 제목은 공백에서만 끊고, 한 줄은 대략 14자, 최대 두 줄입니다. */
export function thumbLines(title: string): string[] {
  const cleaned = title.replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
  const words = cleaned.split(" ").filter(Boolean);
  const lines = ["", ""];
  let row = 0;
  for (const word of words) {
    const next = lines[row] ? `${lines[row]} ${word}` : word;
    if ([...next].length <= 14) {
      lines[row] = next;
      continue;
    }
    if (!lines[row]) {
      lines[row] = [...word].slice(0, 14).join("");
      continue;
    }
    if (row === 0) {
      row = 1;
      lines[1] = [...word].length > 14 ? [...word].slice(0, 14).join("") : word;
      continue;
    }
    break;
  }
  return lines.filter(Boolean);
}

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
