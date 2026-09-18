import { load } from "cheerio";
import { absoluteUrl, articleMetadata, clean, fetchHtml, parseDate } from "../shared.js";
import type { Article, Source } from "../types.js";

const home = "https://developers.openai.com/blog";

export const openaiDevelopers: Source = {
  id: "openai-developers",
  title: "OpenAI Developer Blog",
  url: home,
  description: "Developer articles from OpenAI.",
  async discover(previous: Article[]): Promise<Article[]> {
    const $ = load(await fetchHtml(home));
    const known = new Map(previous.map((article) => [article.url, article]));
    const articles: Article[] = [];
    $('a.resource-item[href^="/blog/"]').each((_, element) => {
      const card = $(element);
      const url = absoluteUrl(card.attr("href"), home);
      const title = clean(card.find("img[alt]").first().attr("alt") ??
        card.find(".line-clamp-2").first().text());
      const description = clean(card.find("p").first().text());
      if (url && title) articles.push({ title, url, description: description || undefined });
    });
    if (!articles.length) throw new Error("OpenAI Developer Blog: no articles found");

    // Listing cards show month and day, but not year. Read only newly seen article pages.
    const pending = articles.filter((article) => !known.get(article.url)?.publishedAt);
    for (let offset = 0; offset < pending.length; offset += 4) {
      await Promise.all(pending.slice(offset, offset + 4).map(async (article) => {
        const html = await fetchHtml(article.url);
        const detail = load(html);
        const date = detail("span").map((_, element) => clean(detail(element).text())).get()
          .find((value) => /^[A-Za-z]{3,9} \d{1,2}, \d{4}$/.test(value));
        article.publishedAt = date ? parseDate(date) : (await articleMetadata(article.url)).publishedAt;
        if (!article.publishedAt) throw new Error(`OpenAI Developer Blog: missing date for ${article.url}`);
      }));
    }
    return articles;
  },
};
