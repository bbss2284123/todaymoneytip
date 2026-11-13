import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { figures } from "../src/infographics/catalog";
import { figureProblems } from "../src/infographics/validate";
import { loadFacts } from "../src/lib/check";

test("글마다 그림 2~4장이고 숫자는 원장에 있다", () => {
  const dir = path.join(process.cwd(), "src/content/posts");
  const files = readdirSync(dir).filter((name) => name.endsWith(".mdx"));
  assert.equal(files.length, 20);
  assert.equal(Object.keys(figures).length, 20);
  for (const file of files) {
    const id = file.replace(/\.mdx$/, "");
    const body = readFileSync(path.join(dir, file), "utf8").split("\n---\n").slice(1).join("\n---\n");
    const facts = loadFacts(path.join(process.cwd(), "work", id, "facts.yaml"));
    const problems = figureProblems(id, body, facts);
    assert.deepEqual(problems, [], `${id}: ${problems.join(" | ")}`);
  }
});
