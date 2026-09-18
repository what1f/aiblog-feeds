# aiblog-feeds

RSS feeds for AI engineering and developer blogs. GitHub Actions refreshes them every six hours. Each item links to the original article and includes its title, publication date, and a short description when the source provides one.

| Source | Feed |
| --- | --- |
| Anthropic Engineering | [anthropic-engineering.xml](https://raw.githubusercontent.com/what1f/aiblog-feeds/main/feeds/anthropic-engineering.xml) |
| Claude Blog | [claude-blog.xml](https://raw.githubusercontent.com/what1f/aiblog-feeds/main/feeds/claude-blog.xml) |
| OpenAI Developer Blog | [openai-developers.xml](https://raw.githubusercontent.com/what1f/aiblog-feeds/main/feeds/openai-developers.xml) |
| All sources | [all.xml](https://raw.githubusercontent.com/what1f/aiblog-feeds/main/feeds/all.xml) |

## Add a source

Create a `Source` adapter in `src/sources/` and export it from `src/sources/index.ts`. The adapter discovers article titles, canonical URLs, dates, and optional descriptions. The generator handles deduplication, retained history, XML output, and the combined feed. If one adapter fails, the run stops before changing any feed.

## Run locally

```sh
pnpm install
pnpm build
pnpm generate
```

Generated XML is in `feeds/`; retained article metadata is in `data/articles.json`. The scheduled workflow also supports manual runs from GitHub Actions.

These are unofficial feeds. Article content stays on the original websites.
