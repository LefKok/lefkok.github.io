import { readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const text = html => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;|&#xA0;/gi, ' ').replace(/\s+/g, ' ').trim();
const metricKeys = [['Citations', 'citations'], ['h-index', 'hIndex'], ['i10-index', 'i10Index']];

export function parseScholar(html, year = new Date().getUTCFullYear()) {
  const table = html.match(/<table\b[^>]*\bid=["']gsc_rsb_st["'][^>]*>([\s\S]*?)<\/table>/i)?.[1];
  if (!table) throw new Error('Scholar statistics table is missing');
  const since = Number(text(table).match(/\bSince\s+(\d{4})\b/)?.[1]);
  if (!Number.isInteger(since) || since < 2000 || since > year) throw new Error('Invalid recent-statistics year');
  const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row =>
    [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell => text(cell[1]))
  );
  const allTime = {};
  const recent = { since };
  for (const [label, key] of metricKeys) {
    const matches = rows.filter(row => row[0] === label);
    if (matches.length !== 1 || matches[0].length !== 3) throw new Error(`Missing or ambiguous ${label}`);
    const values = matches[0].slice(1).map(value => {
      if (!/^\d[\d, ]*$/.test(value)) throw new Error(`Invalid ${label}`);
      const number = Number(value.replace(/[, ]/g, ''));
      if (!Number.isSafeInteger(number)) throw new Error(`Invalid ${label}`);
      return number;
    });
    if (values[1] > values[0]) throw new Error(`Recent ${label} exceeds all-time value`);
    [allTime[key], recent[key]] = values;
  }
  if (!allTime.citations || !allTime.hIndex || !allTime.i10Index) throw new Error('Unexpected empty statistics');
  return { allTime, recent };
}

export async function refreshScholar({
  recordPath = path.join(root, 'content/scholar.json'),
  fetchImpl = fetch,
  now = new Date()
} = {}) {
  const current = JSON.parse(await readFile(recordPath, 'utf8'));
  try {
    const url = new URL(current.sourceUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'scholar.google.com' || url.searchParams.get('user') !== current.profileId) {
      throw new Error('Unexpected Scholar profile URL');
    }
    const response = await fetchImpl(url, {
      headers: { 'User-Agent': 'LefKok-Website/1.0 (+https://lefkok.github.io/)', 'Accept-Language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const metrics = parseScholar(await response.text(), now.getUTCFullYear());
    const updated = { ...current, updatedAt: now.toISOString().slice(0, 10), ...metrics };
    const serialized = JSON.stringify(updated, null, 2) + '\n';
    if (serialized !== await readFile(recordPath, 'utf8')) {
      await writeFile(recordPath + '.tmp', serialized);
      await rename(recordPath + '.tmp', recordPath);
    }
    console.log(`Google Scholar verified ${updated.updatedAt}: ${updated.allTime.citations} citations, h-index ${updated.allTime.hIndex}, i10-index ${updated.allTime.i10Index}.`);
    return { refreshed: true, record: updated };
  } catch (error) {
    console.warn(`Google Scholar refresh skipped: ${error.message}. Keeping figures verified ${current.updatedAt}.`);
    return { refreshed: false, record: current };
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await refreshScholar();
