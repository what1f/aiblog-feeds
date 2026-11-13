import type { Article } from "./types.js";

function identity(article: Article, sourceId: string): string {
  if (sourceId === "anthropic-engineering") {
    const url = new URL(article.url);
    // Anthropic moved these articles from /engineering/ to /research/.
    if (url.origin === "https://www.anthropic.com" && /^\/(engineering|research)\/[^/]+\/?$/.test(url.pathname)) {
      return `${url.origin}/${url.pathname.replace(/^\/(engineering|research)\//, "").replace(/\/$/, "")}`;
    }
  }
  return article.url;
}

export function mergeArticles(discovered: Article[], previous: Article[], sourceId: string, maxItems = 100): Article[] {
  const byIdentity = new Map<string, Article>();
  // Prefer the original engineering GUID when migrating already duplicated history.
  // Persisted GUIDs take precedence on subsequent runs, regardless of link changes.
  const history = [...previous].sort((a, b) => {
    const rank = (item: Article) => item.guid ? 0 : item.url.startsWith("https://www.anthropic.com/engineering/") ? 1 : 2;
    return rank(a) - rank(b);
  });
  for (const article of [...history, ...discovered]) {
    const key = identity(article, sourceId);
    const old = byIdentity.get(key);
    const guid = old?.guid ?? old?.url ?? article.guid;
    byIdentity.set(key, {
      ...old,
      ...article,
      ...(guid && guid !== article.url ? { guid } : {}),
      publishedAt: article.publishedAt ?? old?.publishedAt,
      description: article.description ?? old?.description,
    });
  }
  return [...byIdentity.values()]
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "") || a.url.localeCompare(b.url))
    .slice(0, maxItems);
}
