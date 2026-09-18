import { load } from "cheerio";

export async function fetchHtml(url: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "aiblog-feeds/0.1 (+https://github.com/what1f/aiblog-feeds)" },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
      return response.text();
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  throw new Error(`Could not fetch ${url}`, { cause: lastError });
}

export function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function absoluteUrl(href: string | undefined, base: string): string | undefined {
  if (!href) return;
  try {
    const url = new URL(href, base);
    if (url.origin !== new URL(base).origin) return;
    url.hash = "";
    url.search = "";
    return url.toString();
  } catch {
    return;
  }
}

const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export function parseDate(value: string): string | undefined {
  const text = clean(value).replace(/^Published\s+/i, "");
  const match = text.match(/\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (!match) return;
  const month = months.indexOf(match[1].slice(0, 3).toLowerCase());
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (month < 0 || day < 1 || day > 31) return;
  const date = new Date(Date.UTC(year, month, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return;
  return date.toISOString();
}

export async function articleMetadata(url: string): Promise<{ publishedAt?: string; description?: string }> {
  const $ = load(await fetchHtml(url));
  const description = clean($('meta[name="description"]').attr("content") ?? "");
  const date = clean($("time[datetime]").first().attr("datetime") ?? "") ||
    clean($('meta[property="article:published_time"]').attr("content") ?? "");
  const parsed = date ? new Date(date) : undefined;
  return {
    publishedAt: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : undefined,
    description: description || undefined,
  };
}
