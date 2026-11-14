import assert from "node:assert/strict";
import test from "node:test";
import { housingPension, pensionCredit, pensionTiming, severanceTax } from "../src/lib/formulas";

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

test("주택연금 표의 70세 3억 원", () => {
  assert.equal(housingPension({ age: 70, priceWon: 300_000_000 }).monthly, 923_000);
});
