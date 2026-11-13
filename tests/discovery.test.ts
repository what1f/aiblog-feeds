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
    globalThis.fetch = async (url) => {
      const address = String(url);
      if (address.includes("anthropic.com/engineering")) return new Response(engineering);
      if (address === "https://cursor.com/blog/topic/research") return new Response('<a class="blog-directory__row" href="/blog/research"><time datetime="2026-11-01T00:00:00Z"></time><p>Cursor research article</p></a>');
      if (address === "https://cursor.com/blog/research") return new Response('<link rel="canonical" href="https://cursor.com/blog/research">');
      if (address === "https://blog.cloudflare.com/tag/agents/rss") return new Response('<rss><channel><item><title>Cloudflare agents article</title><link>https://blog.cloudflare.com/agents-article/</link><category>Agents</category><pubDate>Sun, 01 Nov 2026 00:00:00 GMT</pubDate></item></channel></rss>');
      const rss = (title: string, link: string) => `<rss><channel><item><title>${title}</title><link>${link}</link><pubDate>Sun, 01 Nov 2026 00:00:00 GMT</pubDate></item></channel></rss>`;
      if (address === "https://ampcode.com/notes.rss") return new Response(rss("Amp notes article", "https://ampcode.com/notes/article"));
      if (address === "https://factory.com/news?category=research") return new Response('<li><a href="/news/harness"></a><span>01 NOV 2026 · Research</span></li>');
      if (address === "https://factory.com/news/rss") return new Response(rss("Factory research article", "https://factory.com/news/harness"));
      return new Response("<html></html>");
    };
    process.chdir(directory);
    await import("../src/generate.js");
    const data = JSON.parse(await readFile(join(directory, "data/articles.json"), "utf8"));
    assert.deepEqual(data["claude-blog"], [oldArticle]);
    assert.equal(data["anthropic-engineering"][0].title, "Source control");
    const combined = await readFile(join(directory, "feeds/all.xml"), "utf8");
    assert.match(combined, /Previous article/);
    assert.match(combined, /Source control/);
    for (const [id, title] of [["cursor-research", "Cursor research article"], ["cloudflare-agents", "Cloudflare agents article"], ["amp-notes", "Amp notes article"], ["factory-droid", "Factory research article"]]) {
      assert.equal(data[id].length, 1);
      assert.match(combined, new RegExp(title));
      assert.match(await readFile(join(directory, `feeds/${id}.xml`), "utf8"), new RegExp(title));
    }
  } finally {
    globalThis.fetch = originalFetch;
    process.chdir(cwd);
    await rm(directory, { recursive: true, force: true });
  }
});
