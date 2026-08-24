# Personal website — Yassine Mannai

Static, no-build site (plain HTML/CSS/JS) — works with any static host.

## Preview locally

Just open `index.html` in a browser, or serve it (recommended, so relative
paths behave like production):

```powershell
cd website
python -m http.server 8000
# then open http://localhost:8000
```

## Deploy

**Netlify**
1. Push this repo to GitHub (or drag-and-drop the `website` folder onto
   [app.netlify.com/drop](https://app.netlify.com/drop)).
2. If using Git: New site from Git → set *Base directory* to `website` and
   *Publish directory* to `website` (no build command needed).

**Vercel**
1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. Set *Root Directory* to `website`, framework preset "Other" (no build
   command, output directory `.`).

**GitHub Pages**
1. Settings → Pages → Deploy from branch → root, or move `website/*` to
   the repo root / a `docs/` folder as required by Pages.

## Customize

- Update copy directly in `index.html`.
- Colors, fonts and spacing live in `css/style.css` (`:root` variables at
  the top).
- The animated network background and scroll effects are in `js/main.js`.
- Replace the placeholder LinkedIn/GitHub links in the Contact section.
- Swap `assets/favicon.svg` for your own mark/photo if desired.
