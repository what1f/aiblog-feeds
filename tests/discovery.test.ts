import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseAnthropicEngineering } from "../src/sources/anthropic-engineering.js";
import { parseClaudeBlog } from "../src/sources/claude-blog.js";

const engineering = `<article><time>Oct 13, 2026</time><h3><a href="/research/source-control">Source control</a></h3></article>`;

test("discovers Engineering research links with dates outside the link", async () => {
  const articles = await parseAnthropicEngineering(engineering);
  assert.equal(articles[0].url, "https://www.anthropic.com/research/source-control");
  assert.equal(articles[0].publishedAt, "2026-10-13T00:00:00.000Z");
  await assert.rejects(parseAnthropicEngineering("<html></html>"), /no articles/);
});

test("discovers Claude resource cards and rejects empty listings", () => {
  const articles = parseClaudeBlog(`<a href="/resources/articles/agents"><span class="ResourceCard__meta">Oct 22, 2026</span><h3>Building agents</h3></a>`);
  assert.equal(articles[0].title, "Building agents");
  assert.equal(articles[0].publishedAt, "2026-10-22T00:00:00.000Z");
  assert.throws(() => parseClaudeBlog("<html></html>"), /no articles/);
});

test("failed sources retain history while successful sources publish", async () => {
  const directory = await mkdtemp(join(tmpdir(), "aiblog-test-"));
  const cwd = process.cwd();
  const originalFetch = globalThis.fetch;
  const oldArticle = { title: "Previous article", url: "https://claude.com/blog/previous", publishedAt: "2026-09-01T00:00:00.000Z" };
  try {
    await mkdir(join(directory, "data"));
    await writeFile(join(directory, "data/articles.json"), JSON.stringify({ "claude-blog": [oldArticle] }));
    globalThis.fetch = async (url) => new Response(String(url).includes("anthropic.com/engineering") ? engineering : "<html></html>");
    process.chdir(directory);
    await import("../src/generate.js");
    const data = JSON.parse(await readFile(join(directory, "data/articles.json"), "utf8"));
    assert.deepEqual(data["claude-blog"], [oldArticle]);
    assert.equal(data["anthropic-engineering"][0].title, "Source control");
    const combined = await readFile(join(directory, "feeds/all.xml"), "utf8");
    assert.match(combined, /Previous article/);
    assert.match(combined, /Source control/);
  } finally {
    globalThis.fetch = originalFetch;
    process.chdir(cwd);
    await rm(directory, { recursive: true, force: true });
  }
});
