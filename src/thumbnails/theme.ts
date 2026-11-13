/** 썸네일 분류 색. 글자는 왼쪽의 어두운 쪽에 둔다. */
export interface ArtPalette {
  stroke: string;
  fill: string;
  deep: string;
  paper: string;
  accent: string;
}

export interface ThumbTheme {
  from: string;
  to: string;
  glow: string;
  pillBg: string;
  pillFg: string;
  pillIcon: string;
  label: string;
  art: ArtPalette;
}

export const THEME: Record<string, ThumbTheme> = {
  pension: {
    from: "#07182e",
    to: "#1a4e8c",
    glow: "rgba(158, 198, 255, 0.20)",
    pillBg: "#e5f0ff",
    pillFg: "#0c2d55",
    pillIcon: "landmark",
    label: "국민연금",
    art: { stroke: "#d7e8ff", fill: "#3c7ec4", deep: "#0e3468", paper: "#f3f8ff", accent: "#ffb03a" },
  },
  severance: {
    from: "#2a0e16",
    to: "#8e2c40",
    glow: "rgba(255, 180, 190, 0.18)",
    pillBg: "#ffe8ec",
    pillFg: "#5c1826",
    pillIcon: "banknote",
    label: "퇴직금·IRP",
    art: { stroke: "#ffd5dc", fill: "#c45a6c", deep: "#6a2030", paper: "#fff5f6", accent: "#ffb03a" },
  },
  health: {
    from: "#062428",
    to: "#0f6f78",
    glow: "rgba(168, 236, 228, 0.20)",
    pillBg: "#dff8f6",
    pillFg: "#084248",
    pillIcon: "heart-pulse",
    label: "건강보험",
    art: { stroke: "#d6fffb", fill: "#2a9aa4", deep: "#0c4e56", paper: "#f3fffe", accent: "#ffb03a" },
  },
  basic: {
    from: "#062216",
    to: "#1a7a46",
    glow: "rgba(176, 232, 196, 0.18)",
    pillBg: "#e5f8ec",
    pillFg: "#0c3d22",
    pillIcon: "coins",
    label: "기초연금",
    art: { stroke: "#d9f5e4", fill: "#3aaa6a", deep: "#0e5a32", paper: "#f4fff8", accent: "#ffb03a" },
  },
  housing: {
    from: "#2a160c",
    to: "#b35c1c",
    glow: "rgba(255, 200, 150, 0.20)",
    pillBg: "#fff0e2",
    pillFg: "#5c2e0c",
    pillIcon: "house",
    label: "주택연금",
    art: { stroke: "#ffe4cc", fill: "#e08948", deep: "#8a4014", paper: "#fff8f1", accent: "#ffe08a" },
  },
  tax: {
    from: "#160e28",
    to: "#5a2d92",
    glow: "rgba(214, 180, 255, 0.20)",
    pillBg: "#f3e9ff",
    pillFg: "#3a1868",
    pillIcon: "receipt",
    label: "세금",
    art: { stroke: "#eadcff", fill: "#8a64c8", deep: "#3e2070", paper: "#faf7ff", accent: "#ffb03a" },
  },
  assets: {
    from: "#1c1028",
    to: "#6a3278",
    glow: "rgba(236, 186, 244, 0.18)",
    pillBg: "#fbe9ff",
    pillFg: "#4a1858",
    pillIcon: "coins",
    label: "자산관리",
    art: { stroke: "#f6dcff", fill: "#b06cbc", deep: "#5a2864", paper: "#fff7ff", accent: "#ffb03a" },
  },
  prepare: {
    from: "#141c26",
    to: "#3e5164",
    glow: "rgba(206, 218, 230, 0.18)",
    pillBg: "#e8eef4",
    pillFg: "#1c2a38",
    pillIcon: "calendar",
    label: "은퇴준비",
    art: { stroke: "#e4edf5", fill: "#7d93a8", deep: "#2c3e50", paper: "#f7fafc", accent: "#ffb03a" },
  },
  job: {
    from: "#12182e",
    to: "#2f3d86",
    glow: "rgba(186, 196, 255, 0.18)",
    pillBg: "#e8ecff",
    pillFg: "#1a2458",
    pillIcon: "briefcase",
    label: "실업급여",
    art: { stroke: "#dde3ff", fill: "#6d7ed0", deep: "#24306a", paper: "#f6f7ff", accent: "#ffb03a" },
  },
  business: {
    from: "#1c1810",
    to: "#6a5424",
    glow: "rgba(232, 214, 168, 0.18)",
    pillBg: "#f8f1de",
    pillFg: "#3a3014",
    pillIcon: "briefcase",
    label: "창업",
    art: { stroke: "#f3ead0", fill: "#c4a25a", deep: "#5a481c", paper: "#fffaf0", accent: "#fff1c2" },
  },
};

/** 감소는 밝은 산호, 증가와 그 밖 숫자는 밝은 금색. 어두운 바탕용이다. */
export const BADGE = {
  minus: { bg: "#ff5340", fg: "#ffffff" },
  plus: { bg: "#ffe08a", fg: "#1a1408" },
  neutral: { bg: "#ffe08a", fg: "#1a1408" },
} as const;
