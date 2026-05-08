#!/usr/bin/env node
/**
 * Fetch latest binge eating disorder research papers from PubMed E-utilities API.
 * Targets BED-relevant journals and uses toolkit-derived search queries.
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const PUBMED_SEARCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const PUBMED_FETCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
const HEADERS = { 'User-Agent': 'BingeEatingResearchBot/1.0 (research aggregator)' };

const JOURNALS = [
  'International Journal of Eating Disorders',
  'Journal of Eating Disorders',
  'Eating Behaviors',
  'Appetite',
  'European Eating Disorders Review',
  'Eating and Weight Disorders',
  'Body Image',
  'JAMA Psychiatry',
  'American Journal of Psychiatry',
  'Psychological Medicine',
  'Journal of Affective Disorders',
  'BMC Psychiatry',
  'Biological Psychiatry',
  'Neuropsychopharmacology',
  'Obesity',
  'Obesity Reviews',
  'International Journal of Obesity',
  'Nutrients',
  'Diabetes Care',
  'Diabetes Obesity and Metabolism',
  'Surgery for Obesity and Related Diseases',
  'BMC Public Health',
  'Journal of Adolescent Health',
  'Psychology of Sport and Exercise',
  'Mental Health and Physical Activity',
  'Frontiers in Psychiatry',
  'Addictive Behaviors',
  'Journal of Behavioral Addictions',
  'Behaviour Research and Therapy',
  'Behavioural and Cognitive Psychotherapy',
];

const SEARCH_QUERIES = [
  '("Binge-Eating Disorder"[Mesh] OR "binge eating disorder"[tiab] OR "binge-eating disorder"[tiab] OR "binge eating"[tiab] OR "loss of control eating"[tiab] OR "LOC eating"[tiab])',
  '("binge eating disorder"[tiab] OR "binge eating"[tiab]) AND (treatment[tiab] OR CBT[tiab] OR "CBT-E"[tiab] OR DBT[tiab] OR ACT[tiab] OR IPT[tiab] OR psychotherapy[tiab])',
  '("binge eating disorder"[tiab] OR "binge eating"[tiab]) AND (lisdexamfetamine[tiab] OR topiramate[tiab] OR semaglutide[tiab] OR tirzepatide[tiab] OR GLP-1[tiab] OR SSRI[tiab])',
  '("binge eating disorder"[tiab] OR "binge eating"[tiab]) AND (reward[tiab] OR dopamine[tiab] OR fMRI[tiab] OR neuroimaging[tiab] OR "cue reactivity"[tiab])',
  '("binge eating disorder"[tiab] OR "binge eating"[tiab]) AND ("emotion dysregulation"[tiab] OR shame[tiab] OR trauma[tiab] OR depression[tiab] OR "negative affect"[tiab])',
  '("binge eating disorder"[tiab] OR "binge eating"[tiab] OR "loss of control eating"[tiab]) AND (obesity[tiab] OR "bariatric surgery"[tiab] OR "weight regain"[tiab] OR "metabolic syndrome"[tiab])',
  '("binge eating disorder"[tiab] OR "binge eating"[tiab]) AND (nutrition[tiab] OR dietitian[tiab] OR "mindful eating"[tiab] OR "intuitive eating"[tiab] OR "diet quality"[tiab])',
  '("binge eating disorder"[tiab] OR "binge eating"[tiab] OR "disordered eating"[tiab]) AND ("weight stigma"[tiab] OR "social media"[tiab] OR "body dissatisfaction"[tiab] OR "food insecurity"[tiab])',
  '("binge eating disorder"[tiab] OR "binge eating"[tiab] OR "disordered eating"[tiab]) AND (exercise[tiab] OR "physical activity"[tiab] OR athlete*[tiab] OR "compulsive exercise"[tiab])',
  '("binge eating disorder"[tiab] OR "binge eating"[tiab]) AND ("food addiction"[tiab] OR "addictive-like eating"[tiab] OR "food craving"[tiab])',
  '("binge eating disorder"[tiab] OR "binge eating"[tiab]) AND ("systematic review"[pt] OR "meta-analysis"[pt] OR randomized[tiab])',
];

function getDateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0].replace(/-/g, '/');
}

function buildJournalQuery(maxJournals = 15) {
  return JOURNALS.slice(0, maxJournals)
    .map(j => `"${j}"[Journal]`)
    .join(' OR ');
}

function getDateFilter(days = 7) {
  const lookback = getDateNDaysAgo(days);
  return `"${lookback}"[Date - Publication] : "3000"[Date - Publication]`;
}

async function searchPapers(query, retmax = 20) {
  const params = new URLSearchParams({
    db: 'pubmed',
    term: query,
    retmax: String(retmax),
    sort: 'date',
    retmode: 'json',
  });
  const url = `${PUBMED_SEARCH}?${params}`;
  try {
    const resp = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return data?.esearchresult?.idlist || [];
  } catch (e) {
    console.error(`[ERROR] PubMed search failed: ${e.message}`);
    return [];
  }
}

function parseXmlPapers(xml) {
  const papers = [];
  const articleRegex = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g;
  let articleMatch;
  while ((articleMatch = articleRegex.exec(xml)) !== null) {
    const block = articleMatch[1];

    const titleMatch = block.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/);
    let title = '';
    if (titleMatch) {
      title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    const abstractParts = [];
    const abstractRegex = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g;
    let absMatch;
    while ((absMatch = abstractRegex.exec(block)) !== null) {
      const labelMatch = absMatch[0].match(/Label="([^"]*)"/);
      const label = labelMatch ? labelMatch[1] : '';
      const text = absMatch[1].replace(/<[^>]+>/g, '').trim();
      if (text) {
        abstractParts.push(label ? `${label}: ${text}` : text);
      }
    }
    const abstract = abstractParts.join(' ').slice(0, 2000);

    const journalMatch = block.match(/<Title>([\s\S]*?)<\/Title>/);
    const journal = journalMatch ? journalMatch[1].trim() : '';

    let dateStr = '';
    const yearMatch = block.match(/<Year>(\d+)<\/Year>/);
    const monthMatch = block.match(/<Month>([^<]+)<\/Month>/);
    const dayMatch = block.match(/<Day>(\d+)<\/Day>/);
    if (yearMatch) {
      dateStr = yearMatch[1];
      if (monthMatch) dateStr += ` ${monthMatch[1]}`;
      if (dayMatch) dateStr += ` ${dayMatch[1]}`;
    }

    const pmidMatch = block.match(/<PMID[^>]*>(\d+)<\/PMID>/);
    const pmid = pmidMatch ? pmidMatch[1] : '';
    const url = pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : '';

    const keywords = [];
    const kwRegex = /<Keyword>([^<]+)<\/Keyword>/g;
    let kwMatch;
    while ((kwMatch = kwRegex.exec(block)) !== null) {
      keywords.push(kwMatch[1].trim());
    }

    if (title) {
      papers.push({ pmid, title, journal, date: dateStr, abstract, url, keywords });
    }
  }
  return papers;
}

async function fetchDetails(pmids) {
  if (!pmids.length) return [];
  const params = new URLSearchParams({
    db: 'pubmed',
    id: pmids.join(','),
    retmode: 'xml',
  });
  const url = `${PUBMED_FETCH}?${params}`;
  try {
    const resp = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(60000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const xml = await resp.text();
    return parseXmlPapers(xml);
  } catch (e) {
    console.error(`[ERROR] PubMed fetch failed: ${e.message}`);
    return [];
  }
}

function loadSummarizedPmids() {
  const path = resolve(rootDir, 'data', 'summarized_pmids.json');
  if (existsSync(path)) {
    try {
      return new Set(JSON.parse(readFileSync(path, 'utf-8')));
    } catch {
      return new Set();
    }
  }
  return new Set();
}

async function main() {
  const args = process.argv.slice(2);
  let days = 7;
  let maxPapers = 50;
  let outputPath = resolve(rootDir, 'papers.json');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--days' && args[i + 1]) { days = parseInt(args[++i], 10); }
    if (args[i] === '--max-papers' && args[i + 1]) { maxPapers = parseInt(args[++i], 10); }
    if (args[i] === '--output' && args[i + 1]) { outputPath = args[++i]; }
  }

  const summarized = loadSummarizedPmids();
  console.error(`[INFO] Already summarized: ${summarized.size} PMIDs`);
  console.error(`[INFO] Searching PubMed for BED papers from last ${days} days...`);

  const allPmids = new Set();
  const dateFilter = getDateFilter(days);
  const perQuery = Math.max(5, Math.floor(maxPapers / SEARCH_QUERIES.length));

  for (const sq of SEARCH_QUERIES) {
    const query = `(${sq}) AND ${dateFilter}`;
    const pmids = await searchPapers(query, perQuery);
    for (const id of pmids) allPmids.add(id);
    await new Promise(r => setTimeout(r, 400));
  }

  const newPmids = [...allPmids].filter(id => !summarized.has(id));
  console.error(`[INFO] Found ${allPmids.size} total, ${newPmids.length} new (not summarized)`);

  if (!newPmids.length) {
    console.error('[INFO] No new papers found');
    const tz = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });
    const output = { date: tz, count: 0, papers: [] };
    writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
    return;
  }

  const limited = newPmids.slice(0, maxPapers);
  console.error(`[INFO] Fetching details for ${limited.length} papers...`);
  const papers = await fetchDetails(limited);
  console.error(`[INFO] Fetched details for ${papers.length} papers`);

  const tz = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });
  const output = { date: tz, count: papers.length, papers };
  writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.error(`[INFO] Saved to ${outputPath}`);
}

main().catch(e => {
  console.error(`[FATAL] ${e.message}`);
  process.exit(1);
});
