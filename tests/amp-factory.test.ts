import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAmpNotes } from "../src/sources/amp-notes.js";
import { parseFactoryDroid } from "../src/sources/factory-droid.js";

const rss = (...items: string[]) => `<rss><channel>${items.join("")}</channel></rss>`;
const date = "Fri, 10 Apr 2026 07:00:00 GMT";
const item = (url: string, published = date) => `<item><title>Research &amp; agents</title><link>${url}</link><pubDate>${published}</pubDate><description><![CDATA[<p>A short summary.</p>]]></description></item>`;
const expected = (url: string) => ({
  title: "Research & agents", url, publishedAt: "2026-04-10T07:00:00.000Z", description: "A short summary.",
});

test("Amp uses official Notes entries, including the How We Build essay", () => {
  const base = "https://ampcode.com";
  assert.deepEqual(parseAmpNotes(rss(
    item(base + "/notes/orbs"), item(base + "/notes/orbs/?ref=feed"), item(base + "/how-we-build"),
    item(base + "/news/release"), item("https://other.test/notes/article"),
  )), [expected(base + "/notes/orbs"), expected(base + "/how-we-build")]);
  assert.throws(() => parseAmpNotes(rss(item(base + "/notes/orbs", "bad"))), /invalid metadata/);
});

test("Factory joins research cards and archive rows to RSS metadata, excluding featured products", () => {
  const card = (tag: string, slug: string, badge: string) =>
    `<${tag}><a href="/news/${slug}"></a><span>10 APR 2026 · ${badge}</span></${tag}>`;
  const base = "https://factory.com/news";
  const html = card("article", "frontier-harness", "Research") + card("li", "missions-architecture", "Research") +
    card("article", "router", "Product") + card("article", "missing-rss", "Research");
  const xml = rss(item(base + "/missions-architecture/"), item(base + "/frontier-harness"),
    item(base + "/router"), item(base + "/fundraising"));
  assert.deepEqual(parseFactoryDroid(html, xml), [
    expected(base + "/missions-architecture"), expected(base + "/frontier-harness"),
  ]);
  assert.throws(() => parseFactoryDroid(card("article", "router", "Product"), xml), /no articles/);
});
