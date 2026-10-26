import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
const html = await readFile('dist/index.html', 'utf8');
const papers = JSON.parse(await readFile('dist/research.json', 'utf8'));
const profile = JSON.parse(await readFile('dist/profile.json', 'utf8'));
assert.equal(papers.length, 43, 'Preserve all 39 original papers and add four new entries');
assert.equal(papers.filter(p => p.year === 2026).length, 5, 'All five requested 2026 entries');
assert.equal(new Set(papers.map(p => p.id)).size, papers.length, 'Stable unique publication anchors');
assert(!html.includes('@@'), 'All build placeholders resolved');
assert.equal((html.match(/<h1\b/g) || []).length, 1, 'One descriptive main heading');
assert(html.includes('I lead distributed systems research at Mysten Labs / Sui'), 'Visible leadership statement');
assert.equal(profile.role, 'Distributed Systems Research Lead');
const graph = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
assert.equal(graph['@graph'].filter(x=>x['@type']==='ScholarlyArticle').length, papers.length);
assert.equal(graph['@graph'].find(x=>x['@type']==='Person').jobTitle, profile.role);
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(ids).size, ids.length, 'No duplicate HTML IDs');
for(const [,href] of html.matchAll(/\bhref="([^"]+)"/g)) {
  if(href.startsWith('#')) assert(ids.includes(href.slice(1)), `Anchor target exists: ${href}`);
  else if(!/^(https?:|mailto:)/.test(href)) await access('dist/'+href);
}
for(const [,src] of html.matchAll(/\bsrc="([^"]+)"/g)) if(!src.startsWith('https:')) await access('dist/'+src);
for(const paper of papers) {
  assert(paper.title && paper.authors && paper.year && paper.venue, `Complete bibliographic record: ${paper.id}`);
  new URL(paper.url || paper.venueUrl);
}
assert.equal(papers.find(p=>p.id==='thunderbolt').recognition, 'Best Paper Runner-Up');
assert(papers.find(p=>p.id==='sunfish').presentation, 'SBC entry identified as presentation');
assert.equal(papers.find(p=>p.title.startsWith('Narwhal')).url,'https://arxiv.org/abs/2105.11827','Correct Narwhal link');
assert(html.includes('CHAINIAC paper') && html.includes('Key & binary transparency'), 'Key and binary transparency grouped together');
assert(html.includes('<h3>Consensus</h3>') && html.includes('<h3>Execution</h3>'), 'Consensus and execution remain separate');
assert(html.includes('<h3>Threshold cryptography</h3>') && html.includes('Calypso paper'), 'Threshold cryptography coverage');
const media = JSON.parse(await readFile('dist/media.json','utf8'));
assert(!JSON.stringify(media).includes('MARBLE'), 'Requested talk removed');
assert.equal((html.match(/class="talk-archive-item"/g)||[]).length, media.talks.length + media.additionalTalks.length, 'Every collected talk has a visible link');
assert.equal((html.match(/class="paper-impact"/g)||[]).length, papers.filter(p=>p.impact?.length).length, 'All paper adoption notes rendered');
for (const file of ['robots.txt','sitemap.xml','llms.txt','index.md','media.json']) await access('dist/'+file);
console.log('Passed: publication completeness, 2026 additions, leadership metadata, JSON-LD, internal links, static assets, crawler files.');
