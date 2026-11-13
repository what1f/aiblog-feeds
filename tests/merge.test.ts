import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeArticles } from "../src/merge.js";
import { renderRss } from "../src/rss.js";

const old = { title: "Tools", url: "https://www.anthropic.com/engineering/tools", publishedAt: "2025-01-01T00:00:00.000Z", description: "Useful tools" };
const moved = { title: "Tools renamed", url: "https://www.anthropic.com/research/tools" };

test("merges migrated URLs and history while preserving original GUID and metadata", () => {
  const merged = mergeArticles([moved], [moved, old], "anthropic-engineering");
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0], { ...old, ...moved, guid: old.url });
  assert.deepEqual(mergeArticles([moved], merged, "anthropic-engineering"), merged);
  assert.deepEqual(mergeArticles([], [moved, old], "anthropic-engineering"), merged);
  const rss = renderRss({ title: "Test", url: "https://example.com", description: "Test" }, merged);
  assert.ok(rss.includes(`<link>${moved.url}</link>`));
  assert.ok(rss.includes(`<guid isPermaLink="true">${old.url}</guid>`));
});

test("preserves an existing research GUID if a link later changes", () => {
  const existing = { ...moved, guid: moved.url };
  assert.equal(mergeArticles([old], [existing], "anthropic-engineering")[0].guid, moved.url);
});

test("does not merge titles, other sources, other hosts or other paths", () => {
  const entries = [old, { ...old, url: "https://www.anthropic.com/research/other" }, { ...old, url: "https://example.com/research/tools" }, { ...old, url: "https://www.anthropic.com/news/tools" }];
  assert.equal(mergeArticles(entries, [], "anthropic-engineering").length, 4);
  assert.equal(mergeArticles([moved], [old], "other").length, 2);
});
