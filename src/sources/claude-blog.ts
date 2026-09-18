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
    const $ = load(await fetchHtml(home));
    const articles: Article[] = [];
    $(".blog_cms_item").each((_, element) => {
      const card = $(element);
      const url = absoluteUrl(card.find('a.clickable_link[href^="/blog/"]').first().attr("href"), home);
      const title = clean(card.find(".card_blog_title").first().text());
      const dateText = clean(card.find('[fs-list-field="date"]').first().text()) ||
        clean(card.find(".card_blog_content .u-text-style-caption").first().text());
      const publishedAt = parseDate(dateText);
      if (url && title && publishedAt) articles.push({ title, url, publishedAt });
    });
    if (!articles.length) throw new Error("Claude Blog: no articles found");
    return articles;
  },
};
