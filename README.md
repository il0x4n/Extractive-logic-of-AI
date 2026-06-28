# The extractive logic of AI

**The tension between artificial intelligence and the environment** — an interactive website / virtual exhibition.

A critical reflection on AI and its impact on the environment and the climate, focused on the material aspects behind AI and its extractive force. The project draws on the first chapter ("earth") of Kate Crawford's *Atlas of AI: Power, Politics, and the Planetary Costs of Artificial Intelligence* as its primary source.

Created for a Research Colloquium at the University of Hamburg (Liberal Arts and Sciences, 2025/26).

## Experience

The site is a single-page, vertically-scrolling exhibition in five sections:

1. **Title** — animated entrance over a drifting particle field.
2. **AI** — five clickable bento tiles, each opening a critical essay (what AI is, how it works, sustainability potential, extractivism & digital capitalism, why it is not a "clean technology").
3. **Globe** — a photoreal, draggable 3D Earth with nine clickable locations tracing AI's planetary supply chain (Silicon Valley, Silver Peak, Bolivia, Congo, Mongolia, Indonesia, the NSA data centre in Utah, Ghana, maritime logistics).
4. **Consequences & challenges** — the closing essay, with cinematic quote reveals and a visitor note field.
5. **Sources & information** — full bibliography, picture credits, and a note about the project.

## Tech

A dependency-free static site:

- **HTML / CSS / vanilla JavaScript** — no build step.
- **[Three.js](https://threejs.org/)** (via CDN) — the 3D globe.
- **[Lenis](https://lenis.dev/)** (via CDN) — smooth momentum scrolling.

The design system is deliberately minimal: black background, white Times New Roman, motion used sparingly. Respects `prefers-reduced-motion` and adapts down to mobile.

## Running locally

The globe loads ES modules and textures, so it must be served over HTTP (opening `index.html` directly via `file://` will not work).

```bash
# Any static server works. A small no-cache dev server is included:
python scripts/dev-server.py 5173
# then open http://localhost:5173
```

Or with Python's built-in server:

```bash
python -m http.server 5173
```

## Deploying (Vercel)

The site is a zero-build static site, so Vercel serves it as-is:

1. [vercel.com](https://vercel.com) → **Add New… → Project** → import this GitHub repo.
2. Framework Preset: **Other** (no build command, no output dir to change).
3. **Deploy.** Every `git push` to `main` then redeploys automatically.

`vercel.json` only sets cache headers (long cache for images, always-fresh HTML).

## Structure

```
index.html            Markup for all five sections + overlays
styles.css            Full design system and motion layer
script.js             Lenis scroll, 3D globe, interactions, notes
assets/places/        Photographs of the nine locations
docs/master-text.txt  Source text reference (exhibition content)
scripts/dev-server.py No-cache static server for local development
```

## Credits

- Primary source: Kate Crawford, *Atlas of AI* (2021) / *Atlas der KI* (2024).
- Earth textures: Three.js examples (NASA Blue Marble).
- Photograph credits are listed in full on the **Sources** section of the site.
