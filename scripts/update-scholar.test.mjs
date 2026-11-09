import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseScholar, parseScholarPaper, refreshScholar } from './update-scholar.mjs';

const table = `<table id="gsc_rsb_st"><thead><tr><th></th><th>All</th><th>Since 2021</th></tr></thead><tbody>
<tr><td><a href="#">Citations</a></td><td>8,758</td><td>7199</td></tr>
<tr><td>h-index</td><td>32</td><td>31</td></tr>
<tr><td>i10-index</td><td>48</td><td>47</td></tr></tbody></table>`;
const paperRow = '<tr class="gsc_a_tr"><td><a class="gsc_a_at">OmniLedger: A Secure, Scale-Out, Decentralized Ledger via Sharding</a></td><td><a class="gsc_a_ac gs_ibl">1,964</a></td><td>2018</td></tr>';

test('matches a paper title and never treats a missing count as zero', () => {
  const title = 'OmniLedger: A Secure, Scale-Out, Decentralized Ledger via Sharding';
  assert.equal(parseScholarPaper(paperRow, title.toLowerCase()), 1964);
  assert.throws(() => parseScholarPaper(paperRow, 'A different paper'));
  assert.throws(() => parseScholarPaper(paperRow + paperRow, title));
  assert.throws(() => parseScholarPaper(paperRow.replace('1,964', ''), title));
});

test('reads labeled metrics and follows a change in the recent-year window', () => {
  assert.deepEqual(parseScholar(table, 2026), {
    allTime: { citations: 8758, hIndex: 32, i10Index: 48 },
    recent: { since: 2021, citations: 7199, hIndex: 31, i10Index: 47 }
  });
  assert.equal(parseScholar(table.replace('Since 2021', 'Since 2022'), 2027).recent.since, 2022);
});

test('rejects challenge pages, partial tables and invalid figures', () => {
  assert.throws(() => parseScholar('<h1>Verify you are human</h1>'));
  assert.throws(() => parseScholar(table.replace('<td>48</td>', '<td>unavailable</td>')));
  assert.throws(() => parseScholar(table.replace('<td>31</td>', '<td>33</td>')));
  assert.throws(() => parseScholar(table.replace('i10-index', 'Other statistic')));
});

test('preserves the last verified file on blocked and malformed responses', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'scholar-test-'));
  const recordPath = path.join(directory, 'scholar.json');
  const original = await readFile(new URL('../content/scholar.json', import.meta.url), 'utf8');
  await writeFile(recordPath, original);
  try {
    for (const response of [new Response('', { status: 429 }), new Response('<html>Sign in</html>')]) {
      const result = await refreshScholar({ recordPath, fetchImpl: async () => response, now: new Date('2027-01-02T06:17:00Z') });
      assert.equal(result.refreshed, false);
      assert.equal(await readFile(recordPath, 'utf8'), original);
    }
    const result = await refreshScholar({ recordPath, fetchImpl: async () => new Response(table + paperRow), now: new Date('2027-01-02T06:17:00Z') });
    assert.equal(result.refreshed, true);
    assert.equal(JSON.parse(await readFile(recordPath, 'utf8')).updatedAt, '2027-01-02');
    assert.equal(result.record.papers[0].citations, 1964);
    assert.equal(result.record.papers[0].updatedAt, '2027-01-02');
    const missing = await refreshScholar({ recordPath, fetchImpl: async () => new Response(table), now: new Date('2027-01-03T06:17:00Z') });
    assert.equal(missing.record.papers[0].updatedAt, '2027-01-02');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
