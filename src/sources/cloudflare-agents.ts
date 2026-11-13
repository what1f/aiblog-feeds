import { load } from "cheerio";
import { absoluteUrl, clean, fetchHtml } from "../shared.js";
import type { Article, Source } from "../types.js";

const home = "https://blog.cloudflare.com/tag/agents/";
// Advertised by <link rel="alternate" type="application/rss+xml"> on the tag page.
const feed = "https://blog.cloudflare.com/tag/agents/rss";

export function parseCloudflareAgents(xml: string): Article[] {
  const $ = load(xml, { xml: true });
  const articles = new Map<string, Article>();
  $("rss > channel > item").each((_, element) => {
    const item = $(element);
    if (!item.children("category").toArray().some((category) => clean($(category).text()).toLowerCase() === "agents")) return;
    const url = absoluteUrl(clean(item.children("link").text()), home);
    // English articles have one slug; exclude localized aliases and non-article paths.
    if (!url || !/^\/[^/]+\/?$/.test(new URL(url).pathname)) return;
    const title = clean(item.children("title").text());
    const date = new Date(clean(item.children("pubDate").text()));
    if (!title || Number.isNaN(date.getTime())) throw new Error(`Cloudflare Agents: invalid metadata for ${url}`);
    const canonical = url.replace(/\/?$/, "/");
    const description = clean(load(item.children("description").text()).text());
    articles.set(canonical, { title, url: canonical, publishedAt: date.toISOString(), description: description || undefined });
  });
  if (!articles.size) throw new Error("Cloudflare Agents: no articles found");
  return [...articles.values()];
}

export const cloudflareAgents: Source = {
  id: "cloudflare-agents",
  title: "Cloudflare Agents",
  url: home,
  description: "Articles tagged Agents from the official Cloudflare Blog RSS feed.",
  async discover(): Promise<Article[]> {
    return parseCloudflareAgents(await fetchHtml(feed));
  },
};
