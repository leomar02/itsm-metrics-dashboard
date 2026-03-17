/**
 * ITSM Metrics Dashboard — app.js
 * Author: Leo Grullon Mendez
 *
 * Parses ticket CSV exports, renders metrics, and calls the
 * Claude API to generate plain-language executive summaries.
 *
 * Supported ITSM sources:
 *   - Freshservice CSV export
 *   - Jira issue export
 *   - ServiceNow ticket export
 *   - Any CSV with: ID, Title, Category, Priority, Status, Created, Resolved, Team
 */

// ─── Config ──────────────────────────────────────────────────────────────────

/**
 * SLA targets in hours by priority.
 * Adjust these to match your organisation's SLA policy.
 */
const SLA_TARGETS = {
  P1: 4,
  P2: 8,
  P3: 24,
  P4: 48,
};

const BAR_COLORS = [
  '#4ade80', // green
  '#60a5fa', // blue
  '#f59e0b', // amber
  '#a78bfa', // purple
  '#f87171', // red
  '#34d399', // teal
];

// ─── Sample data ──────────────────────────────────────────────────────────────

const SAMPLE_CSV = `ID,Title,Category,Priority,Status,Created,Resolved,Team
TKT-101,VPN connectivity failure affecting remote users,Network,P1,Resolved,2025-01-06,2025-01-06,Infrastructure
TKT-102,Laptop won't boot after Windows update,Hardware,P2,Open,2025-01-06,,Endpoint
TKT-103,Okta MFA not sending push notifications,IAM/SSO,P2,Resolved,2025-01-07,2025-01-07,Identity
TKT-104,Slack channels missing after workspace migration,SaaS/Apps,P3,Resolved,2025-01-07,2025-01-08,Collaboration
TKT-105,New hire provisioning - Sarah Chen,Onboarding,P3,Resolved,2025-01-07,2025-01-07,IT Ops
TKT-106,Google Drive sync error on MacOS,SaaS/Apps,P3,Resolved,2025-01-08,2025-01-09,Collaboration
TKT-107,Printer offline in office 3F,Hardware,P3,Resolved,2025-01-08,2025-01-08,Endpoint
TKT-108,SOC 2 audit evidence - export request,Compliance,P2,Open,2025-01-08,,IT Ops
TKT-109,Zoom Rooms camera not working - conf room B,Hardware,P2,Resolved,2025-01-09,2025-01-09,Endpoint
TKT-110,Password reset - finance team x3,IAM/SSO,P4,Resolved,2025-01-09,2025-01-09,Identity
TKT-111,Kandji policy deployment failing on M3 Macs,MDM/Endpoint,P2,Open,2025-01-09,,Endpoint
TKT-112,New hire provisioning - James Okafor,Onboarding,P3,Resolved,2025-01-09,2025-01-10,IT Ops
TKT-113,VPN throughput degraded for London office,Network,P2,Resolved,2025-01-10,2025-01-10,Infrastructure
TKT-114,GitHub SSO misconfigured after org rename,IAM/SSO,P1,Resolved,2025-01-10,2025-01-10,Identity
TKT-115,Offboarding - revoke access for M. Torres,Offboarding,P2,Resolved,2025-01-10,2025-01-10,IT Ops`;

// ─── State ────────────────────────────────────────────────────────────────────

let dashData = null;

// ─── Initialisation ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  setWeekBadge();
});

/** Display the current week label in the header. */
function setWeekBadge() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  document.getElementById('weekBadge').textContent =
    'Week of ' + monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Tab switching ────────────────────────────────────────────────────────────

function switchTab(name, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('pasteTab').style.display  = name === 'paste'  ? 'block' : 'none';
  document.getElementById('manualTab').style.display = name === 'manual' ? 'block' : 'none';
}

// ─── Data loading ─────────────────────────────────────────────────────────────

/** Load the built-in sample dataset. */
function loadSample() {
  document.getElementById('csvInput').value = SAMPLE_CSV;
  parseAndLoad();
}

/** Parse the CSV pasted into the textarea and render the dashboard. */
function parseAndLoad() {
  const raw = document.getElementById('csvInput').value.trim();
  if (!raw) return;

  const tickets = parseCSV(raw);
  if (!tickets.length) {
    alert('Could not parse CSV. Please check the column headers match the expected format.');
    return;
  }
  processTickets(tickets);
}

