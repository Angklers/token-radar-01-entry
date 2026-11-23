// Token launch radar, entry driver (Node 22, standard library only).
//
// What it does, end to end:
//   1. read the sealed DefiLlama snapshot (a file, or a directory holding snapshot.json),
//   2. score every pre-token protocol with the fitted line in lib/model.ts,
//   3. write the ranked board and the dashboard's data.js to the output directory,
//   4. copy this repo's dashboard/ and screenshots/ into the output,
//   5. write dossier.json last, from the finished output, via the vendored
//      make.fun library -- the scorer rebuilds that dossier and compares bytes,
//      so nothing after this step may touch the output.
//
// The dashboard is static (plain HTML/CSS/JS, no network): it reads data.js,
// which is written from the same board the judge scores. The model, the page
// and the farm plans are ours; the shape of the board and the dossier is the
// gate's, so the driver keeps it exactly.
//
// Outside the grader's container, /output is replaced with MAKEFUN_OUTPUT_DIR:
//   MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  boardIssue,
  buildRadar,
  dataScript,
  parseSnapshot,
} from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

// Where this file lives, so dashboard/ and screenshots/ are found next to it.
const here = fileURLToPath(new URL('.', import.meta.url));

// The scorer's caps, as the gate states them: the text cap shapes the
// dossier's bytes, the rest refuse the entry outright.
const TEXT_MAX_BYTES = 65_536;
const SCREENSHOT_LIMIT = { max: 4, max_bytes: 524_288 };
const DASHBOARD_LIMIT = { max_files: 400, max_bytes: 4_194_304 };
const IMAGE_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

// Read a `--name value` or `--name=value` argument, or fall back.
function flag(name: string, fallback: string): string {
  const argv = process.argv;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === `--${name}` && i + 1 < argv.length) return argv[i + 1]!;
    const prefix = `--${name}=`;
    if (argv[i]!.startsWith(prefix)) return argv[i]!.slice(prefix.length);
  }
  return fallback;
}

function fail(message: string, code: number): never {
  process.stderr.write(`token radar: ${message}\n`);
  process.exit(code);
}

const inputArg = flag('input', '/input');
const inputFile = inputArg.endsWith('.json')
  ? inputArg
  : join(inputArg, 'snapshot.json');
if (!existsSync(inputFile)) {
  fail(
    `no snapshot at ${inputFile}: pass --input <snapshot.json|directory> or mount the sealed /input`,
    2,
  );
}
const out = flag('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const snapshot = parseSnapshot(readFileSync(inputFile, 'utf8'));
const { board, radar } = buildRadar(snapshot);
const issue = boardIssue(board, snapshot);
if (issue !== null) {
  fail(`the model wrote a board the gate refuses: ${issue}`, 1);
}

mkdirSync(out, { recursive: true });
if (!statSync(out).isDirectory()) {
  fail(`${out}: the output path is a file, not a directory`, 2);
}
writeFileSync(join(out, 'board.json'), `${JSON.stringify({ rows: board })}\n`);
writeFileSync(join(out, 'data.js'), dataScript(radar));

// Copy a directory's regular files into `to`, skipping dotfiles, and
// return the names copied, in directory order.
function copyDirectory(from: string, to: string): string[] {
  if (!existsSync(from)) return [];
  mkdirSync(to, { recursive: true });
  const copied: string[] = [];
  for (const name of readdirSync(from)) {
    if (name.startsWith('.')) continue;
    const path = join(from, name);
    if (!statSync(path).isFile()) continue;
    copyFileSync(path, join(to, name));
    copied.push(name);
  }
  return copied;
}

copyDirectory(join(here, 'dashboard'), join(out, 'dashboard'));
const shots = copyDirectory(join(here, 'screenshots'), join(out, 'screenshots'));
if (shots.length < 3) {
  fail(
    `screenshots/ holds ${shots.length} image${shots.length === 1 ? '' : 's'}: hand in 3, the board, a detail view and a filtered view`,
    1,
  );
}
for (const name of shots) {
  if (!IMAGE_NAME.test(name)) {
    fail(
      `screenshots/${name}: a name is letters, digits and . _ -, 1 to 128 characters`,
      1,
    );
  }
}

// Written last, from the finished output: the scorer rebuilds it and
// compares the bytes, so the driver stops here.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: TEXT_MAX_BYTES,
    screenshots: SCREENSHOT_LIMIT,
    dashboard: DASHBOARD_LIMIT,
  }),
);

process.stdout.write(
  `token radar: ${snapshot.protocols.length} protocols, ${snapshot.watchlist.length} on the watchlist, ${board.length} rows scored (${radar.early_size} early, ${radar.live_size} live set aside)\n` +
    `token radar: wrote ${join(out, 'board.json')}, ${join(out, 'data.js')}, ${join(out, 'dashboard')} (3 files), ${join(out, 'screenshots')} (${shots.length} images) and ${join(out, 'dossier.json')}\n`,
);
