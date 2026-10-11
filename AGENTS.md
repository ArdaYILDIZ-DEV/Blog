# AGENTS.md

## Project and entry points

A static Turkish/English Markdown blog with folder-based categories, browser-side search, and light/dark themes; no backend or database. Uses npm, ESM, Astro 7.3.8, and strict TypeScript (6.0.3 in `package-lock.json`). Requires Node.js >=22.12 and npm >=9.6.5; CI uses Node.js 24.

- `content/tr/` and `content/en/`: posts and adjacent images; `notes/` is a category, not a separate collection.
- `src/content.config.ts`: the single `posts` collection and metadata schema; `src/lib/frontmatter.ts` preserves source dates for validation.
- `src/lib/model.ts`: publication filtering, categories, tags, route collisions, and translation lookup. `src/lib/content.ts` provides the shared model to pages and feeds.
- `src/pages/[lang]/[...path].astro`: article/category/tag/search rendering. Other files in `src/pages/` generate language home pages, RSS, search indexes, sitemap, robots, and 404.
- `src/layouts/Base.astro` and `src/components/`: shared shell and reusable markup. `src/scripts/client.ts`: browser interactions. `src/styles/global.css`: shared styles and theme tokens.
- `tests/`: model/preferences checks, discovery builds, generated-output checks, and Playwright browser tests. `README.md` documents setup; `.github/workflows/deploy.yml` validates and publishes GitHub Pages.

## Writing notes and content

### Files, metadata, and translations

Write `.md` files under `content/tr/` or `content/en/`. Prefer the existing lowercase, hyphen-separated filenames (`pi-kullanimim.md`, `pi-usage.md`); this is a convention, not a schema restriction. Subdirectories become categories. Paths are normalized by `slugify` in `src/lib/urls.ts` (case folding, diacritic removal, Turkish `ı` to `i`) and produce trailing-slash URLs. Renaming or moving a post changes its URL. Avoid normalized collisions between posts, categories, or tag labels, and first-level names reserved for `tags`, `search`, `rss.xml`, and `search-index.json`.

Posts describing an Obsidian vault document that separate system, not this blog's folder or metadata rules. Blog frontmatter, when present, uses a YAML mapping between `---` delimiters, not TOML. All fields are optional; unknown fields are rejected. The allowed fields are:

| Field | Accepted value and effect |
| --- | --- |
| `title` | Nonempty string; otherwise derived from the filename. The template supplies the article H1. |
| `description` | Nonempty string; shown in the article header and previews. When omitted, a body excerpt supplies previews/metadata only. |
| `date`, `updated` | Valid ISO date (`YYYY-MM-DD`) or timestamp with timezone. Only posts with `date` enter RSS; undated posts still appear on the site and in search. |
| `tags` | Array of nonempty strings. Tags are language-specific; reuse exact labels within a language to avoid slug collisions. |
| `translationKey` | Nonempty string shared by translations; unique within each language, including drafts. |
| `draft` | Boolean. Omitted or `false` makes the post publishable in the next build. `true` excludes it from pages, search, RSS, and sitemap, not from the repository. |
| `cover` | Local image path relative to the post, resolved by Astro's image schema. |

Translations pair by `translationKey`, not filenames or category paths. Single-language notes are supported; a missing published translation leads to the other language's home page with a notice. Preserve meaning across an existing pair, but use natural syntax in each language. Do not invent dates or author experiences to fill optional metadata or prose.

Illustrative pair (not existing files):

`content/tr/notes/ornek-not.md`

```markdown
---
title: Kod okuma notları
tags: [Notlar]
translationKey: example-reading-note
---

Küçük bir akışla başlayın.

## Tek bir soru sorun

Çağıranı, işlevi ve testini birlikte okuyun.
```

`content/en/notes/example-note.md`

```markdown
---
title: Notes on reading code
tags: [Notes]
translationKey: example-reading-note
---

Start with a small path through the program.

## Ask one question

Read the caller, the function, and its test together.
```

### Body, links, and images

Use short paragraphs and concrete section headings, as in the existing notes; use first person for the author's stated preferences rather than adding unsupported personal history. Ordinary notes use `##` sections and `###` subsections without repeating the title as a body H1. The table of contents includes only H2/H3; `markdown-test.md` deliberately exercises H1–H6.

`content/tr/notes/markdown-test.md` is the formatting reference and browser-test fixture: standard Markdown/GFM, emphasis/strikethrough, inline and fenced/indented code, nested/task lists, blockquotes, rules, aligned tables, reference/autolinks, hard breaks, images, and footnotes. Fenced blocks may carry a language label (e.g. `typescript`, `css`, `json`, `bash`) for highlighting and copy controls. Raw HTML examples include `details`/`summary`, `dl`, `kbd`, `mark`, `sub`, and `sup`; treat it as trusted authored content. Obsidian wikilinks/embeds, custom callouts, Mermaid, and LaTeX math have no configured support; use supported Markdown or ask before adding a processor.

Prefer keeping images beside the post, following the existing layout. Use descriptive alt text: `![Not çizimi](./markdown-ornek.svg)` / `![Note illustration](./markdown-ornek.svg)`. Each local image reference must resolve to an existing file; adjacency is not a framework requirement. Missing local images stop the build. Internal links target generated routes, not source `.md` files: `[Notlar](/tr/notes/)` / `[Notes](/en/notes/)`; section links use `#heading-slug`. The Markdown plugin adds `BASE_PATH` to root-relative links; do not hardcode `/Blog`. External links use absolute URLs.

