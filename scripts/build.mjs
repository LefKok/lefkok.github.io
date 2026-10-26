import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJSON = async name => JSON.parse(await readFile(path.join(root, 'content', name), 'utf8'));
const papers = await readJSON('publications.json');
const media = await readJSON('media.json');
const profile = await readJSON('profile.json');
const awards = await readJSON('awards.json');
const mentorship = await readJSON('mentorship.json');
profile.awards = awards.map(a => `${a.title}, ${a.organization}${a.detail ? ', ' + a.detail : ''}${a.year ? ', ' + a.year : ''}`);
const base = profile.url;
const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const authors = text => esc(text).replace(/(?:Eleftherios|Lefteris) Kokoris-Kogias\*?/g, '<strong>$&</strong>');
const paperHTML = papers.map((p, i) => `<article class="publication" id="paper-${p.id}" data-selected="${Boolean(p.selected)}" data-year="${p.year}">
  <div class="paper-venue ${p.year === 2026 ? 'latest' : ''}">${esc(p.venue)}<span>${p.year}</span></div>
  <div class="paper-main"><h3><a href="${esc(p.url || p.venueUrl)}">${esc(p.title)}</a></h3><p class="paper-authors">${authors(p.authors)}</p>${p.authorNote ? `<p class="paper-author-note">${esc(p.authorNote)}</p>` : ""}${p.recognition ? `<a class="paper-note" href="${esc(p.evidenceUrl || p.url)}">✧ ${esc(p.recognition)}</a>` : ''}${p.presentation ? `<span class="paper-note paper-presentation">Presented at SBC · Research presentation</span>` : ''}${p.impact?.length ? `<div class="paper-impact">${p.impact.map(note=>note.url ? `<a href="${esc(note.url)}">${esc(note.title)}</a>` : `<span>${esc(note.title)}</span>`).join('')}</div>` : ''}</div>
  <a class="paper-arrow" href="${esc(p.url || p.venueUrl)}" aria-label="Read ${esc(p.title)}">↗</a></article>`).join('\n');
