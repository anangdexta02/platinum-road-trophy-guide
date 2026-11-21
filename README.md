# Platinum Road — GTA VI Trophy Tracker & Guide

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/anangdexta02/platinum-road-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/anangdexta02/platinum-road-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

Platinum Road is a browser tracker and guide for the Grand Theft Auto VI platinum: all **55 trophies** (1 platinum, 2 gold, 6 silver, 46 bronze) with a per-trophy guide, a four-phase roadmap, spoiler protection for the 28 hidden trophies, and a warning system for the game's single missable trophy. It is plain static files — no build step, no accounts, nothing loaded over the network — and your progress never leaves your browser.

## Features

- **Checklist for all 55 trophies**, each with its official description and a guide note, a grade stripe and pill (platinum / gold / silver / bronze), and its kind (story, skill, collectible, misc).
- **Progress summary** with an SVG completion ring, trophies earned (x / 55) and trophy points (bronze 15 · silver 30 · gold 90 · platinum 300 — 1,350 in total).
- **Spoiler masking:** the 28 hidden trophies show as “Hidden trophy — click to reveal” until you click one, so the list is safe to browse before finishing the story.
- **Missable warning:** there is exactly one missable trophy — *Positive Mental Attitude* (id 28), because one of its meditation spots is tied to a Chapter 1 invitation at Jason's house and disappears when the chapter ends. A banner stays visible until you earn it.
- **Filters and search:** by grade, by status (all / remaining / earned), a missable-only toggle, and full-text search over names, descriptions and guide text.
- **Roadmap view:** the four-phase route to the platinum — *Story first*, *Grab it during the story*, *The 100% grind*, *Cleanup* — with per-phase progress and checkboxes that stay in sync with the checklist.
- **Your data stays yours:** progress (earned + revealed trophies) persists in `localStorage`, and Export / Import moves it between browsers as a JSON file. Reset clears it after a confirmation.
- **Deep links for sharing views:** `?grade=silver` opens pre-filtered, `?view=roadmap` opens the roadmap, `?scroll=1400` starts scrolled.

## Data sources and verification status

- `app/data/trophies.json` is the official PlayStation trophy list for Grand Theft Auto VI (PS5): **55 of 55 trophies verified** — names, descriptions, grades and the base guide lines.
- `app/data/guide.json` adds researched enrichment keyed by trophy id: the 28 hidden trophies, each trophy's kind, the single missable trophy and the reason it can be lost.
- `app/data/roadmap.json` is the recommended four-phase route, routing every one of the 55 trophies exactly once.
- **Honesty note:** the methods for trophies **44, 45, 49, 50 and 51 are unconfirmed in every source checked**. Platinum Road flags them “Method unconfirmed” and prints only what their own descriptions support, instead of inventing steps.

## Run it locally

Requires Node 22 (standard library only, nothing to install):

```sh
node --experimental-strip-types serve.ts
```

Then open <http://localhost:8080>. (`serve.ts` serves `app/` on port 8080; pass `--port <n>` for another port.) You can also open `app/index.html` through any static file server.

To produce the hand-in dossier the same way the grader does:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node --experimental-strip-types main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory, writes `dossier.json`, and logs a small self-check confirming the data files parse, the list holds 55 trophies, and the roadmap routes all 55.

## Layout

- `app/index.html`, `app/style.css`, `app/app.js` — the tracker (dark “Vice” theme, no build step).
- `app/data/` — `trophies.json` (official list), `guide.json` (enrichment), `roadmap.json` (the route).
- `screenshots/` — the three views named in `shots.json` (checklist, silver filter, bronze list scrolled).
- `main.ts` / `serve.ts` / `vendor/` — the make.fun hand-in plumbing and local dev server.
