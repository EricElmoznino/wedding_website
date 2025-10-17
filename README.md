# Wedding Guest Companion

Single-page wedding companion site with a splash screen, live guest search, and personalized table details.

## Quick start

The site uses `fetch` to load `assets/test_example_data.csv`, so you need to serve it over HTTP when developing locally.

```bash
cd /path/to/wedding_website
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

## Project structure

- `index.html` – splash screen, search view, and information view containers.
- `styles/main.css` – responsive styling geared toward phones.
- `scripts/main.js` – CSV loading, live search, and info-page rendering logic.
- `assets/test_example_data.csv` – sample export from Google Sheets (update this before the event).
- `assets/images/background.jpg` – shared background image.
- `assets/images/table-default.png` – fallback venue layout.
- `assets/images/tables/` – optional table-specific highlight images (`table-1.png`, `table-2.png`, …).

## Updating guest data

1. Export the latest Google Sheet as CSV and save it as `assets/test_example_data.csv`.
2. No manual cleanup is required: the script automatically
   - skips the summary rows,
   - filters `Attending != Yes`,
   - drops the trailing `" +1"` suffixes,
   - substitutes `"Chef's choice (TBD)"` for missing meal selections, and `"TBD"` for unassigned tables.
3. Reload the page; the splash screen will disappear as soon as the data is ready.

## Table highlight images

Place per-table images in `assets/images/tables/` using the naming pattern:

```
assets/images/tables/table-<table-label>.png
```

Examples:

- Table `5` → `assets/images/tables/table-5.png`
- Table `Garden West` → `assets/images/tables/table-garden-west.png`

If a matching file is not found, the site falls back to `assets/images/table-default.png`.

## Photo upload link

Update the `PHOTO_UPLOAD_URL` constant near the top of `scripts/main.js` once you have the final album link.

## Deployment

The site is a plain static bundle and can be hosted on GitHub Pages. Commit the latest build, push to `main`, and ensure Pages points to that branch (or to the `docs/` folder if you prefer to publish from there).
