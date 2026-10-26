# Lefteris Kokoris-Kogias

Personal website focused on distributed systems research, technology transfer, and contributions to deployed systems. The redesign source is in `src/`; the original Jekyll source is retained for reference.

## Build and preview

Requires Node.js 20 or later. No packages need installing.

```sh
npm run build
npm run check
npm run dev
```

The static site is generated in `dist/`. The preview serves at `http://127.0.0.1:4173`.

## Content

- `content/profile.json`: role, biography, expertise, and evidence links.
- `content/scholar.json`: verified Google Scholar statistics and their update date. The deployment workflow refreshes these daily and on each deployment, then saves successful updates to the repository. Run `npm run update:scholar` for a manual refresh. If Google blocks the request or changes the response format, the previous figures and verification date are preserved.
- `content/awards.json`: complete awards and honors, sources, and homepage selections. The build includes this record in profile metadata and the `/awards/` subpage.
- `content/publications.json`: research archive, selected entries, and venue/award sources.
- `content/mentorship.json`: students and interns, mentorship sources, and shared publication IDs or preprints. Builds the `/mentorship/` subpage.
- `content/media.json`: curated talk groups keep repeat presentations together without removing any appearance link; talks, recordings, and authored writing.
- `src/index.html`: page structure and descriptive copy.
- `src/styles.css`: responsive styling.

Rebuild after changing content. All research entries are rendered in the HTML before JavaScript runs. Search and filtering are progressive enhancements.

The build also produces `profile.json`, `research.json`, `media.json`, `llms.txt`, a Markdown version of the page, `robots.txt`, a sitemap, and linked Person/ProfilePage/ScholarlyArticle metadata. The canonical domain is `https://lefkok.github.io/`.

## Deployment

Pushing to `master` runs `.github/workflows/pages.yml`, which builds and checks the website with Node.js 24, then deploys `dist/` to GitHub Pages at <https://lefkok.github.io/>. The workflow can also be run manually from GitHub Actions. GitHub Pages uses **GitHub Actions** as its publishing source. The original Jekyll files remain in the repository for reference and are not included in the deployed site.

The same workflow runs daily at 06:17 UTC to refresh Google Scholar statistics. It requests the public author profile once per run, validates all six metrics, and publishes the updated HTML and machine-readable data. No visitor-side request or Google login is needed. Refresh failures are reported in the workflow log without clearing the last verified statistics.

## Sources and editorial choices

The existing website supplied the original 39 research entries and portrait. Four new entries complete the requested five-item 2026 group, including the existing Thunderbolt entry. Thunderbolt's runner-up award, VLDB appearances, and Walrus's CCS acceptance are linked to primary sources in the data. Sunfish / Sparse Nodes is explicitly labeled an SBC presentation, as confirmed by the author. The current leadership responsibility was confirmed by Lefteris directly.

The name mark is **LK²**. The site does not advertise consulting availability or a geographical base. Publication authors and institutional/event names are preserved.

Design references reviewed: [Loi Luu](https://www.loiluu.com/) for a focused professional profile, [Patrick Collison](https://patrickcollison.com/) for restraint, [Maggie Appleton](https://maggieappleton.com/) for the relationship between research and writing, and [Alberto Sonnino](https://sonnino.com/) for connecting publications with practical adoption. The design and copy here are original.
