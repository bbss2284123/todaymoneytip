import assert from "node:assert/strict";
import test from "node:test";
import { cardDeduction, depositInterest, housingPension, kpassRefund, pensionCredit, pensionTiming, severanceTax } from "../src/lib/formulas";

test("퇴직소득 1억 원 20년 예시", () => {
  const tax = severanceTax({ income: 100_000_000, years: 20 });
  assert.equal(tax.incomeTax, 1_120_000);
  assert.equal(tax.pensionTaxFirst10Years, 784_000);
});

test("조기 12개월과 연기 12개월", () => {
  assert.equal(pensionTiming({ monthly: 1_000_000, months: 12, direction: "early" }).delta, 60_000);
  assert.equal(pensionTiming({ monthly: 1_000_000, months: 12, direction: "defer" }).delta, 72_000);
});

test("연금저축 600만 원만 넣으면 남은 합산 한도는 300만 원", () => {
  const row = pensionCredit({ savings: 6_000_000, irp: 0, salary: 50_000_000 });
  assert.equal(row.counted, 6_000_000);
  assert.equal(row.savingsLeft, 0);
  assert.equal(row.totalLeft, 3_000_000);
  assert.equal(row.rate, 0.15);
  assert.equal(row.credit, 900_000);
});

test("합산 900만 원과 총급여 초과는 12%", () => {
  const full = pensionCredit({ savings: 6_000_000, irp: 3_000_000, salary: 55_000_000 });
  assert.equal(full.counted, 9_000_000);
  assert.equal(full.credit, 1_350_000);
  const high = pensionCredit({ savings: 6_000_000, irp: 3_000_000, salary: 55_000_001 });
  assert.equal(high.rate, 0.12);
  assert.equal(high.credit, 1_080_000);
});

test("예금 1억 원, 0.4%포인트, 1년은 세후 338,400원", () => {
  const row = depositInterest({ principal: 100_000_000, rateTenth: 4, months: 12 });
  assert.equal(row.pretax, 400_000);
  assert.equal(row.tax, 61_600);
  assert.equal(row.afterTax, 338_400);
});

test("신용카드 1,500만 원과 12월 체크 100만 원", () => {
  const base = cardDeduction({ salary: 50_000_000, credit: 15_000_000, debit: 0, children: 0, taxRatePercent: 15 });
  assert.equal(base.deduction, 375_000);
  assert.equal(base.sentence.includes("37만 5,000원"), true);
  const switched = cardDeduction({
    salary: 50_000_000,
    credit: 14_000_000,
    debit: 1_000_000,
    children: 0,
    taxRatePercent: 15,
  });
  assert.equal(switched.deduction, 525_000);
  assert.equal(switched.sentence.includes("52만 5,000원"), true);
  assert.equal(switched.tax - base.tax, 22_500);
});

test("문턱 아래는 0원이고 기본 한도에서 잘림", () => {
  const under = cardDeduction({ salary: 50_000_000, credit: 10_000_000, debit: 0 });
  assert.equal(under.deduction, 0);
  const mixed = cardDeduction({ salary: 50_000_000, credit: 10_000_000, debit: 3_000_000 });
  assert.equal(mixed.deduction, 150_000);
  const capped = cardDeduction({ salary: 50_000_000, credit: 40_000_000, debit: 0, children: 0 });
  assert.equal(capped.deduction, 3_000_000);
  assert.equal(cardDeduction({ salary: 50_000_000, credit: 40_000_000, debit: 0, children: 1 }).deduction, 3_500_000);
  assert.equal(cardDeduction({ salary: 50_000_000, credit: 40_000_000, debit: 0, children: 2 }).deduction, 4_000_000);
  assert.equal(cardDeduction({ salary: 70_000_001, credit: 40_000_000, debit: 0, children: 0 }).cap, 2_500_000);
  assert.equal(cardDeduction({ salary: 80_000_000, credit: 40_000_000, debit: 0, children: 1 }).cap, 2_750_000);
});

test("모두의카드 수도권 일반 9만 원은 정액 2만 8천 원", () => {
  const row = kpassRefund({ fare: 90_000, rides: 15, region: "capital", group: "general", card: "normal" });
  assert.equal(row.rateRefund, 18_000);
  assert.equal(row.flatRefund, 28_000);
  assert.equal(row.best, 28_000);
  const under = kpassRefund({ fare: 90_000, rides: 14, region: "capital", group: "general", card: "normal" });
  assert.equal(under.best, 0);
  const three = kpassRefund({ fare: 60_000, rides: 15, region: "capital", group: "three", card: "normal" });
  assert.equal(three.rateRefund, 30_000);
  assert.equal(three.flatRefund, 15_000);
  assert.equal(three.best, 30_000);
});

test("주택연금 표의 70세 3억 원", () => {
  assert.equal(housingPension({ age: 70, priceWon: 300_000_000 }).monthly, 923_000);
});
