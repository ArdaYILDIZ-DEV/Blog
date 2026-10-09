# Arda's Blog

A static Markdown blog built with Astro, with Turkish and English content, folder-based categories, full-text search, and light/dark themes. No backend or database.

## Quick start

Requires Node.js **22.12+** and npm **9.6.5+**. From the project directory:

```sh
npm ci
npm run dev
```

Open `http://localhost:4321/`, or visit `/tr/` or `/en/` directly.

## Content

Create `content/tr/` or `content/en/` and add `.md` files. Nested folders become categories: `content/en/notes/first-post.md` produces `/en/notes/first-post/`.

```yaml
---
title: First note
description: A short introduction.
date: '2026-10-09'
tags: [Notes]
translationKey: first-note
draft: false
---
```

All fields are optional. Titles and descriptions fall back to the filename and body. Use the same `translationKey` for matching language versions. `updated` accepts an ISO date; `cover` accepts a local image path relative to the post.

- `draft: true` excludes a post from the site, search, RSS, and sitemap—not from the source repository. Do not put private information in drafts.
- Only dated posts appear in RSS. Invalid metadata and conflicting URLs stop the build.
- Keep images beside the post and use generated site paths for internal links, such as `/en/notes/`. Treat Markdown as trusted source content, not untrusted user uploads.

Search runs in the browser and requires JavaScript. Fonts are served locally; design tokens live in `src/styles/global.css`.

## Build and deployment

```sh
npm run build
npm run preview -- --ignore-lock
```

The static output is written to `dist/`.

Configuration is shown in [.env.example](.env.example). Set these environment variables when building:

- `SITE_URL`: the site's origin, without a repository path. Defaults to `http://localhost:4321`.
- `BASE_PATH`: `/` for a root site, or `/Blog` for a repository site. Defaults to `/`.

The [GitHub Pages workflow](.github/workflows/deploy.yml) deploys `main` after checks pass. Select **Settings → Pages → Source → GitHub Actions** first. It uses Pages metadata unless repository variables override `SITE_URL` and `BASE_PATH`.

## Checks

```sh
npm run check
npm test
npm run test:discovery
BASE_PATH=/Blog npm run build
BASE_PATH=/Blog npm run test:output
BASE_PATH=/Blog npm run test:browser
```

Build and output checks must use the same `SITE_URL` and `BASE_PATH`. Browser tests require Chromium: use `npx playwright install chromium` or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to a compatible installed binary.

The current output and browser tests depend on the local example content; they are not yet adapted for a repository without those posts.
