# Personal website — Yassine Mannai

Static, no-build site (plain HTML/CSS/JS) — works with any static host.

## Preview locally

Just open `index.html` in a browser, or serve it (recommended, so relative
paths behave like production):

```powershell
python -m http.server 8000
# then open http://localhost:8000
```

## Deploy

**Netlify**
1. Push this repo to GitHub (or drag-and-drop the project folder onto
   [app.netlify.com/drop](https://app.netlify.com/drop)).
2. If using Git: New site from Git → no *Base directory* and no build
   command needed (the site is served from the repo root).

**Vercel**
1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. Framework preset "Other" (no build command, output directory `.`).

**GitHub Pages**
1. Settings → Pages → Deploy from branch → root (or move the files to a
   `docs/` folder as required by Pages).

## Customize

- Update copy directly in `index.html`.
- Colors, fonts and spacing live in `css/style.css` (`:root` variables at
  the top).
- The animated network background and scroll effects are in `js/main.js`.
- Contact links (email, LinkedIn, GitHub, phone) live in the sidebar and
  Contact section of `index.html`.
- The Tunis / Lyon / Paris route illustrations are in `assets/*.svg`; swap
  them for photos by replacing the files (keep a ~4:3 ratio).
- Swap `assets/favicon.svg` for your own mark/photo if desired.
