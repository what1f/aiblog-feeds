import { load } from "cheerio";
import { absoluteUrl, clean, fetchHtml } from "../shared.js";
import type { Article, Source } from "../types.js";

const home = "https://cursor.com/blog/topic/research";

function articleUrl(href: string | undefined): string | undefined {
  const url = absoluteUrl(href, home);
  if (!url || !/^\/blog\/[^/]+\/?$/.test(new URL(url).pathname)) return;
  return url.replace(/\/$/, "");
}

// Use the official Research topic, not title keywords or the unfiltered blog.
export function parseCursorResearch(html: string): Article[] {
  const $ = load(html);
  const articles = new Map<string, Article>();
  $("a.blog-directory__row[href]").each((_, element) => {
    const card = $(element);
    const url = articleUrl(card.attr("href"));
    const title = clean(card.find("p").first().text());
    if (!url || !title) return;
    const date = new Date(card.find("time[datetime]").first().attr("datetime") ?? "");
    if (Number.isNaN(date.getTime())) throw new Error(`Cursor Research: missing date for ${url}`);
    articles.set(url, { title, url, publishedAt: date.toISOString() });
  });
  if (!articles.size) throw new Error("Cursor Research: no articles found");
  return [...articles.values()];
}

export function cursorCanonical(html: string, expectedUrl: string): string {
  const $ = load(html);
  const canonical = articleUrl($('link[rel="canonical"]').attr("href"));
  if (!canonical) throw new Error(`Cursor Research: invalid canonical for ${expectedUrl}`);
  return canonical;
}

export const cursorResearch: Source = {
  id: "cursor-research",
  title: "Cursor Research",
  url: home,
  description: "Research articles from Cursor's official Research topic.",
  async discover(): Promise<Article[]> {
    const articles = parseCursorResearch(await fetchHtml(home));
    for (let offset = 0; offset < articles.length; offset += 4) {
      await Promise.all(articles.slice(offset, offset + 4).map(async (article) => {
        const html = await fetchHtml(article.url);
        article.url = cursorCanonical(html, article.url);
        const $ = load(html);
        article.description = clean($('meta[name="description"]').attr("content") ?? "") || undefined;
      }));
    }
    return [...new Map(articles.map((article) => [article.url, article])).values()];
  },
};
