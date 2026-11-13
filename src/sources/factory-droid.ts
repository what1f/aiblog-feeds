import { load } from "cheerio";
import { clean, fetchHtml } from "../shared.js";
import type { Source } from "../types.js";
import { parseRssArticles, rssArticleUrl } from "./rss-items.js";

const home = "https://factory.com/news?category=research";
const title = "Factory Droid Research";
const path = /^\/news\/[^/]+\/?$/;

export function parseFactoryDroid(html: string, xml: string) {
  const $ = load(html);
  const research = new Set<string>();
  // The Research page still features some Product posts. Read the badge on each
  // card/archive row, then use the official RSS for the article metadata.
  $("article, li").each((_, element) => {
    const card = $(element);
    const href = card.children('a[href^="/news/"]').first().attr("href");
    const url = rssArticleUrl(href, home, path);
    if (!url) return;
    if (card.find("span, p").toArray().some((label) =>
      /^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s+·\s+Research$/i.test(clean($(label).text())))) research.add(url);
  });
  return parseRssArticles(xml, home, path, title, research);
}

export const factoryDroid: Source = {
  id: "factory-droid", title, url: home,
  description: "Research articles from Factory about coding agents, agent harnesses, and evaluation.",
  async discover() {
    const [html, xml] = await Promise.all([fetchHtml(home), fetchHtml("https://factory.com/news/rss")]);
    return parseFactoryDroid(html, xml);
  },
};
