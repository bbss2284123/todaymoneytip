/**
 * 사이트마다 이 파일만 바꿉니다.
 * 이름, 도메인, 카테고리, 색, 글쓴이, 광고, 분석, 인증, 키워드 가중치.
 */
export type CategoryGroup = "퇴직 전" | "연금·보험" | "생활·자산";

export interface Category {
  id: string;
  name: string;
  description: string;
  group: CategoryGroup;
}

export const siteConfig = {
  name: "오늘의 머니팁",
  logoText: "오늘의 머니팁",
  url: "https://todaymoneytip.com",
  description:
    "퇴직 전후 돈 문제를, 기준일과 출처를 붙여 먼저 답하는 안내서입니다. 국민연금, 퇴직금, 건강보험, 기초연금을 쉬운 말로 정리합니다.",
  lang: "ko",
  locale: "ko_KR",
  contactEmail: "contact@todaymoneytip.com",
  legalUpdated: "2026-10-28",
  postsPerPage: 10,
  indexNowKey: "b7e4c1a09f6d4823a5c8e7d14f20b6aa",
  author: {
    name: "백현",
    slug: "baek-hyeon",
    role: "글쓴이",
    bio: "백현은 퇴직과 노후 돈 정보를 공식 자료 기준으로 쉬운 말로 정리합니다. 자격이나 경력을 내세우지 않습니다. 특정 상품 가입을 권하지 않습니다.",
  },
  design: {
    fontFamily: '"Pretendard Variable", Pretendard, system-ui, sans-serif',
    colorBg: "#ffffff",
    colorSurface: "#ffffff",
    colorText: "#111111",
    colorAccent: "#1f5fbf",
    colorAccentSoft: "#e8f0fb",
    colorLine: "#e6e4df",
    colorPanel: "#f6f5f2",
    colorWarn: "#7a3412",
    colorWarnBg: "#fff4ec",
    colorOk: "#0f5c45",
    colorOkBg: "#e7f6f1",
    colorFooter: "#f6f5f2",
    contentMax: "680px",
    pageMax: "1080px",
    bodySizeMobile: "20px",
    bodySizeDesktop: "21px",
    lineHeight: "1.85",
    h1Mobile: "30px",
    h1Desktop: "40px",
    h2Mobile: "26px",
    h2Desktop: "32px",
    tapMin: "48px",
    choiceMin: "60px",
    radius: "14px",
  },
  categories: [
    {
      id: "prepare",
      name: "은퇴준비",
      group: "퇴직 전",
      description: "퇴직 전에 연금, 건강보험, 퇴직금을 어떤 순서로 볼지 적는 글입니다. 기한이 있는 일부터 달력에 옮기세요.",
    },
    {
      id: "pension",
      name: "국민연금",
      group: "연금·보험",
      description: "국민연금을 언제, 얼마나 받을지 기준일과 함께 정리합니다. 조기·연기, 추납, 반납, 분할을 각각 다른 글에서 봅니다.",
    },
    {
      id: "severance",
      name: "퇴직금·IRP·연금저축",
      group: "연금·보험",
      description: "퇴직금을 한 번에 받을지, 연금으로 나눌지 세금부터 비교합니다. IRP와 연금저축 세액공제는 퇴직소득과 칸을 나누어 적습니다.",
    },
    {
      id: "basic",
      name: "기초연금·복지",
      group: "연금·보험",
      description: "만 65세 전후 기초연금의 소득 선, 최고액, 신청 달을 나눕니다. 금액은 창구 조회가 최종입니다.",
    },
    {
      id: "health",
      name: "건강보험·의료비",
      group: "연금·보험",
      description: "퇴직 뒤 건강보험을 피부양자로 남길지, 임의계속으로 낼지, 지역보험료로 갈지 나눕니다. 고지서의 날짜를 먼저 적으세요.",
    },
    {
      id: "job",
      name: "실업급여·재취업",
      group: "퇴직 전",
      description: "일을 그만둔 뒤 구직급여를 며칠 받을 수 있는지, 나이와 가입 기간으로 봅니다. 신청은 고용센터 순서를 따릅니다.",
    },
    {
      id: "housing",
      name: "주택·주택연금",
      group: "생활·자산",
      description: "주택연금 월지급금은 공사 예시표의 나이와 집값 칸으로 읽습니다. 표에 없는 값은 이 사이트에서 만들지 않습니다.",
    },
    {
      id: "tax",
      name: "세금·상속·증여",
      group: "생활·자산",
      description: "퇴직 전후에 마주치는 세금 중, 확인한 숫자만 적습니다. 상속과 증여의 공제 한도는 공식 고시를 다시 보기 전에는 쓰지 않습니다.",
    },
    {
      id: "assets",
      name: "자산관리",
      group: "생활·자산",
      description: "은퇴 후 돈을 나누는 이야기는, 확인한 이율이 있을 때만 숫자를 적습니다. 금리 예시는 만들지 않습니다.",
    },
    {
      id: "business",
      name: "창업·소상공인",
      group: "생활·자산",
      description: "퇴직 뒤 작은 사업을 시작할 때 보는 제도와 세금입니다. 지원 금액은 공식 안내를 확인하기 전에는 적지 않습니다.",
    },
  ] as Category[],
  adsense: {
    publisherId: "",
    slots: {
      afterIntro: "",
      midArticle: "",
      endArticle: "",
      sidebar: "",
    },
  },
  ga4Id: "G-DBSXETGNQV",
  // Pages 프로젝트가 비콘을 이미 넣습니다. 여기 토큰을 채우면 비콘이 두 번 나갑니다.
  cloudflareWebAnalyticsToken: "",
  verification: {
    google: "",
    naver: "",
    bing: "",
  },
  keywords: {
    weights: {
      volume: 0.2,
      competition: 0.14,
      trend: 0.12,
      seasonality: 0.14,
      adsense: 0.1,
      fit: 0.2,
      evergreen: 0.1,
    },
    retirementTerms: [
      "퇴직",
      "은퇴",
      "연금",
      "피부양자",
      "임의계속",
      "실업급여",
      "주택연금",
      "기초연금",
      "퇴직소득세",
      "추납",
      "반납",
      "재취업",
      "상속",
      "증여",
    ],
  },
} as const;

export type CategoryId = (typeof siteConfig.categories)[number]["id"];

export function categoryById(id: string): Category | undefined {
  return siteConfig.categories.find((c) => c.id === id);
}

export function absoluteUrl(path: string): string {
  const base = siteConfig.url.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
