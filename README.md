# ITSM Metrics Dashboard

> AI-powered weekly IT operations reporting — paste a ticket export, get an executive summary in seconds.

![Dashboard preview](https://img.shields.io/badge/status-active-4ade80?style=flat-square)
![Claude API](https://img.shields.io/badge/powered%20by-Claude%20API-60a5fa?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-f59e0b?style=flat-square)

**[Try the live demo →](https://leomar02.github.io/itsm-metrics-dashboard/)**
Click **Load sample data**, then **Generate AI Report** — no setup, no API key needed.

---

## Overview

This dashboard ingests a weekly CSV export from Jira, Freshservice, or ServiceNow and automatically:

- Calculates **SLA compliance** per team and per priority tier
- Shows **ticket volume by category** with visual breakdowns
- Surfaces **open P1/P2 incidents** at a glance
- Sends all metrics to the **Claude API** to generate a plain-language executive summary — structured, specific, and ready to share with leadership

Built as a portfolio project to demonstrate AI-driven automation in IT operations and ITSM workflows.

---

## Features

| Feature | Details |
|---|---|
| CSV parsing | Supports Jira, Freshservice, ServiceNow exports |
| SLA auto-calculation | P1=4h, P2=8h, P3=24h, P4=48h (configurable) |
| Category breakdown | Bar chart with top 6 ticket categories |
| Team SLA compliance | Per-team on-time resolution percentage |
| Open incident tracker | Prioritised list of unresolved P1/P2/P3 tickets |
| AI executive summary | Claude generates a 300-word report with headline, metrics, issues, actions, and wins |
| Manual entry mode | Enter aggregate numbers without a CSV file |
| One-click copy | Copy the AI report straight to clipboard |

---

## Quick start

The fastest path is the [live demo](https://leomar02.github.io/itsm-metrics-dashboard/) — it is
the exact contents of this repo, served by GitHub Pages, and the AI report works out of the box.

To run it yourself:

```bash
git clone https://github.com/leomar02/itsm-metrics-dashboard.git
cd itsm-metrics-dashboard
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

Opening `index.html` straight from the filesystem also works for everything except the AI
report — browsers block `fetch` from `file://` origins. Any static server avoids that.

The front end has no dependencies and no build step. The only reason to run `npm install`
is if you want to host your own API proxy — see [API setup](#api-setup).

---

## Usage

1. **Load data** — paste a CSV export into the *Paste CSV* tab, or click **Load sample data** to use the included demo dataset
2. **Review metrics** — SLA compliance, resolution time, category breakdown, and open incidents populate automatically
3. **Generate report** — click **Generate AI Report** to send your metrics to Claude and receive an executive summary
4. **Copy and share** — use the **Copy** button to paste the summary into Slack, email, or a Google Doc

### CSV format

Your export should include these columns (case-insensitive):

```
ID, Title, Category, Priority, Status, Created, Resolved, Team
```

| Column | Example values |
|---|---|
| Priority | P1, P2, P3, P4 |
| Status | Resolved, Open, In Progress |
| Created / Resolved | YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS |

Extra columns are ignored. See `sample-data.csv` for a working example.

---

## API setup

Anthropic API keys must never be exposed in browser code, so the dashboard does not call
`api.anthropic.com` directly. It posts to a small proxy that holds the key server-side and
forwards the request.

That proxy is `server.js` in this repo — about 40 lines, no dependencies, Node built-ins only.
A deployed instance is already running, and `app.js` points at it, which is why the live demo
works without any setup on your part.

### Hosting your own proxy

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm start          # or: node server.js
```

It listens on `PORT` (default `3000`), accepts `POST /` with a Messages API request body, and
returns Anthropic's response. CORS is open so the static page can call it from any origin.

To point the dashboard at your own instance, change the URL in the `generateReport` function
in `app.js`:

```js
const response = await fetch('https://itsm-proxy.onrender.com', {
```

Any host that runs Node works — Render, Railway, Fly.io, or a container. Set
`ANTHROPIC_API_KEY` as an environment variable in the host's dashboard; never commit it.
`.gitignore` already excludes `.env`.

---

## Configuration

To customise SLA targets, edit the `SLA_TARGETS` object at the top of `app.js`:

```js
const SLA_TARGETS = {
  P1: 4,   // 4 hours
  P2: 8,   // 8 hours
  P3: 24,  // 24 hours
  P4: 48,  // 48 hours
};
```

---

## File structure

```
itsm-metrics-dashboard/
├── index.html        # Main layout and HTML structure
├── styles.css        # All styles and dark-mode design tokens
├── app.js            # CSV parsing, metrics logic, Claude API call
├── server.js         # Zero-dependency API proxy (keeps the key server-side)
├── package.json      # npm start → node server.js
├── sample-data.csv   # 15-ticket demo dataset
├── .gitignore        # Excludes .env and node_modules
├── LICENSE           # MIT
└── README.md         # This file
```

---

## Tech stack

- **Vanilla HTML/CSS/JS** — zero dependencies, no build step required
- **Claude API** (`claude-sonnet-4-5`) — AI summary generation
- **Node built-ins** (`http`, `https`) — the proxy, with no npm packages
- **Google Fonts** — DM Mono + Syne for the dashboard typography

---

## Roadmap

- [ ] Jira REST API integration (auto-fetch without CSV export)
- [ ] Freshservice API integration
- [ ] Week-over-week trend comparison
- [ ] Slack webhook to post the report automatically
- [ ] Export summary as PDF or formatted email

---

## License

MIT — free to use, fork, and adapt for your own IT operations workflows.

---

## Author

**Leo Grullon Mendez**
IT Manager | 10+ years in enterprise IT operations, SaaS, IAM, and endpoint management
[LinkedIn](https://www.linkedin.com/in/leomargrullon) · [GitHub](https://github.com/leomar02)
