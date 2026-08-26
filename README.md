# Yassine Mannai — Personal Website

Personal quantitative-finance portfolio. Static site (plain HTML/CSS/JS, no
build step, no framework), deployed on GitHub Pages.

**Live:** [yassinemannai.com](https://yassinemannai.com)

## Features

- **Live market ticker** — popular crypto (CoinGecko) interleaved with FX
  rates carrying daily-change arrows (ECB data via the jsDelivr currency-api,
  `open.er-api.com` fallback). Includes EUR/TND.
- **Gold-price career chart** — real monthly XAU/USD since 2020 with career
  milestones plotted on the line.
- **Trading-floor clocks** — NYC / London / Paris / Hong Kong with open/closed
  status, DST and exchange holidays.
- **Paris weather** — current conditions via Open-Meteo.
- **Filterable projects** — quant projects with links to code and reports/slides.
- **Privacy-friendly analytics** — Cloudflare Web Analytics (no cookies).

All data sources are keyless and CORS-safe, fetched client-side.

## Tech

Vanilla HTML, CSS (custom properties, no framework) and JavaScript. Fonts:
Fraunces, Space Grotesk, JetBrains Mono. No bundler or dependencies.

## Structure

```
index.html          # single page
css/style.css        # all styling (:root variables at the top)
js/main.js           # ticker, clocks, gold chart, weather, interactions
assets/docs/         # PDFs (project reports, slides, thesis, resume)
assets/img/          # svgs (favicon, city skylines)
assets/logos/        # organisation / school logos
media/               # photos
CNAME                # custom domain
```

## Run locally

Serve from the repo root (so relative paths behave like production):

```powershell
python -m http.server 8000
# then open http://localhost:8000
```

## Deploy

Hosted on **GitHub Pages** (branch `master`, root) with the custom domain
`yassinemannai.com` (see `CNAME`). Any push to `master` redeploys. CSS/JS are
cache-busted with a `?v=` query — bump it after changes to force a refresh.

## License

Code is released under the [MIT License](LICENSE). Personal content — text,
photos, logos, CV and the "Yassine Mannai" branding — is **not** covered and
may not be reused.
