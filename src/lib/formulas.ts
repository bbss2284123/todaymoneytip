import housing from "../data/housing-pension-2026-03-01.json";

/** 국민연금법 제62조. 연기 1개월에 1,000분의 6. 공단 안내는 조기 1개월 0.5% 감액. */
export const PENSION_EARLY_PER_MONTH = 0.005;
export const PENSION_DEFER_PER_MONTH = 0.006;
export const PENSION_MAX_MONTHS = 60;

/** 국민건강보험법 시행령 제44조. 2026-10-01 시행. 장기요양 비율은 공단 2026년 안내. */
export const HEALTH_RATE = 0.0719;
export const HEALTH_PROPERTY_WON_PER_SCORE = 211.5;
export const LONG_TERM_CARE_RATE = 0.009448;

/** 소득세법 제129조 제1항 제5호의3. 퇴직소득을 연금으로 받을 때. */
export const PENSIONIZED_RETIREMENT_FACTORS = [
  { maxYear: 10, factor: 0.7 },
  { maxYear: 20, factor: 0.6 },
  { maxYear: 99, factor: 0.5 },
] as const;

const BRACKETS: { upTo: number; rate: number; deduction: number }[] = [
  { upTo: 14_000_000, rate: 0.06, deduction: 0 },
  { upTo: 50_000_000, rate: 0.15, deduction: 1_260_000 },
  { upTo: 88_000_000, rate: 0.24, deduction: 5_760_000 },
  { upTo: 150_000_000, rate: 0.35, deduction: 15_440_000 },
  { upTo: 300_000_000, rate: 0.38, deduction: 19_940_000 },
  { upTo: 500_000_000, rate: 0.4, deduction: 25_940_000 },
  { upTo: 1_000_000_000, rate: 0.42, deduction: 35_940_000 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.45, deduction: 65_940_000 },
];

export function plainMoney(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const n = Math.abs(Math.round(amount));
  const man = Math.floor(n / 10_000);
  const rest = n % 10_000;
  if (man === 0) return `${sign}${rest.toLocaleString("ko-KR")}원`;
  if (rest === 0) return `${sign}${man.toLocaleString("ko-KR")}만 원`;
  return `${sign}${man.toLocaleString("ko-KR")}만 ${rest.toLocaleString("ko-KR")}원`;
}

export function serviceYearDeduction(years: number): number {
  const y = Math.max(0, Math.floor(years));
  if (y <= 5) return y * 1_000_000;
  if (y <= 10) return 5_000_000 + (y - 5) * 2_000_000;
  if (y <= 20) return 15_000_000 + (y - 10) * 2_500_000;
  return 40_000_000 + (y - 20) * 3_000_000;
}

export function convertedSalaryDeduction(converted: number): number {
  if (converted <= 8_000_000) return converted;
  if (converted <= 70_000_000) return 8_000_000 + (converted - 8_000_000) * 0.6;
  if (converted <= 100_000_000) return 45_200_000 + (converted - 70_000_000) * 0.55;
  if (converted <= 300_000_000) return 61_700_000 + (converted - 100_000_000) * 0.45;
  return 151_700_000 + (converted - 300_000_000) * 0.35;
}

export function incomeTaxOnBase(base: number): number {
  if (base <= 0) return 0;
  const row = BRACKETS.find((b) => base <= b.upTo) ?? BRACKETS[BRACKETS.length - 1];
  return Math.max(0, Math.floor(base * row.rate - row.deduction));
}

export function pensionTiming(input: {
  monthly: number;
  months: number;
  direction: "early" | "defer";
}): { factor: number; nextMonthly: number; delta: number; sentence: string } {
  const months = Math.min(PENSION_MAX_MONTHS, Math.max(0, Math.round(input.months)));
  const rate = input.direction === "early" ? PENSION_EARLY_PER_MONTH : PENSION_DEFER_PER_MONTH;
  const factor = months * rate;
  const delta = Math.round(input.monthly * factor);
  const nextMonthly =
    input.direction === "early" ? input.monthly - delta : input.monthly + delta;
  const way = input.direction === "early" ? "일찍 받으면" : "미루면";
  const tail = input.direction === "early" ? "덜 받아요" : "더 받아요";
  const sentence = `${months}개월 ${way} 월 ${plainMoney(delta)} ${tail}.`;
  return { factor, nextMonthly, delta, sentence };
}

