import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCursorResearch, cursorCanonical } from "../src/sources/cursor-research.js";
import { parseCloudflareAgents } from "../src/sources/cloudflare-agents.js";

const card = (href: string, date = "2026-09-23T12:00:00.000Z") => `<a class="blog-directory__row" href="${href}"><time datetime="${date}">Sep 23</time><p>Research &amp; agents</p></a>`;
test("Cursor topic rows deduplicate rendered copies and exclude locales, navigation and external posts", () => {
  const articles = parseCursorResearch(card("/blog/research") + card("/blog/research/?utm=a") + card("/ja/blog/research") + card("https://x.ai/news/model") + card("/blog/topic/research") + '<a href="/blog/product"><p>Product</p></a>');
  assert.deepEqual(articles, [{ title: "Research & agents", url: "https://cursor.com/blog/research", publishedAt: "2026-09-23T12:00:00.000Z" }]);
  assert.throws(() => parseCursorResearch(card("/blog/research", "invalid")), /missing date/);
  assert.throws(() => parseCursorResearch("<html></html>"), /no articles/);
});
test("Cursor canonical identities must remain on the English official blog", () => {
  assert.equal(cursorCanonical('<link rel="canonical" href="https://cursor.com/blog/renamed/">', "https://cursor.com/blog/old"), "https://cursor.com/blog/renamed");
  for (const url of ["https://other.test/blog/article", "https://cursor.com/ja/blog/article", "/blog/topic/research"]) {
    assert.throws(() => cursorCanonical(`<link rel="canonical" href="${url}">`, "https://cursor.com/blog/article"), /invalid canonical/);
  }
});
const item = (url: string, category = "Agents", date = "Thu, 05 Nov 2026 17:03:04 GMT") => `<item><title>Agents &amp; people</title><link>${url}</link><category>${category}</category><pubDate>${date}</pubDate><description><![CDATA[<p>A short summary.</p>]]></description></item>`;
const rss = (items: string) => `<rss><channel>${items}</channel></rss>`;
test("Cloudflare uses tag RSS metadata, excludes locales/unrelated entries and deduplicates URLs", () => {
  const articles = parseCloudflareAgents(rss(item("https://blog.cloudflare.com/agents/") + item("https://blog.cloudflare.com/agents?utm=a") + item("https://blog.cloudflare.com/ja-jp/agents/") + item("https://other.test/article/") + item("https://blog.cloudflare.com/other/", "Security")));
  assert.deepEqual(articles, [{ title: "Agents & people", url: "https://blog.cloudflare.com/agents/", publishedAt: "2026-11-05T17:03:04.000Z", description: "A short summary." }]);
  assert.throws(() => parseCloudflareAgents(rss(item("https://blog.cloudflare.com/a/", "Agents", "bad"))), /invalid metadata/);
  assert.throws(() => parseCloudflareAgents("<html>error</html>"), /no articles/);
});
