import type { Article, Source } from "./types.js";

function xml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
  })[character]!);
}

export function renderRss(
  channel: Pick<Source, "title" | "url" | "description">,
  articles: (Article & { sourceTitle?: string })[],
): string {
  const items = articles.map((article) => [
    "    <item>",
    `      <title>${xml(article.title)}</title>`,
    `      <link>${xml(article.url)}</link>`,
    `      <guid isPermaLink="true">${xml(article.url)}</guid>`,
    ...(article.publishedAt ? [`      <pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>`] : []),
    ...(article.description ? [`      <description>${xml(article.description)}</description>`] : []),
    ...(article.sourceTitle ? [`      <category>${xml(article.sourceTitle)}</category>`] : []),
    "    </item>",
  ].join("\n"));

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    `    <title>${xml(channel.title)}</title>`,
    `    <link>${xml(channel.url)}</link>`,
    `    <description>${xml(channel.description)}</description>`,
    `    <language>en</language>`,
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join("\n");
}
