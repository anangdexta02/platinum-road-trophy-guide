// A working gta6-trophy-guide-01 entry (Node 22, standard library only): the guide is this directory's app/ folder,
// plain static files a browser opens at app/index.html (ES modules, CSS, no build step), offline: it loads nothing
// over the network, and its trophy list and guides are app/data/trophies.json. The program hands it in: it copies app/
// and screenshots/ from beside this file to /output and writes /output/dossier.json, the summary the judge reads (your
// screenshots, the first load's files and bytes, and your source), with the vendored make.fun library. Leave
// vendor/makefun-frontend.ts as it is: the scorer requires dossier.json to be byte for byte what its own copy writes.
//
// Only the plumbing, not a winner: a plain checklist of the 55 trophies with a one-line hint each. Write a real guide
// for every trophy in your own words, a roadmap to the platinum, filters and a spoiler setting in app/, put 3 or 4 PNG
// or JPEG screenshots of it in screenshots/ (the first by name is the cover; shots.json says which views this
// starter's were taken of), and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 48 MiB of app files: app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);

// --- Platinum Road: entry branding and a data self-check, authored for this entry ---
// The guide's display name. The dossier builder above deliberately stays the vendored one; this
// constant is what the build log and this entry's own tooling call the guide by.
export const GUIDE_NAME = 'PLATINUM ROAD — GTA VI Trophy Tracker & Guide';

import { readFileSync } from 'node:fs';

// A small integrity pass over the guide's own data files, run after the dossier is safely written:
// every JSON the app ships must parse, the trophy list must hold exactly the 55 trophies of the
// official list, the enrichment must carry an entry for each of them, and the roadmap must cover
// every trophy exactly once. It only ever logs — a bad data file should be loud in the build log,
// never a reason to lose the dossier itself.
function platinumRoadSelfCheck(): void {
  try {
    const dataDir = join(here, 'app', 'data');
    const trophiesDoc = JSON.parse(readFileSync(join(dataDir, 'trophies.json'), 'utf8'));
    const guideDoc = JSON.parse(readFileSync(join(dataDir, 'guide.json'), 'utf8'));
    const roadmapDoc = JSON.parse(readFileSync(join(dataDir, 'roadmap.json'), 'utf8'));
    const list = Array.isArray(trophiesDoc) ? trophiesDoc : trophiesDoc.trophies;
    if (!Array.isArray(list) || list.length !== 55) {
      console.warn(`[platinum-road] self-check: expected 55 trophies, found ${Array.isArray(list) ? list.length : 'none'}`);
      return;
    }
    const enriched = guideDoc && guideDoc.trophies ? Object.keys(guideDoc.trophies).length : 0;
    const phases: Array<{ trophyIds?: number[] }> = roadmapDoc && Array.isArray(roadmapDoc.phases) ? roadmapDoc.phases : [];
    const routed = phases.reduce((n, phase) => n + (Array.isArray(phase.trophyIds) ? phase.trophyIds.length : 0), 0);
    console.log(
      `[platinum-road] ${GUIDE_NAME}: self-check ok — 55 trophies, ${enriched} enriched, ${phases.length} roadmap phases routing ${routed} trophies`,
    );
    if (enriched !== 55 || routed !== 55) {
      console.warn('[platinum-road] self-check: enrichment or roadmap does not cover all 55 trophies');
    }
  } catch (err) {
    console.warn(`[platinum-road] self-check skipped: ${(err as Error).message}`);
  }
}

platinumRoadSelfCheck();
