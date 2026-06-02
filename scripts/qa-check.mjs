#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const ignored = new Set(['node_modules', '.git', '.vercel']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (ignored.has(name)) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const files = walk(root).filter(file => /\.(js|html|css|json|rules)$/.test(file));
const risky = [
  'innerHTML',
  'insertAdjacentHTML',
  'outerHTML',
  'document.write',
  'eval(',
  'new Function',
  'onclick=',
  'onerror=',
  'oninput=',
  'onchange=',
  'onload=',
];

let failed = false;
for (const token of risky) {
  const hits = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    if (text.includes(token)) hits.push(relative(root, file));
  }
  if (hits.length) {
    failed = true;
    console.error(`Risk token "${token}" found in: ${hits.join(', ')}`);
  }
}


const inlineEventsPattern = /\son[a-z]+\s*=\s*["']/i;
const eventHits = [];
for (const file of files.filter(file => /\.html$/.test(file))) {
  const text = readFileSync(file, 'utf8');
  if (inlineEventsPattern.test(text)) eventHits.push(relative(root, file));
}
if (eventHits.length) {
  failed = true;
  console.error(`Inline event handler found in: ${eventHits.join(', ')}`);
}

if (failed) process.exit(1);
console.log('QA check passed: no unsafe render/event tokens found.');
