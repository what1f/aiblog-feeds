import { load } from "cheerio";
import { absoluteUrl, articleMetadata, clean, fetchHtml, parseDate } from "../shared.js";
import type { Article, Source } from "../types.js";

const home = "https://claude.dev/";

export const claudeDev: Source = {
  id: "claude-dev",
  title: "claude.dev",
  url: home,
  description: "Technical writing for people building with Claude.",
  async discover(previous: Article[]): Promise<Article[]> {
    const $ = load(await fetchHtml(home));
    const articles: Article[] = [];
    $("a.post[href^='/blog/']").each((_, element) => {
      const card = $(element);
      const url = absoluteUrl(card.attr("href"), home);
      const title = clean(card.find(".p-title").first().text());
      const publishedAt = parseDate(card.find(".p-date").first().text());
      if (url && title) articles.push({ title, url, publishedAt });
    });
    if (!articles.length) throw new Error("claude.dev: no articles found");

    const known = new Map(previous.map((article) => [article.url, article]));
    const pending = articles.filter((article) => {
      const old = known.get(article.url);
      return !old?.publishedAt || !old.description || !article.publishedAt;
    });
    for (let offset = 0; offset < pending.length; offset += 4) {
      await Promise.all(pending.slice(offset, offset + 4).map(async (article) => {
        const metadata = await articleMetadata(article.url);
        article.publishedAt ??= metadata.publishedAt;
        article.description ??= metadata.description;
        if (!article.publishedAt) throw new Error(`claude.dev: missing date for ${article.url}`);
      }));
    }
    return articles;
  },
};
