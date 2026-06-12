# Command Center

Personal strategic dashboard — vision, initiatives, tasks, recognitions, team.

## Run

JSON files are loaded via `fetch`, so opening `index.html` directly with `file://` will be blocked by the browser. Serve the folder over HTTP:

```bash
cd command-center
python3 -m http.server 8000
# open http://localhost:8000
```

## Editing data

All state lives in `data/*.json`. Edit those files and refresh. The in-app **export data** button (sidebar) downloads the current state (including any checkboxes toggled in the browser) so you can paste it back into the JSON files and commit.

## Shortcuts

- `⌘K` / `Ctrl+K` — quick capture (task / recognition / request)
- Sidebar — navigate sections

## Structure

```
command-center/
  index.html
  assets/
    styles.css
    app.js
  data/
    strategy.json
    initiatives.json
    tasks.json
    recognitions.json
    team.json
```