const writingHTML = media.writing.map(w => `<a class="writing-item" href="${esc(w.url)}"><span class="writing-year">${esc(w.date.slice(0,4))}</span><h4>${esc(w.title)}</h4><span class="writing-outlet">${esc(w.publisher)}</span><span class="writing-arrow" aria-hidden="true">↗</span></a>`).join('\n');
const allTalks = [...media.talks, ...media.additionalTalks].sort((a,b)=> (b.date || String(b.year || '')).localeCompare(a.date || String(a.year || '')));
const talkGroupDefinitions = new Map((media.talkGroups || []).map(g => [g.id,g]));
const groupedTalks = new Map();
for (const talk of allTalks) {
  const key = talk.groupId || talk.url;
  if (!groupedTalks.has(key)) groupedTalks.set(key,{title:talkGroupDefinitions.get(talk.groupId)?.title || talk.title,appearances:[]});
  groupedTalks.get(key).appearances.push(talk);
}
const talkArchive = [...groupedTalks.values()].map(group => {
  const years = group.appearances.map(t=>String(t.year || t.date?.slice(0,4) || '')).filter(Boolean).sort();
  const period = years[0] === years.at(-1) ? years[0] : `${years[0]}–${years.at(-1)}`;
  return `<article class="talk-group"><div class="talk-group-heading"><span class="mono">${esc(period)}</span><h4>${esc(group.title)}</h4>${group.appearances.length>1 ? `<span class="talk-versions">${group.appearances.length} appearances</span>` : ''}</div><div class="talk-appearances">${group.appearances.map(t=>`<a class="talk-archive-item" href="${esc(t.url)}" aria-label="${esc(t.title)}, ${esc(t.host)}, ${t.year || t.date?.slice(0,4) || ''}"><span class="talk-year">${t.year || t.date?.slice(0,4) || ''}</span><span class="talk-host">${esc(t.host)}</span><span class="talk-kind">${t.format==='Interview' ? 'Interview' : t.youtubeId || /youtu\.be|youtube\.com/.test(t.url) ? 'Recording' : 'Event page'}</span><span aria-hidden="true">↗</span></a>`).join('')}</div></article>`;
}).join('\n');
const personId = `${base}#person`;
const person = { '@type': 'Person', '@id': personId, name: profile.name, alternateName: profile.alternateName, url: base, image: `${base}assets/lefteris.jpg`, jobTitle: profile.role, description: profile.description, worksFor: { '@type': 'Organization', name: 'Mysten Labs', url: 'https://www.mystenlabs.com/' }, affiliation: { '@type': 'Organization', name: 'Sui', url: 'https://sui.io/' }, alumniOf: profile.education.map(name => ({ '@type': 'CollegeOrUniversity', name })), sameAs: Object.values(profile.links), knowsAbout: profile.expertise, award: profile.awards, email: `mailto:${profile.email}` };
const graph = { '@context': 'https://schema.org', '@graph': [
  { '@type': 'ProfilePage', '@id': `${base}#profile`, url: base, name: `${profile.name} — Distributed Systems Research Lead`, description: profile.description, mainEntity: { '@id': personId }, dateModified: profile.updatedAt },
  person,
  ...papers.map(p => ({ '@type': 'ScholarlyArticle', '@id': `${base}#paper-${p.id}`, headline: p.title, url: p.url || p.venueUrl, datePublished: String(p.firstPublishedYear || p.year), author: p.authors.split(', ').map(name => /(?:Eleftherios|Lefteris) Kokoris-Kogias/.test(name) ? { '@id': personId } : { '@type': 'Person', name }), isPartOf: { '@type': 'CreativeWork', name: `${p.venue} ${p.year}`, url: p.venueUrl || p.evidenceUrl }, ...(p.recognition ? { award: p.recognition } : {}), ...(p.presentation ? { description: 'Research preprint presented at SBC 2026.' } : {}) })),
  ...media.writing.map(w => ({ '@type': 'Article', headline: w.title, url: w.url, datePublished: w.date, author: w.authors.map(name=> /Lefteris Kokoris/.test(name) ? { '@id': personId } : { '@type':'Person', name }), publisher: { '@type': 'Organization', name: w.publisher } })),
  { '@type': 'ItemList', name: 'Talks and interviews by Lefteris Kokoris-Kogias', numberOfItems: allTalks.length, itemListElement: allTalks.map((talk,index)=>({ '@type':'ListItem', position:index+1, item:{ '@type':'CreativeWork', name:talk.title, url:talk.url, creator:{'@id':personId} } })) }
] };
let html = await readFile(path.join(root, 'src/index.html'), 'utf8');
html = html.replace('@@PUBLICATIONS@@', paperHTML).replace('@@PAPER_COUNT@@', papers.length).replace('@@WRITING@@', writingHTML);
html = html.replace('@@TALK_ARCHIVE@@', talkArchive).replace('@@TALK_COUNT@@', groupedTalks.size).replace('@@APPEARANCE_COUNT@@',allTalks.length);
html = html.replace('@@SELECTED_AWARDS@@', awards.filter(a => a.selected).map(a => `<li><span>${esc(a.year)}</span><p>${esc(a.title)}<strong>${esc(a.organization)}${a.detail ? ' · ' + esc(a.detail) : ''}</strong></p></li>`).join(''));
html = html.replace(/<script type="application\/ld\+json">.*?<\/script>/s, `<script type="application/ld+json">${JSON.stringify(graph).replaceAll('<', '\\u003c')}</script>`);
await mkdir(path.join(root, 'dist'), { recursive: true });
await cp(path.join(root, 'src'), path.join(root, 'dist'), { recursive: true });
await writeFile(path.join(root, 'dist/index.html'), html);
const awardsURL = `${base}awards/`;
const awardGraph = {'@context':'https://schema.org','@graph':[
  {'@type':'CollectionPage','@id':awardsURL,url:awardsURL,name:`Awards & Honors · ${profile.name}`,about:{'@id':personId},mainEntity:{'@id':personId}},person
]};
const awardsHTML = (await readFile(path.join(root,'src/awards/index.html'),'utf8'))
  .replace('@@AWARDS_SCHEMA@@',JSON.stringify(awardGraph).replaceAll('<','\\u003c'))
  .replace('@@AWARDS@@',awards.map(a => `<li class="award-entry" id="${esc(a.id)}"><span class="award-year">${esc(a.year || 'Competition')}</span><div><h2>${a.url ? `<a href="${esc(a.url)}">${esc(a.title)} <span aria-hidden="true">↗</span></a>` : esc(a.title)}</h2><p>${esc(a.organization)}${a.detail ? ' · ' + esc(a.detail) : ''}</p></div></li>`).join('\n'));
