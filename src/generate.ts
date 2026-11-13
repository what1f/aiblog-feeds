import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { sources } from "./sources/index.js";
import { renderRss } from "./rss.js";
import { mergeArticles } from "./merge.js";
import type { Article } from "./types.js";

const root = process.cwd();
const dataPath = join(root, "data", "articles.json");
const feedDir = join(root, "feeds");
const maxItems = 100;

async function readPrevious(): Promise<Record<string, Article[]>> {
  try {
    return JSON.parse(await readFile(dataPath, "utf8")) as Record<string, Article[]>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

async function main(): Promise<void> {
  const previous = await readPrevious();
  const next: Record<string, Article[]> = {};

  // Preserve the last successful feed when an individual source fails.
  for (const source of sources) {
    try {
      const discovered = await source.discover(previous[source.id] ?? []);
      next[source.id] = mergeArticles(discovered, previous[source.id] ?? [], source.id, maxItems);
      console.log(`${source.title}: ${discovered.length} found, ${next[source.id].length} retained`);
    } catch (error) {
      next[source.id] = mergeArticles([], previous[source.id] ?? [], source.id, maxItems);
      console.warn(`${source.title}: update failed; retained ${next[source.id].length} articles`, error);
      if (process.env.GITHUB_ACTIONS) console.warn(`::warning::${source.title}: update failed; previous articles retained`);
    }
  }

  const feeds = new Map<string, string>();
  for (const source of sources) {
    feeds.set(`${source.id}.xml`, renderRss(source, next[source.id]));
  }
  const combined = sources.flatMap((source) => next[source.id].map((article) => ({
    ...article, sourceTitle: source.title,
  }))).sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "") || a.url.localeCompare(b.url));
  feeds.set("all.xml", renderRss({
    title: "AI Blog Feeds",
    url: "https://github.com/what1f/aiblog-feeds",
    description: "AI developer and engineering articles from selected blogs.",
  }, combined.slice(0, 200)));

  await mkdir(join(root, "data"), { recursive: true });
  await mkdir(feedDir, { recursive: true });
  await writeFile(dataPath, `${JSON.stringify(next, null, 2)}\n`);
  for (const [filename, content] of feeds) await writeFile(join(feedDir, filename), content);
}

await main();
