import { load } from "cheerio";
import { absoluteUrl, clean, fetchHtml, parseDate } from "../shared.js";
import type { Article, Source } from "../types.js";

const home = "https://claude.com/blog";

export const claudeBlog: Source = {
  id: "claude-blog",
  title: "Claude Blog",
  url: home,
  description: "Articles from the Claude blog.",
  async discover(): Promise<Article[]> {
    return parseClaudeBlog(await fetchHtml(home));
  },
};

export function parseClaudeBlog(html: string): Article[] {
  const $ = load(html);
  const articles: Article[] = [];
  $('.blog_cms_item, a[href^="/resources/articles/"]').each((_, element) => {
    const card = $(element);
    const url = absoluteUrl(card.is("a") ? card.attr("href") : card.find('a.clickable_link[href^="/blog/"]').first().attr("href"), home);
    const title = clean(card.find(".card_blog_title, h2, h3").first().text());
    const dateText = clean(card.find('[class*="__meta"]').first().text()) || clean(card.find('[fs-list-field="date"]').first().text()) ||
      clean(card.find(".card_blog_content .u-text-style-caption").first().text());
    const publishedAt = parseDate(dateText);
    if (url && title && publishedAt) articles.push({ title, url, publishedAt });
  });
  if (!articles.length) throw new Error("Claude Blog: no articles found");
  return articles;
}