/** Load manually entered summary metrics (no CSV required). */
function loadManual() {
  const total = parseInt(document.getElementById('f-total').value) || 0;
  const avgRes = parseFloat(document.getElementById('f-res').value) || 0;
  const slaCompliance = parseFloat(document.getElementById('f-sla').value) || 0;
  const openCritical = parseInt(document.getElementById('f-p1').value) || 0;
  const notes = document.getElementById('f-notes').value;

  dashData = {
    total, avgRes, slaCompliance, openCritical,
    categories: {}, teams: {}, openTickets: [],
    notes,
    raw: `Total: ${total}, Avg resolution: ${avgRes}h, SLA: ${slaCompliance}%, Open P1/P2: ${openCritical}. ${notes}`,
  };
  renderDash();
}

// ─── CSV parsing ──────────────────────────────────────────────────────────────

/**
 * Parse a CSV string into an array of objects keyed by header name.
 * Handles quoted fields with commas inside them.
 *
 * @param {string} text - Raw CSV text
 * @returns {Object[]} Array of row objects
 */
function parseCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]).map(h => h.toLowerCase());

  return lines.slice(1).map(line => {
    const vals = splitCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
    return obj;
  });
}

function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += line[i];
    }
  }
  result.push(current);
  return result;
}

// ─── Data processing ──────────────────────────────────────────────────────────

/**
 * Derive all dashboard metrics from a parsed ticket array.
 *
 * @param {Object[]} tickets
 */
