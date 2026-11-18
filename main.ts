// Sunfall City — the handoff program (Node 22, standard library only).
//
// What it does, in order:
//   1. Works out where the entry lives (beside this file) and where the
//      output goes (MAKEFUN_OUTPUT_DIR, or /output in the grader).
//   2. Copies the whole game/ tree and the screenshots/ tree there.
//   3. Asks the vendored make.fun library to summarise both trees into
//      dossier.json, the document the judge reads.
//
// It makes no network calls, finishes in well under ten seconds, and is
// deterministic: the same repository always produces the same bytes,
// because it only copies files and summarises them.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(name) {
  const from = join(repoRoot, name);
  const to = join(outputDir, name);
  if (!existsSync(from)) return;
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
}

function main() {
  mkdirSync(outputDir, { recursive: true });
  copyTree('game');
  copyTree('screenshots');

  // Caps matching the scorer's gate: the text budget shapes the dossier
  // bytes, the rest refuse anything the scorer would refuse.
  const dossier = buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
}

main();