Content edits are complete when frontmatter matches the schema, referenced assets and internal links resolve, and existing translation pairs preserve meaning and keys. Report any part left unverified.

## Writing code

- Use `.astro` for layouts/components/pages and `.ts` for shared logic, client code, and endpoints; no React/Vue runtime is configured. Existing TS uses named exports, camelCase values/functions, PascalCase types, and typed `Props` interfaces in Astro components. Keep local formatting (typically two spaces, single-quoted TS strings, semicolons); no formatter or lint configuration is present.
- Keep publication/route logic in the shared model rather than reimplementing it in templates or feeds. Follow the discriminated route types in `src/pages/[lang]/[...path].astro` and `APIRoute`/`GetStaticPaths` types in endpoints.
- Use `withBase` for internal URLs and `absoluteUrl` for canonical/feed/sitemap URLs. Both root deployment and repository deployment (`/Blog`) are supported; concatenating hardcoded prefixes breaks one of them.
- Shared UI strings belong in `src/lib/i18n.ts`; add matching `tr` and `en` dictionary keys. The templates also contain small inline bilingual labels. Content translation keys and UI dictionaries are separate mechanisms.
- Browser enhancements use native DOM APIs and `data-*` hooks in `src/scripts/client.ts`. Initialize page-specific behavior on `astro:page-load`, account for `astro:before-swap`, and avoid duplicate controls/listeners across `ClientRouter` navigation. Preserve existing no-JavaScript reading/navigation fallbacks; search requires JavaScript.
- Extend shared CSS tokens and kebab-case classes in `src/styles/global.css` for theme-aware styling. Fonts are local `@fontsource` imports in `Base.astro` (Newsreader, Instrument Sans, Commit Mono). Markdown uses `@astrojs/markdown-satteri` with custom HAST handling; Shiki themes are configured separately in `astro.config.mjs`. RSS uses `@astrojs/rss`, YAML handling uses `yaml`, and schema validation uses Astro's Zod export.
- For behavior changes, add a regression in the relevant existing test suite. Rendering changes should preserve `markdown-test.md` coverage, contained table/code scrolling, light/dark themes, keyboard controls, and reduced-motion behavior covered by `tests/browser.spec.ts`.
- Code changes are complete when checks covering the changed behavior pass. Use the applicable commands below: discovery tests for content loading, output tests for generated pages/feeds, and browser tests for interactions. Model tests alone do not verify rendering or browser behavior. Report failed or unrun checks as limitations.

## Commands

Run from the repository root. These are documented commands, not permission to install dependencies, start services, or publish outside the current task.

| Purpose | Command | Relevant effect/prerequisite |
| --- | --- | --- |
| Install locked dependencies | `npm ci` | May require registry access; replaces `node_modules/`. |
| Local development | `npm run dev` | Starts Astro, normally on port 4321. |
| Type/template checks | `npm run check` | `astro check`; can generate Astro metadata. Not a lint command. |
| Static build | `npm run build` | Generates `dist/` and Astro metadata. |
| Preview build | `npm run preview -- --ignore-lock` | Serves the existing build. |
| Model/preferences tests | `npm test` | Node test runner via `tsx`; includes a temporary Astro date-validation build. |
| Discovery/configuration tests | `npm run test:discovery` | Copies a disposable project and dependencies, builds fixtures, briefly starts a loopback server. |
| Generated-output tests | `npm run test:output` | Requires `dist/`; also builds temporary RSS fixtures. |
| Browser tests | `BASE_PATH=/Blog npm run test:browser` | Requires a matching build and available Chromium; starts preview and writes `test-results/`. |

For repository-path checks, build with `BASE_PATH=/Blog npm run build`, then use `BASE_PATH=/Blog npm run test:output` and the browser command above. Keep `SITE_URL` and `BASE_PATH` consistent with the build for output assertions. Playwright defaults to `/Blog`; `PLAYWRIGHT_CHROMIUM_EXECUTABLE` can select an installed compatible browser. There is no configured lint/format command.

Output and browser tests depend on the example posts, including specific routes, text, counts, and undated RSS expectations. When intentionally changing those fixtures, adjust the corresponding expectations to the new content rather than treating the sample corpus as a publishing restriction.

## Boundaries and approval

- Generated/dependency directories (`dist/`, `.astro/`, `node_modules/`, `test-results/`, `playwright-report/`) are not editable sources: changes there are overwritten. Edit `content/`, `src/`, or the relevant configuration instead. `package-lock.json` is npm-generated; change dependency declarations in `package.json` and regenerate the lock through npm when authorized.
- Keep secrets, `.env` values, and private personal data out of content and instructions. Draft status is a publication filter, not confidentiality; use `.env.example` only to understand variable names/configuration structure.
- Ask before changing published filenames/category paths or established `translationKey` pairings, removing a language, or altering schema/configuration in ways that change publication behavior. Explain the affected URLs or language links; ordinary in-place prose/code edits do not require that approval. For deployment changes, preserve the split between `SITE_URL` (HTTP(S) origin only) and `BASE_PATH` (deployment path). Pushes to `main` trigger publication through `.github/workflows/deploy.yml`; require explicit authorization before pushing or deploying, not merely permission to edit.
