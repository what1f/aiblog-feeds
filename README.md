# aiblog-feeds

RSS feeds for AI engineering and developer blogs. GitHub Actions refreshes them every six hours. Each item links to the original article and includes its title, publication date, and a short description when the source provides one.

| Source | Original site | Feed |
| --- | --- | --- |
| Anthropic Engineering | [anthropic.com/engineering](https://www.anthropic.com/engineering) | [anthropic-engineering.xml](https://what1f.github.io/aiblog-feeds/feeds/anthropic-engineering.xml) |
| Claude Blog | [claude.com/blog](https://claude.com/blog) | [claude-blog.xml](https://what1f.github.io/aiblog-feeds/feeds/claude-blog.xml) |
| OpenAI Developer Blog | [developers.openai.com/blog](https://developers.openai.com/blog) | [openai-developers.xml](https://what1f.github.io/aiblog-feeds/feeds/openai-developers.xml) |
| All sources | — | [all.xml](https://what1f.github.io/aiblog-feeds/feeds/all.xml) |

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
