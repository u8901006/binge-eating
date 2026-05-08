#!/usr/bin/env node
/**
 * Generate index.html listing all BED daily reports.
 * Reads existing reports from docs/ folder.
 */

import { readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsDir = resolve(__dirname, '..', 'docs');

if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true });
const files = readdirSync(docsDir)
  .filter(f => f.startsWith('bed-') && f.endsWith('.html'))
  .sort()
  .reverse();

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
let links = '';
let count = 0;

for (const f of files.slice(0, 60)) {
  const dateStr = f.replace('bed-', '').replace('.html', '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;
  count++;
  const d = new Date(dateStr);
  const dateDisplay = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  const wd = WEEKDAYS[d.getDay()];
  links += `<li><a href="${f}">📅 ${dateDisplay}（週${wd}）</a></li>\n`;
}

const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Binge Eating Research &middot; 暴食症文獻日報</title>
<meta name="description" content="暴食症（BED）研究文獻日報，每日自動從 PubMed 彙整最新論文"/>
<style>
  :root { --bg: #f6f1e8; --surface: #fffaf2; --line: #d8c5ab; --text: #2b2118; --muted: #766453; --accent: #8c4f2b; --accent-soft: #ead2bf; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: radial-gradient(circle at top, #fff6ea 0, var(--bg) 55%, #ead8c6 100%); color: var(--text); font-family: "Noto Sans TC", "PingFang TC", "Helvetica Neue", Arial, sans-serif; min-height: 100vh; }
  .container { position: relative; z-index: 1; max-width: 640px; margin: 0 auto; padding: 80px 24px; }
  .logo { font-size: 48px; text-align: center; margin-bottom: 16px; }
  h1 { text-align: center; font-size: 24px; color: var(--text); margin-bottom: 8px; }
  .subtitle { text-align: center; color: var(--accent); font-size: 14px; margin-bottom: 48px; }
  .count { text-align: center; color: var(--muted); font-size: 13px; margin-bottom: 32px; }
  ul { list-style: none; }
  li { margin-bottom: 8px; }
  a { color: var(--text); text-decoration: none; display: block; padding: 14px 20px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; transition: all 0.2s; font-size: 15px; }
  a:hover { background: var(--accent-soft); border-color: var(--accent); transform: translateX(4px); }
  .links-section { margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--line); }
  .link-item { display: block; padding: 10px 16px; margin-bottom: 6px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; text-decoration: none; color: var(--text); font-size: 14px; transition: all 0.2s; }
  .link-item:hover { background: var(--accent-soft); border-color: var(--accent); transform: translateX(4px); }
  footer { margin-top: 56px; text-align: center; font-size: 12px; color: var(--muted); }
  footer a { display: inline; padding: 0; background: none; border: none; color: var(--muted); }
  footer a:hover { color: var(--accent); }
</style>
</head>
<body>
<div class="container">
  <div class="logo">🍽️</div>
  <h1>Binge Eating Research</h1>
  <p class="subtitle">暴食症（BED）文獻日報 &middot; 每日自動更新</p>
  <p class="count">共 ${count} 期日報</p>
  <ul>${links}</ul>
  <div class="links-section">
    <a href="https://www.leepsyclinic.com/" class="link-item" target="_blank">🏥 李政洋身心診所首頁</a>
    <a href="https://blog.leepsyclinic.com/" class="link-item" target="_blank">📬 訂閱電子報</a>
    <a href="https://buymeacoffee.com/CYlee" class="link-item" target="_blank">☕ Buy Me a Coffee</a>
  </div>
  <footer>
    <p>Powered by PubMed + Zhipu AI &middot; <a href="https://github.com/u8901006/binge-eating">GitHub</a></p>
  </footer>
</div>
</body>
</html>`;

writeFileSync(`${docsDir}/index.html`, html, 'utf-8');
console.log(`Index page generated (${count} reports)`);
