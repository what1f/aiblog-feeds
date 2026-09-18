import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { sources } from "./sources/index.js";
import { renderRss } from "./rss.js";
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

function merge(discovered: Article[], previous: Article[]): Article[] {
  const byUrl = new Map<string, Article>(previous.map((article) => [article.url, article]));
  for (const article of discovered) {
    const old = byUrl.get(article.url);
    byUrl.set(article.url, {
      ...old,
      ...article,
      publishedAt: article.publishedAt ?? old?.publishedAt,
      description: article.description ?? old?.description,
    });
  }
  return [...byUrl.values()]
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "") || a.url.localeCompare(b.url))
    .slice(0, maxItems);
}

async function main(): Promise<void> {
  const previous = await readPrevious();
  const next: Record<string, Article[]> = {};

  // Complete discovery before writing: a failed source must not publish an empty feed.
  for (const source of sources) {
    const discovered = await source.discover(previous[source.id] ?? []);
    next[source.id] = merge(discovered, previous[source.id] ?? []);
    console.log(`${source.title}: ${discovered.length} found, ${next[source.id].length} retained`);
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
