const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu() { menu.setAttribute('aria-expanded', 'false'); navigation.classList.remove('open'); }
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  navigation.classList.toggle('open', open);
});
navigation.addEventListener('click', (event) => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && navigation.classList.contains('open')) { closeMenu(); menu.focus(); } });

const papers = [...document.querySelectorAll('.publication')];
const filters = [...document.querySelectorAll('[data-filter]')];
const search = document.querySelector('#paper-search');
let selection = 'selected';
function filterPapers() {
  const term = search.value.trim().toLocaleLowerCase();
  let count = 0;
  for (const paper of papers) {
    // A typed query searches the full archive, including papers outside the selected set.
    const inSelection = term || selection === 'all' || (selection === 'selected' ? paper.dataset.selected === 'true' : paper.dataset.year === selection);
    const matches = inSelection && (!term || paper.textContent.toLocaleLowerCase().includes(term));
    paper.hidden = !matches;
    if (matches) count++;
  }
  document.querySelector('.no-results').hidden = count > 0;
  document.querySelector('#results-count').textContent = `${count} ${count === 1 ? 'publication' : 'publications'}${term ? ' matching your search' : selection === 'selected' ? ' · selected work' : selection === '2026' ? ' · 2026' : ' · complete archive'}`;
  filters.forEach(button => { const active = !term && button.dataset.filter === selection; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
}
if (search) {
filters.forEach(button => button.addEventListener('click', () => { selection = button.dataset.filter; search.value = ''; filterPapers(); }));
search.addEventListener('input', filterPapers);
filterPapers();
}

if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      navigation.querySelectorAll('a').forEach(link => { if (link.getAttribute('href') === `#${entry.target.id}`) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
    }
  }, {rootMargin: '-15% 0px -65% 0px'});
  document.querySelectorAll('main section[id]').forEach(section => sectionObserver.observe(section));
}
