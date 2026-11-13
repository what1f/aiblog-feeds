import { load } from "cheerio";
import { absoluteUrl, clean } from "../shared.js";
import type { Article } from "../types.js";

export function rssArticleUrl(href: string | undefined, home: string, path: RegExp): string | undefined {
  const url = absoluteUrl(href, home);
  if (url && path.test(new URL(url).pathname)) return url.replace(/\/$/, "");
}

export function parseRssArticles(
  xml: string, home: string, path: RegExp, source: string, allowed?: Set<string>,
): Article[] {
  const $ = load(xml, { xml: true });
  const articles = new Map<string, Article>();
  $("rss > channel > item").each((_, element) => {
    const item = $(element);
    const href = clean(item.children("link").text());
    if (!href) return;
    const url = rssArticleUrl(href, home, path);
    if (!url || (allowed && !allowed.has(url))) return;
    const title = clean(item.children("title").text());
    const date = new Date(clean(item.children("pubDate").text()));
    if (!title || Number.isNaN(date.getTime())) throw new Error(`${source}: invalid metadata for ${url}`);
    const rawDescription = item.children("description").text();
    const description = clean(load(rawDescription).text());
    articles.set(url, { title, url, publishedAt: date.toISOString(), description: description || undefined });
  });
  if (!articles.size) throw new Error(`${source}: no articles found`);
  return [...articles.values()];
}