await writeFile(path.join(root,'dist/awards/index.html'),awardsHTML);
await writeFile(path.join(root,'dist/awards/index.md'),`# Awards & Honors · ${profile.name}\n\n${awards.map(a=>`- ${a.year ? a.year + ': ' : ''}${a.url ? `[${a.title}](${a.url})` : a.title}, ${a.organization}${a.detail ? ' · '+a.detail : ''}.`).join('\n')}\n`);
await writeFile(path.join(root,'dist/awards.json'),JSON.stringify(awards,null,2)+'\n');
const mentorshipURL = `${base}mentorship/`;
const sharedPapers = mentee => [
  ...(mentee.paperIds || []).map(id => {
    const paper = papers.find(p => p.id === id);
    if (!paper) throw new Error(`Unknown shared publication: ${id}`);
    return {...paper, label: mentorship.paperLabels?.[id] || (paper.title.includes(':') ? paper.title.split(':')[0] : paper.title)};
  }),
  ...(mentee.additionalPapers || [])
];
const mentorshipHTML = mentorship.groups.map(group => {
  const people = mentorship.people.filter(p => p.group === group.id).sort((a,b)=>a.name.localeCompare(b.name));
  if (!people.length) return '';
  return `<section class="mentorship-section" aria-labelledby="mentorship-${esc(group.id)}"><h2 id="mentorship-${esc(group.id)}">${esc(group.title)}</h2><ul class="mentorship-list">${people.map(p => {
    const work = sharedPapers(p);
    return `<li class="mentee" id="${esc(p.id)}"><div><h3>${p.url ? `<a href="${esc(p.url)}">${esc(p.name)} <span aria-hidden="true">↗</span></a>` : esc(p.name)}</h3><p class="mentee-role">${esc(p.role)}${p.period ? ' · '+esc(p.period) : ''}</p>${p.context ? `<p class="mentee-context">${esc(p.context)}</p>` : ''}</div>${work.length ? `<div class="mentee-work"><p class="mentee-paper-note">SHARED RESEARCH</p><div class="mentee-papers">${work.map(paper=>`<a href="${esc(paper.url)}" title="${esc(paper.title)}">${esc(paper.label)} · ${esc(paper.venue || 'Preprint')} ${esc(paper.year)}</a>`).join('')}</div></div>` : ''}</li>`;
  }).join('\n')}</ul></section>`;
}).join('\n');
const mentorshipGraph = {'@context':'https://schema.org','@graph':[
  {'@type':'CollectionPage',url:mentorshipURL,name:`Mentorship · ${profile.name}`,about:{'@id':personId},mainEntity:{'@type':'ItemList',numberOfItems:mentorship.people.length,itemListElement:mentorship.people.map((p,i)=>({'@type':'ListItem',position:i+1,item:{'@type':'Person',name:p.name,...(p.url?{url:p.url}:{}),description:`${p.role}${p.period?' ('+p.period+')':''}${p.context?'; '+p.context:''}, research mentorship with ${profile.name}.`}}))}},person
]};
await writeFile(path.join(root,'dist/mentorship/index.html'),(await readFile(path.join(root,'src/mentorship/index.html'),'utf8')).replace('@@MENTORSHIP@@',mentorshipHTML).replace('@@MENTORSHIP_SCHEMA@@',JSON.stringify(mentorshipGraph).replaceAll('<','\\u003c')));
await writeFile(path.join(root,'dist/mentorship.json'),JSON.stringify(mentorship,null,2)+'\n');
await writeFile(path.join(root,'dist/mentorship/index.md'),`# Mentorship · ${profile.name}\n\n${mentorship.groups.map(group=>`## ${group.title}\n\n${mentorship.people.filter(p=>p.group===group.id).map(p=>`### ${p.name}\n\n${p.role}${p.period?' · '+p.period:''}.${p.context?' '+p.context+'.':''}\n\n${sharedPapers(p).map(paper=>`- [${paper.title}](${paper.url}), ${paper.venue || 'Preprint'} ${paper.year}.`).join('\n')}`).join('\n\n')}`).join('\n\n')}\n`);
await cp(path.join(root, 'lefteris.jpg'), path.join(root, 'dist/lefteris.jpg'));
await writeFile(path.join(root, 'dist/profile.json'), JSON.stringify(profile, null, 2) + '\n');
await writeFile(path.join(root, 'dist/research.json'), JSON.stringify(papers, null, 2) + '\n');
await writeFile(path.join(root, 'dist/media.json'), JSON.stringify(media, null, 2) + '\n');
await writeFile(path.join(root, 'dist/robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${base}sitemap.xml\n`);
await writeFile(path.join(root, 'dist/sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[base,awardsURL,mentorshipURL].map(url=>`<url><loc>${url}</loc><lastmod>${profile.updatedAt}</lastmod></url>`).join('')}</urlset>\n`);
const llms = `# ${profile.name}\n\n> ${profile.description}\n\n${profile.name} leads distributed systems research at Mysten Labs / Sui. His work spans research leadership and technology transfer: translating between academic research, protocol design, applied cryptography, and the engineering of distributed systems that run in production. Previously an Assistant Professor at IST Austria and, before that, a Research Scientist at Facebook / Meta. PhD in Computer Science from EPFL; MEng from the National Technical University of Athens.\n\n## Expertise\n\n${profile.expertise.join(', ')}.\n\n## Verified impact\n\n- Consensus: co-author of ByzCoin, OmniLedger, Narwhal and Tusk, Bullshark, Mysticeti, and Sui Lutris; research adopted in Sui.\n- Key and binary transparency: co-author of Parakeet, which informed WhatsApp's deployed key transparency system, and CHAINIAC, for transparent and verifiable software updates.\n- Storage: co-author of Walrus (CCS 2026), Tidehunter (VLDB 2026), and Proof of Availability & Retrieval in a Modular Blockchain Architecture (FC 2023).\n- Threshold cryptography: co-author of ADKG (CCS 2020), Practical ADKG (IEEE S&P 2022), practical high-threshold ADKG (USENIX Security 2023), and Calypso, and the randomness research underlying drand and Cloudflare's League of Entropy.\n\n## Sources and machine-readable records\n\n- [Students and mentorship](${base}mentorship/): Students, interns, and links to shared papers and preprints.\n- [Mentorship data](${base}mentorship.json): Structured mentorship and shared research records.\n- [Awards and honors](${base}awards/): Complete awards, fellowships, and academic recognition.\n- [Awards data](${base}awards.json): Full structured awards record.\n- [Professional profile](${base}profile.json): Current role, expertise, education, awards, contact and source links.\n- [Research archive](${base}research.json): Complete paper titles, authors, venues, years, and original links.\n- [Talks and authored writing](${base}media.json): Source links to recordings, talks, and articles.\n- [Google Scholar](${profile.links.scholar})\n- [DBLP](${profile.links.dblp})\n- [LinkedIn](${profile.links.linkedin})\n- [GitHub](${profile.links.github})\n\n## 2026 research\n\n${papers.filter(p=>p.year===2026).map(p=>`- [${p.title}](${p.url}): ${p.venue} 2026${p.recognition ? '; ' + p.recognition : ''}${p.presentation ? '; research presentation at SBC, as confirmed by the author' : ''}.`).join('\n')}\n\n## Contact\n\n${profile.email}\n\nLast updated: ${profile.updatedAt}. Current leadership responsibility confirmed by Lefteris Kokoris-Kogias.\n`;
await writeFile(path.join(root, 'dist/llms.txt'), llms);
await writeFile(path.join(root, 'dist/index.md'), `${llms}\n## Full research archive\n\n${papers.map(p=>`### ${p.title}\n\n${p.authors}. ${p.venue} ${p.year}.${p.authorNote ? ' ' + p.authorNote + '.' : ''}${p.recognition ? ' ' + p.recognition + '.' : ''}${p.presentation ? ' Research presentation.' : ''}\n\n[Original paper](${p.url || p.venueUrl})\n`).join('\n')}\n## Authored writing\n\n${media.writing.map(w=>`- [${w.title}](${w.url}), ${w.publisher}, ${w.date}.`).join('\n')}\n\n## Talks\n\n${[...media.talks,...media.additionalTalks].map(t=>`- [${t.title}](${t.url}), ${t.host}, ${t.year || t.date?.slice(0,4) || 'date not listed'}.`).join('\n')}\n`);
await writeFile(path.join(root, 'dist/.nojekyll'), '');
console.log(`Built dist/: ${papers.length} research entries, ${groupedTalks.size} talk groups (${allTalks.length} appearances), ${awards.length} awards, ${media.writing.length} articles, semantic HTML and structured discovery files.`);
