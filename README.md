# HN Reader

A minimalist, mobile-first reader for [Hacker News](https://news.ycombinator.com/). It preserves the official feed order while making long stories and deeply nested discussions comfortable to read on phones.

Live app: [hn-reader.jan-rysavy.chatgpt.site](https://hn-reader.jan-rysavy.chatgpt.site)

## Features

- Official Top, New, and Ask HN ordering
- Full-width, reflowing comment text with compact depth indicators
- One-tap collapse for complete comment branches
- Smooth reading-size controls from 15 px to 26 px
- Light and dark themes that follow the system by default
- Direct links to the original Hacker News feed, discussion, and article
- Installable PWA for iOS, iPadOS, Android, macOS, Windows, and Linux
- Offline shell and bounded runtime caching for previously viewed data
- No account, analytics, cookies, or server-side data storage

## Data sources

HN Reader reads feed IDs from the official [Hacker News Firebase API](https://github.com/HackerNews/API) so stories stay in the same order as Hacker News. It uses the public [Algolia HN Search API](https://hn.algolia.com/api) to load story details and comment trees.

All requests happen in the browser. Display preferences and a small PWA cache remain on the device.

## Development

Requirements:

- Node.js 22.13 or newer
- pnpm 11.25 or newer

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Run the complete local verification suite with:

```bash
pnpm check
```

This runs ESLint, TypeScript, PWA asset validation, and a production build.

## PWA installation

- **iPhone or iPad:** open the site in Safari, tap Share, then **Add to Home Screen**.
- **Android:** open the site in Chrome and choose **Install app** or **Add to Home screen**.
- **Desktop:** use the install action in a supported Chromium browser. Safari can add the site to the Dock on supported macOS versions.

The first visit requires a network connection. Previously opened app resources and Hacker News responses can remain available when the network is unavailable.

## Deployment

The project is a standard Next.js application and can run on any platform that supports Next.js 16 and Node.js 22. The service worker is served from `/sw.js`; deployments should not apply long-lived immutable caching to that path.

## Project scope

This is an unofficial Hacker News client. It is not affiliated with or endorsed by Y Combinator. Hacker News availability and API behavior are outside this project's control.
