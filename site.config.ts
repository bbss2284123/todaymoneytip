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
      description: "퇴직 전 체크리스트와 퇴직 한 달 전, 다음 날, 그 뒤에 할 일입니다.",
    },
    {
      id: "pension",
      name: "국민연금",
      group: "연금·보험",
      description: "수령액, 조기·연기, 추납·반납, 임의계속가입을 기준일과 함께 정리합니다.",
    },
    {
      id: "severance",
      name: "퇴직금·IRP·연금저축",
      group: "연금·보험",
      description: "퇴직소득세, 일시금과 연금 수령, IRP와 연금저축 세액공제입니다.",
    },
    {
      id: "basic",
      name: "기초연금·복지",
      group: "연금·보험",
      description: "만 65세 전후 기초연금과 복지 신청을 쉬운 말로 안내합니다.",
    },
    {
      id: "health",
      name: "건강보험·의료비",
      group: "연금·보험",
      description: "피부양자, 지역가입자 전환, 임의계속가입, 의료비입니다.",
    },
    {
      id: "job",
      name: "실업급여·재취업",
      group: "퇴직 전",
      description: "중장년 일자리, 실업급여, 국민내일배움카드입니다.",
    },
    {
      id: "housing",
      name: "주택·주택연금",
      group: "생활·자산",
      description: "주택연금 월지급금과 집을 담보로 한 노후 현금흐름입니다.",
    },
    {
      id: "tax",
      name: "세금·상속·증여",
      group: "생활·자산",
      description: "연말정산, 상속, 증여처럼 퇴직 전후에 마주치는 세금입니다.",
    },
    {
      id: "assets",
      name: "자산관리",
      group: "생활·자산",
      description: "예금·적금, 배당, 안전자산처럼 은퇴 후 돈을 나누는 방법입니다.",
    },
    {
      id: "business",
      name: "창업·소상공인",
      group: "생활·자산",
      description: "퇴직 뒤 작은 사업을 시작할 때 보는 제도와 세금입니다.",
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
