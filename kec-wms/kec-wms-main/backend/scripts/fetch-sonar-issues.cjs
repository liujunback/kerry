#!/usr/bin/env node

/**
 * SonarQube Report Fetcher
 *
 * Fetches issues and security hotspots from a SonarQube server and generates
 * a structured markdown report optimized for Claude Code to consume and fix.
 *
 * Usage:
 *   npm run sonar:report
 *   node scripts/fetch-sonar-issues.cjs --severity=CRITICAL,BLOCKER -o report.md
 *
 * Requires SONAR_HOST_URL and SONAR_TOKEN in .env or environment.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');

// ANSI colors
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(msg, color = '') { console.log(`${color}${msg}${c.reset}`); }
function err(msg) { console.error(`${c.red}Error: ${msg}${c.reset}`); }
function warn(msg) { console.error(`${c.yellow}Warning: ${msg}${c.reset}`); }

// --- Minimal .env loader ---
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

// --- Read project key from sonar-project.properties ---
function readProjectKey() {
  const propsPath = path.resolve(__dirname, '..', 'sonar-project.properties');
  if (!fs.existsSync(propsPath)) {
    err('sonar-project.properties not found in project root.');
    process.exit(1);
  }
  const content = fs.readFileSync(propsPath, 'utf-8');
  const match = content.match(/sonar\.projectKey\s*=\s*(.+)/);
  if (!match) {
    err('sonar.projectKey not found in sonar-project.properties.');
    process.exit(1);
  }
  return match[1].trim();
}

// --- CLI argument parsing ---
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    severity: null,
    status: 'OPEN,CONFIRMED,REOPENED',
    branch: null,
    skipHotspots: false,
    skipIssues: false,
    output: 'sonarqube-report.md',
    help: false,
  };

  for (const arg of args) {
    if (arg === '-h' || arg === '--help') {
      opts.help = true;
    } else if (arg === '--skip-hotspots') {
      opts.skipHotspots = true;
    } else if (arg === '--skip-issues') {
      opts.skipIssues = true;
    } else if (arg.startsWith('--severity=')) {
      opts.severity = arg.split('=')[1];
    } else if (arg.startsWith('--status=')) {
      opts.status = arg.split('=')[1];
    } else if (arg.startsWith('--branch=')) {
      opts.branch = arg.split('=')[1];
    } else if (arg.startsWith('--output=') || arg.startsWith('-o=')) {
      opts.output = arg.split('=').slice(1).join('=');
    } else if (arg === '-o') {
      const idx = args.indexOf(arg);
      if (idx + 1 < args.length) opts.output = args[idx + 1];
    }
  }
  return opts;
}

function printHelp() {
  log(`
${c.bold}SonarQube Report Fetcher${c.reset}

Fetches issues from SonarQube and generates a markdown report.

${c.bold}Usage:${c.reset}
  node scripts/fetch-sonar-issues.cjs [options]
  npm run sonar:report -- [options]

${c.bold}Options:${c.reset}
  --severity=LIST       Filter by severity (e.g. CRITICAL,BLOCKER)
  --status=LIST         Issue status filter (default: OPEN,CONFIRMED,REOPENED)
  --branch=NAME         Filter by branch
  --skip-hotspots       Skip fetching security hotspots
  --skip-issues         Skip fetching issues (bugs, vulns, smells)
  -o, --output=PATH     Output file (default: sonarqube-report.md)
  -h, --help            Show this help

${c.bold}Environment:${c.reset}
  SONAR_HOST_URL        SonarQube server URL (required)
  SONAR_TOKEN           SonarQube auth token (required)

  Variables are auto-loaded from .env if present.
`);
}

// --- API helpers ---
function makeAuthHeader(token) {
  return 'Basic ' + Buffer.from(token + ':').toString('base64');
}

async function apiFetch(baseUrl, endpoint, params, token) {
  const url = new URL(endpoint, baseUrl);
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { 'Authorization': makeAuthHeader(token) },
  });
  if (!res.ok) {
    const status = res.status;
    if (status === 401) throw new Error('Authentication failed. Check your SONAR_TOKEN.');
    if (status === 403) throw new Error('Access denied. Token may lack permissions.');
    if (status === 404) throw new Error(`Endpoint not found: ${endpoint}. Check SONAR_HOST_URL.`);
    throw new Error(`API request failed: ${status} ${res.statusText}`);
  }
  return res.json();
}

async function fetchAllIssues(baseUrl, token, projectKey, opts) {
  const issues = [];
  let page = 1;
  const pageSize = 500;

  while (true) {
    const params = {
      componentKeys: projectKey,
      ps: String(pageSize),
      p: String(page),
      statuses: opts.status,
    };
    if (opts.severity) params.severities = opts.severity;
    if (opts.branch) params.branch = opts.branch;

    const data = await apiFetch(baseUrl, '/api/issues/search', params, token);
    for (const issue of data.issues || []) {
      issues.push({
        file: (issue.component || '').replace(/^[^:]+:/, ''),
        line: issue.line || 0,
        type: issue.type || 'UNKNOWN',
        severity: issue.severity || 'UNKNOWN',
        rule: issue.rule || '',
        message: issue.message || '',
        effort: issue.effort || issue.debt || '',
        status: issue.status || '',
      });
    }

    const total = data.paging ? data.paging.total : 0;
    if (page * pageSize >= total) break;
    page++;
  }
  return issues;
}

async function fetchAllHotspots(baseUrl, token, projectKey, opts) {
  const hotspots = [];
  let page = 1;
  const pageSize = 500;

  while (true) {
    const params = {
      projectKey,
      ps: String(pageSize),
      p: String(page),
      status: 'TO_REVIEW',
    };
    if (opts.branch) params.branch = opts.branch;

    const data = await apiFetch(baseUrl, '/api/hotspots/search', params, token);
    for (const hs of data.hotspots || []) {
      hotspots.push({
        file: (hs.component || '').replace(/^[^:]+:/, ''),
        line: hs.line || 0,
        type: 'SECURITY_HOTSPOT',
        severity: hs.vulnerabilityProbability || 'MEDIUM',
        rule: hs.securityCategory || hs.ruleKey || '',
        message: hs.message || '',
        effort: '',
        status: hs.status || '',
      });
    }

    const total = data.paging ? data.paging.total : 0;
    if (page * pageSize >= total) break;
    page++;
  }
  return hotspots;
}

// --- Report generation ---
function countBy(items, key) {
  const counts = {};
  for (const item of items) {
    const val = item[key] || 'UNKNOWN';
    counts[val] = (counts[val] || 0) + 1;
  }
  return counts;
}

function parseEffort(effort) {
  if (!effort) return 0;
  let mins = 0;
  const dMatch = effort.match(/(\d+)d/);
  const hMatch = effort.match(/(\d+)h/);
  const mMatch = effort.match(/(\d+)min/);
  if (dMatch) mins += Number.parseInt(dMatch[1]) * 8 * 60;
  if (hMatch) mins += Number.parseInt(hMatch[1]) * 60;
  if (mMatch) mins += Number.parseInt(mMatch[1]);
  return mins;
}

function formatEffort(totalMins) {
  if (totalMins === 0) return '0min';
  const days = Math.floor(totalMins / (8 * 60));
  const hours = Math.floor((totalMins % (8 * 60)) / 60);
  const mins = totalMins % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (mins) parts.push(`${mins}min`);
  return parts.join(' ');
}

function generateReport(allItems, projectKey, baseUrl, branch) {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const totalEffort = formatEffort(allItems.reduce((s, i) => s + parseEffort(i.effort), 0));
  const typeCounts = countBy(allItems, 'type');
  const sevCounts = countBy(allItems, 'severity');

  let md = `# SonarQube Report\n\n`;
  md += `| Field | Value |\n|-------|-------|\n`;
  md += `| Project | \`${projectKey}\` |\n`;
  md += `| Server | ${baseUrl} |\n`;
  md += `| Date | ${now} |\n`;
  if (branch) md += `| Branch | ${branch} |\n`;
  md += `| Total Issues | ${allItems.length} |\n`;
  md += `| Estimated Effort | ${totalEffort} |\n\n`;

  // Summary by type
  md += `## Summary by Type\n\n| Type | Count |\n|------|-------|\n`;
  for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
    md += `| ${type} | ${count} |\n`;
  }

  // Summary by severity
  md += `\n## Summary by Severity\n\n| Severity | Count |\n|----------|-------|\n`;
  const sevOrder = ['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO', 'HIGH', 'MEDIUM', 'LOW'];
  const sortedSevs = Object.entries(sevCounts).sort((a, b) => {
    const ai = sevOrder.indexOf(a[0]), bi = sevOrder.indexOf(b[0]);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  for (const [sev, count] of sortedSevs) {
    md += `| ${sev} | ${count} |\n`;
  }

  // Group by file
  const byFile = {};
  for (const item of allItems) {
    if (!byFile[item.file]) byFile[item.file] = [];
    byFile[item.file].push(item);
  }

  md += `\n## Issues by File\n`;
  const sortedFiles = Object.keys(byFile).sort();
  for (const file of sortedFiles) {
    const items = byFile[file].sort((a, b) => a.line - b.line);
    md += `\n### \`${file}\`\n\n`;
    md += `| Line | Type | Severity | Rule | Effort | Message |\n`;
    md += `|------|------|----------|------|--------|---------|\n`;
    for (const item of items) {
      const msg = item.message.replaceAll('|', '\\|').replaceAll('\n', ' ');
      md += `| ${item.line} | ${item.type} | ${item.severity} | \`${item.rule}\` | ${item.effort || '-'} | ${msg} |\n`;
    }
  }

  // Footer with fix instructions
  md += `\n---\n\n## Fix Instructions for Claude Code\n\n`;
  md += `Fix issues in this priority order:\n`;
  md += `1. **BLOCKER / CRITICAL** — Must fix. Security vulnerabilities, bugs causing crashes.\n`;
  md += `2. **MAJOR** — Should fix. Bugs, significant code smells.\n`;
  md += `3. **SECURITY_HOTSPOT** — Review and fix if confirmed vulnerable.\n`;
  md += `4. **MINOR / INFO** — Fix if quick, otherwise note for later.\n\n`;
  md += `Type descriptions:\n`;
  md += `- **BUG** — Code that is demonstrably wrong or will cause unexpected behavior.\n`;
  md += `- **VULNERABILITY** — Security flaw that can be exploited.\n`;
  md += `- **CODE_SMELL** — Maintainability issue that makes code harder to understand or change.\n`;
  md += `- **SECURITY_HOTSPOT** — Security-sensitive code that needs manual review.\n`;

  return md;
}

// --- Main ---
async function main() {
  loadEnv();
  const opts = parseArgs();

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  const baseUrl = process.env.SONAR_HOST_URL;
  const token = process.env.SONAR_TOKEN;

  if (!baseUrl) {
    err('SONAR_HOST_URL is not set. Add it to .env or set it in your environment.');
    process.exit(1);
  }
  if (!token) {
    err('SONAR_TOKEN is not set. Add it to .env or set it in your environment.');
    process.exit(1);
  }

  const projectKey = readProjectKey();
  log(`Fetching SonarQube issues for ${c.bold}${projectKey}${c.reset}`, c.cyan);
  log(`Server: ${baseUrl}`, c.cyan);
  if (opts.branch) log(`Branch: ${opts.branch}`, c.cyan);

  // Fetch issues and hotspots in parallel
  const promises = [];
  if (opts.skipIssues) promises.push(Promise.resolve([]));
  else promises.push(fetchAllIssues(baseUrl, token, projectKey, opts).catch(e => { throw e; }));

  if (opts.skipHotspots) {
    promises.push(Promise.resolve([]));
  } else {
    promises.push(
      fetchAllHotspots(baseUrl, token, projectKey, opts).catch(e => {
        warn(`Failed to fetch hotspots: ${e.message}. Continuing with issues only.`);
        return [];
      })
    );
  }

  const [issues, hotspots] = await Promise.all(promises);
  const allItems = [...issues, ...hotspots];

  log(`Found ${c.bold}${issues.length}${c.reset} issues and ${c.bold}${hotspots.length}${c.reset} hotspots.`, c.green);

  const report = generateReport(allItems, projectKey, baseUrl, opts.branch);
  const outPath = path.resolve(opts.output);
  fs.writeFileSync(outPath, report, 'utf-8');
  log(`Report written to ${c.bold}${outPath}${c.reset}`, c.green);
}

main().catch(e => {
  err(e.message);
  process.exit(1);
});
