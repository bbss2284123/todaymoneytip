import assert from "node:assert/strict";
import test from "node:test";
import { housingPension, pensionTiming, severanceTax } from "../src/lib/formulas";

test("퇴직소득 1억 원 20년 예시", () => {
  const tax = severanceTax({ income: 100_000_000, years: 20 });
  assert.equal(tax.incomeTax, 1_120_000);
  assert.equal(tax.pensionTaxFirst10Years, 784_000);
});

test("조기 12개월과 연기 12개월", () => {
  assert.equal(pensionTiming({ monthly: 1_000_000, months: 12, direction: "early" }).delta, 60_000);
  assert.equal(pensionTiming({ monthly: 1_000_000, months: 12, direction: "defer" }).delta, 72_000);
});

test("주택연금 표의 70세 3억 원", () => {
  assert.equal(housingPension({ age: 70, priceWon: 300_000_000 }).monthly, 923_000);
});
