#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const DATA_PATH = resolve(rootDir, 'data', 'summarized_pmids.json');
const PAPERS_PATH = resolve(rootDir, 'papers.json');

function main() {
  let existing = new Set();
  if (existsSync(DATA_PATH)) {
    try {
      existing = new Set(JSON.parse(readFileSync(DATA_PATH, 'utf-8')));
    } catch { /* empty */ }
  }

  if (!existsSync(PAPERS_PATH)) {
    console.error('[WARN] No papers.json found');
    return;
  }

  const papers = JSON.parse(readFileSync(PAPERS_PATH, 'utf-8'));
  const newPmids = (papers.papers || []).map(p => p.pmid).filter(Boolean);

  for (const id of newPmids) existing.add(id);

  const arr = [...existing].sort();
  writeFileSync(DATA_PATH, JSON.stringify(arr, null, 2), 'utf-8');
  console.error(`[INFO] Updated summarized PMIDs: ${arr.length} total (${newPmids.length} new)`);
}

main();