function processTickets(tickets) {
  const resolved = tickets.filter(t => t.status === 'Resolved');
  const open     = tickets.filter(t => t.status !== 'Resolved');

  const openCritical = open.filter(t => t.priority === 'P1' || t.priority === 'P2').length;

  // Average resolution time
  let totalHrs = 0, countRes = 0;
  resolved.forEach(t => {
    if (t.created && t.resolved) {
      const hrs = (new Date(t.resolved) - new Date(t.created)) / 3_600_000;
      if (hrs >= 0) { totalHrs += hrs; countRes++; }
    }
  });
  const avgRes = countRes ? totalHrs / countRes : 0;

  // SLA compliance
  let slaPass = 0, slaTotal = 0;
  resolved.forEach(t => {
    const target = SLA_TARGETS[t.priority];
    if (!target) return;
    slaTotal++;
    const hrs = t.created && t.resolved
      ? (new Date(t.resolved) - new Date(t.created)) / 3_600_000
      : Infinity;
    if (hrs <= target) slaPass++;
  });
  const slaCompliance = slaTotal ? Math.round(slaPass / slaTotal * 100) : 0;

  // Category breakdown
  const categories = {};
  tickets.forEach(t => {
    const c = t.category || 'Other';
    categories[c] = (categories[c] || 0) + 1;
  });

  // Per-team SLA compliance
  const teams = {};
  resolved.forEach(t => {
    const team   = t.team || 'Unknown';
    const target = SLA_TARGETS[t.priority] || 24;
    const hrs    = t.created && t.resolved
      ? (new Date(t.resolved) - new Date(t.created)) / 3_600_000
      : Infinity;

    if (!teams[team]) teams[team] = { pass: 0, total: 0 };
    teams[team].total++;
    if (hrs <= target) teams[team].pass++;
  });

  // Open ticket preview (max 5)
  const openTickets = open.slice(0, 5).map(t => ({
    id:       t.id,
    title:    t.title,
    priority: t.priority,
    team:     t.team,
    created:  t.created,
  }));

  // Plain-text summary passed to Claude
  const raw = `Week's IT tickets summary:
- Total tickets: ${tickets.length}
- Resolved: ${resolved.length}, Open: ${open.length}
- Open critical (P1/P2): ${openCritical}
- Avg resolution time: ${avgRes.toFixed(1)} hours
- SLA compliance: ${slaCompliance}% (${slaPass}/${slaTotal} resolved within target)
- Top categories: ${Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} (${v})`).join(', ')}
- Team SLA: ${Object.entries(teams).map(([k, v]) => `${k} ${Math.round(v.pass / v.total * 100)}%`).join(', ')}
- Open incidents: ${openTickets.map(t => `${t.id} ${t.priority} - ${t.title}`).join('; ')}`;

  dashData = {
    total: tickets.length,
    avgRes,
    slaCompliance,
    openCritical,
    categories,
    teams,
    openTickets,
    raw,
  };

  renderDash();
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function renderDash() {
  if (!dashData) return;
  const { total, avgRes, slaCompliance, openCritical, categories, teams, openTickets } = dashData;

  // Metric cards
  document.getElementById('m-total').textContent = total;
  document.getElementById('m-res').textContent   = avgRes.toFixed(1);
  document.getElementById('m-sla').textContent   = slaCompliance + '%';
  document.getElementById('m-p1').textContent    = openCritical;

  // Dynamic colour for SLA
  const slaEl = document.getElementById('m-sla');
  slaEl.className = 'metric-value ' +
    (slaCompliance >= 90 ? 'mv-blue' : slaCompliance >= 75 ? 'mv-amber' : 'mv-red');

  // Dynamic colour for critical count
  const p1El = document.getElementById('m-p1');
  p1El.className = 'metric-value ' +
    (openCritical === 0 ? 'mv-green' : openCritical <= 2 ? 'mv-amber' : 'mv-red');

  // Category bar chart
  const catSorted = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxCat = catSorted[0]?.[1] || 1;
  document.getElementById('catBars').innerHTML = catSorted.map(([name, val], i) => `
    <div class="bar-row">
      <div class="bar-label">${name}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${Math.round(val / maxCat * 100)}%;background:${BAR_COLORS[i]};"></div>
      </div>
      <div class="bar-val">${val}</div>
    </div>`).join('');

  // Team SLA list
  const teamEntries = Object.entries(teams);
  document.getElementById('slaRows').innerHTML = teamEntries.length
    ? teamEntries.map(([name, v]) => {
        const pct = Math.round(v.pass / v.total * 100);
        const cls = pct >= 90 ? 'sla-ok' : pct >= 75 ? 'sla-warn' : 'sla-fail';
        return `<div class="sla-row">
          <span class="sla-name">${name}</span>
          <span class="sla-pct ${cls}">${pct}%</span>
        </div>`;
      }).join('')
    : '<div class="empty-state">No resolved tickets with team data</div>';

  // Open ticket list
  const priMap = { P1: 'p1', P2: 'p2', P3: 'p3', P4: 'p3' };
  document.getElementById('ticketList').innerHTML = openTickets.length
    ? openTickets.map(t => `
      <div class="ticket-item">
        <span class="t-pri ${priMap[t.priority] || 'p3'}">${t.priority}</span>
        <div class="t-body">
          <div class="t-title">${t.title}</div>
          <div class="t-meta">${t.id} · ${t.team || 'Unassigned'} · ${t.created || '—'}</div>
        </div>
      </div>`).join('')
    : '<div class="empty-state">No open tickets</div>';
}

// ─── AI report generation ─────────────────────────────────────────────────────

/**
 * Send ticket metrics to Claude and stream the executive summary
 * into the AI output panel.
 */
async function generateReport() {
  if (!dashData) {
    document.getElementById('dataSection').scrollIntoView({ behavior: 'smooth' });
    alert('Load your ticket data first.');
    return;
  }

  const btn = document.getElementById('genBtn');
  const out = document.getElementById('aiOutput');

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Generating…';
  out.innerHTML = '<span class="ai-placeholder">Analysing ticket data with Claude…</span>';

  const prompt = `You are an IT Operations analyst. Write a concise weekly executive summary for an IT Manager or Director based on this data:

${dashData.raw}

Structure your response as:
1. HEADLINE (one sentence overall status)
2. KEY METRICS (3-4 bullet points with numbers)
3. TOP ISSUES (2-3 most important items needing attention)
4. RECOMMENDED ACTIONS (2-3 concrete next steps)
5. WINS THIS WEEK (1-2 positive callouts)

Be direct, specific, and use exact numbers. Write for a non-technical executive audience.
Use plain-text section labels (no markdown headers or asterisks). Keep it under 300 words.`;

  try {
    const response = await fetch('https://itsm-proxy.onrender.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const text = data.content?.find(b => b.type === 'text')?.text || 'No response received.';
    out.textContent = text;

  } catch (error) {
    out.innerHTML = `<span class="ai-placeholder">Error: ${error.message}.\n\nIf running locally, ensure your ANTHROPIC_API_KEY is set in the proxy or environment.</span>`;
    console.error('Claude API error:', error);
  }

  btn.disabled = false;
  btn.textContent = 'Regenerate Report';
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Copy the current AI report text to the clipboard. */
function copyReport() {
  const text = document.getElementById('aiOutput').textContent;
  if (!text || text.includes('Load your ticket data')) return;

  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
  });
}