export function severanceTax(input: { income: number; years: number }): {
  serviceDeduction: number;
  converted: number;
  convertedDeduction: number;
  taxBase: number;
  incomeTax: number;
  pensionTaxFirst10Years: number;
  sentence: string;
} {
  const years = Math.max(1, Math.floor(input.years));
  const serviceDeduction = Math.min(input.income, serviceYearDeduction(years));
  const converted = ((input.income - serviceDeduction) / years) * 12;
  const convertedDeduction = convertedSalaryDeduction(converted);
  const taxBase = Math.max(0, converted - convertedDeduction);
  const convertedTax = incomeTaxOnBase(taxBase);
  const incomeTax = Math.floor((convertedTax / 12) * years);
  const pensionTaxFirst10Years = Math.floor(incomeTax * 0.7);
  const saved = incomeTax - pensionTaxFirst10Years;
  const sentence = `일시금 소득세는 ${plainMoney(incomeTax)}이에요. 연금으로 10년 안에 받으면 ${plainMoney(saved)} 덜 내요.`;
  return {
    serviceDeduction,
    converted,
    convertedDeduction,
    taxBase,
    incomeTax,
    pensionTaxFirst10Years,
    sentence,
  };
}

export function healthPremium(input: { annualIncome: number; propertyScore: number }): {
  incomePart: number;
  propertyPart: number;
  care: number;
  total: number;
  sentence: string;
} {
  const monthlyIncome = Math.max(0, input.annualIncome) / 12;
  const incomePart = Math.round(monthlyIncome * HEALTH_RATE);
  const propertyPart = Math.round(Math.max(0, input.propertyScore) * HEALTH_PROPERTY_WON_PER_SCORE);
  const health = incomePart + propertyPart;
  const care = Math.round((health * LONG_TERM_CARE_RATE) / HEALTH_RATE);
  const total = health + care;
  const sentence =
    input.propertyScore > 0
      ? `소득과 재산 점수를 더하면 월 ${plainMoney(total)}이에요.`
      : `소득만 보면 월 ${plainMoney(total)}이에요. 재산 점수는 빠졌어요.`;
  return { incomePart, propertyPart, care, total, sentence };
}

export function housingPension(input: { age: number; priceWon: number }): {
  monthly: number | null;
  sentence: string;
  baseDate: string;
} {
  const ages = housing.ages as number[];
  const prices = housing.pricesWon as number[];
  const table = housing.monthlyWon as Record<string, number[]>;
  if (!ages.includes(input.age) || !prices.includes(input.priceWon)) {
    return {
      monthly: null,
      baseDate: housing.baseDate,
      sentence: "표에 있는 나이와 집값만 계산해요. 그 사이 값은 공사 조회를 보세요.",
    };
  }
  const monthly = table[String(input.age)][prices.indexOf(input.priceWon)];
  return {
    monthly,
    baseDate: housing.baseDate,
    sentence: `이 칸에서는 월 ${plainMoney(monthly)}이에요.`,
  };
}

export function livingGap(input: {
  spend: number;
  pension: number;
  basic: number;
  personal: number;
  other: number;
}): { gap: number; sentence: string } {
  const income = input.pension + input.basic + input.personal + input.other;
  const gap = Math.round(input.spend - income);
  if (gap > 0) return { gap, sentence: `한 달에 ${plainMoney(gap)}이 모자라요.` };
  if (gap < 0) return { gap, sentence: `한 달에 ${plainMoney(Math.abs(gap))}이 남아요.` };
  return { gap: 0, sentence: "버는 돈과 쓰는 돈이 같아요." };
}

export const formulaMeta = {
  "pension-timing": {
    baseDate: "2026-10-28",
    oneLiner: "일찍 받으면 한 달에 0.5%씩 줄고, 미루면 한 달에 0.6%씩 늘어 평생 갑니다.",
    meaning: "줄어든 금액은 한 달이 아니라 받는 날까지 계속됩니다.",
  },
  severance: {
    baseDate: "2026-10-28",
    oneLiner: "퇴직금을 1년치로 펼쳐 세율을 곱한 뒤, 다시 근속 연수로 줄입니다.",
    meaning: "연금으로 받으면 그 소득세의 70%부터 시작합니다. 운용수익 세금은 빼 두었어요.",
  },
  health: {
    baseDate: "2026-10-28",
    oneLiner: "연 소득을 12로 나눈 뒤 7.19%를 곱하고, 재산 점수가 있으면 211.5원을 곱해 더합니다.",
    meaning: "재산 점수를 모르면 소득분과 장기요양보험료만 보여 줍니다.",
  },
  housing: {
    baseDate: "2026-03-01",
    oneLiner: "공사 표에서 나이와 집값이 만나는 칸의 월지급금을 그대로 읽습니다.",
    meaning: "표에 없는 나이는 추정하지 않습니다. 집값이 12억 원을 넘어도 12억 원 칸입니다.",
  },
  "living-gap": {
    baseDate: "2026-10-28",
    oneLiner: "한 달 생활비에서 연금과 다른 소득을 뺍니다.",
    meaning: "평균 생활비는 넣지 않았어요. 우리 집 숫자를 넣어야 빈칸이 나옵니다.",
  },
} as const;
