import { fetchHtml } from "../shared.js";
import type { Source } from "../types.js";
import { parseRssArticles } from "./rss-items.js";

const home = "https://ampcode.com/notes";
const title = "Amp Notes";

export function parseAmpNotes(xml: string) {
  // The Notes and product News feeds are separate. Some Notes live outside /notes/.
  return parseRssArticles(xml, home, /^\/(?:notes\/[^/]+|how-we-build)\/?$/, title);
}

export const ampNotes: Source = {
  id: "amp-notes", title, url: home,
  description: "Technical notes from the Amp team on building and using agents.",
  async discover() { return parseAmpNotes(await fetchHtml(`${home}.rss`)); },
};
