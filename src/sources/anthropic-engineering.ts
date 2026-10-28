import { load } from "cheerio";
import { absoluteUrl, clean, fetchHtml, parseDate } from "../shared.js";
import type { Article, Source } from "../types.js";

const home = "https://www.anthropic.com/engineering";

export const anthropicEngineering: Source = {
  id: "anthropic-engineering",
  title: "Anthropic Engineering",
  url: home,
  description: "Engineering articles from Anthropic.",
  async discover(): Promise<Article[]> {
    return parseAnthropicEngineering(await fetchHtml(home));
  },
};

export async function parseAnthropicEngineering(html: string): Promise<Article[]> {
  const $ = load(html);
  const articles: Article[] = [];
  $("article").each((_, element) => {
    const card = $(element);
    const link = card.find('a[href^="/engineering/"], a[href^="/research/"]').first();
    const url = absoluteUrl(link.attr("href"), home);
    const title = clean(card.find("h2, h3").first().text());
    if (!url || !title) return;
    const publishedAt = parseDate(card.find('time, [class*="__date"]').first().text());
    const description = clean(card.find('[class*="__summary"]').first().text());
    articles.push({ title, url, publishedAt, description: description || undefined });
  });
  if (!articles.length) throw new Error("Anthropic Engineering: no articles found");

  // The featured card omits its date. Its article page has the publication date.
  for (const article of articles.filter((item) => !item.publishedAt)) {
    const detail = load(await fetchHtml(article.url));
    article.publishedAt = parseDate(detail('[class*="HeroEngineering"][class*="__date"]').first().text());
    if (!article.publishedAt) throw new Error(`Anthropic Engineering: missing date for ${article.url}`);
  }
  return articles;
}
