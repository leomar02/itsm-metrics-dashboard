# ITSM Metrics Dashboard

> AI-powered weekly IT operations reporting — paste a ticket export, get an executive summary in seconds.

![Dashboard preview](https://img.shields.io/badge/status-active-4ade80?style=flat-square)
![Claude API](https://img.shields.io/badge/powered%20by-Claude%20API-60a5fa?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-f59e0b?style=flat-square)

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

### Option 1 — Open directly in a browser (no server needed)

```bash
git clone https://github.com/YOUR_USERNAME/itsm-metrics-dashboard.git
cd itsm-metrics-dashboard
open index.html   # macOS
# or double-click index.html in your file explorer
```

> **Note:** The Claude API call requires a proxy or a local server when running from `file://`. See [API setup](#api-setup) below.

### Option 2 — Run with a local server (recommended)

```bash
# Python 3
python3 -m http.server 8080

# Node.js (npx)
npx serve .
```

Then open `http://localhost:8080` in your browser.

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

The dashboard calls `https://api.anthropic.com/v1/messages` directly from the browser. This works natively inside **Claude Artifacts** (the API key is injected automatically).

To run it outside of Claude.ai (e.g. locally or on a hosted site), you have two options:

### Option A — Simple Node.js proxy (recommended for local use)

```bash
npm install express node-fetch dotenv
```

Create a `.env` file:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Create `proxy.js`:

```js
import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static('.'));

app.post('/api/claude', async (req, res) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(req.body),
  });
  const data = await response.json();
  res.json(data);
});

app.listen(8080, () => console.log('Running at http://localhost:8080'));
```

Then update the fetch URL in `app.js` from `https://api.anthropic.com/v1/messages` to `/api/claude`.

### Option B — Deploy to Vercel / Netlify with a serverless function

Create an API route that forwards requests to Anthropic with your server-side key. This keeps your key out of the browser entirely.

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
├── sample-data.csv   # 15-ticket demo dataset
└── README.md         # This file
```

---

## Tech stack

- **Vanilla HTML/CSS/JS** — zero dependencies, no build step required
- **Claude API** (`claude-sonnet-4-20250514`) — AI summary generation
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
[LinkedIn](https://www.linkedin.com/in/leomar-grullon/) · [GitHub](https://github.com/YOUR_USERNAME)
