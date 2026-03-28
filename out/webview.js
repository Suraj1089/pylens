"use strict";
// ─────────────────────────────────────────────────────────────────────────────
// Webview — HTML builders for loading spinner, results table, and sidebar
// ─────────────────────────────────────────────────────────────────────────────
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.escHtml = escHtml;
exports.buildLoadingHtml = buildLoadingHtml;
exports.buildWebviewHtml = buildWebviewHtml;
exports.buildSidebarHtml = buildSidebarHtml;
const vscode = __importStar(require("vscode"));
// ── HTML Helpers ─────────────────────────────────────────────────────────────
function escHtml(s) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
function kindLabel(kind) {
    if (kind === "dev") {
        return `<span class="kind kind--dev">dev</span>`;
    }
    if (kind === "optional") {
        return `<span class="kind kind--opt">optional</span>`;
    }
    if (kind === "transitive") {
        return `<span class="kind kind--trans">transitive</span>`;
    }
    return "";
}
function brandLogoSvg(size, className = "") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128" fill="none" class="${className}">
  <defs>
    <linearGradient id="plHandle" x1="76" y1="74" x2="112" y2="118" gradientUnits="userSpaceOnUse">
      <stop stop-color="#6F59FF"/>
      <stop offset="1" stop-color="#4E3BDA"/>
    </linearGradient>
    <linearGradient id="plBorder" x1="8" y1="8" x2="120" y2="120" gradientUnits="userSpaceOnUse">
      <stop stop-color="#5B4DFF"/>
      <stop offset="1" stop-color="#4738D3"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="126" height="126" rx="30" fill="#0E1120" stroke="url(#plBorder)" stroke-width="2"/>
  <circle cx="58" cy="58" r="36" fill="none" stroke="#5B4DFF" stroke-width="10"/>
  <circle cx="58" cy="58" r="22" fill="#1A1E32"/>
  <path d="M80 82L101 103" stroke="url(#plHandle)" stroke-width="10" stroke-linecap="round"/>
  <path d="M94 96L107 109" stroke="#5A46E2" stroke-width="4" stroke-linecap="round"/>
  <rect x="45.5" y="52" width="25" height="6" rx="3" fill="#60D8A8"/>
  <rect x="45.5" y="61" width="20" height="5" rx="2.5" fill="#5F8DFF"/>
  <rect x="45.5" y="69" width="15" height="4" rx="2" fill="#6F59FF"/>
  <path d="M58 42L61 48H68L62.4 51.8L64.8 58L58 54.2L51.2 58L53.6 51.8L48 48H55L58 42Z" fill="#F6B740"/>
</svg>`;
}
// ── Loading HTML ─────────────────────────────────────────────────────────────
function buildLoadingHtml(total, format) {
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  :root {
    --pl-accent: var(--vscode-button-background, #0078d4);
    --pl-accent-strong: var(--vscode-button-hoverBackground, #106ebe);
    --pl-bg: var(--vscode-editor-background);
    --pl-fg: var(--vscode-foreground);
    --pl-muted: var(--vscode-descriptionForeground);
    --pl-border: var(--vscode-panel-border, rgba(128,128,128,0.28));
    --pl-surface: var(--vscode-editor-inactiveSelectionBackground, rgba(128,128,128,0.09));
  }
  * { box-sizing: border-box; }
  body {
    font-family: var(--vscode-font-family,'Segoe UI',sans-serif);
    background: radial-gradient(circle at top, rgba(65, 138, 209, 0.08), transparent 46%), var(--pl-bg);
    color: var(--pl-fg);
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    padding: 20px;
  }
  .loading-card {
    width: min(420px, 95vw);
    border-radius: 14px;
    border: 1px solid var(--pl-border);
    background: var(--pl-surface);
    padding: 22px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    text-align: center;
    box-shadow: 0 16px 30px rgba(0,0,0,0.2);
  }
  .spinner-container { position: relative; width: 56px; height: 56px; }
  .spinner {
    width: 56px; height: 56px;
    border: 3px solid rgba(128,128,128,0.15);
    border-top-color: var(--pl-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  .spinner-icon {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%,-50%);
    width: 22px; height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  h3 { font-size: 17px; font-weight: 700; margin: 0; letter-spacing: -0.01em; }
  p  { font-size: 12px; color: var(--pl-muted); margin: 0; }
  .progress-bar {
    width: 100%; max-width: 260px; height: 6px; border-radius: 8px;
    background: rgba(128,128,128,0.2); overflow: hidden;
  }
  .progress-fill {
    height: 100%; width: 0%;
    background: linear-gradient(90deg, var(--pl-accent), var(--pl-accent-strong));
    transition: width 0.3s ease;
    border-radius: 8px;
  }
  #pkg-name {
    font-size: 12px; color: var(--pl-muted);
    font-family: var(--vscode-editor-font-family, monospace);
    min-height: 16px;
  }
</style>
</head>
<body>
  <div class="loading-card">
    <div class="spinner-container">
      <div class="spinner"></div>
      <span class="spinner-icon">${brandLogoSvg(22)}</span>
    </div>
    <h3>Fetching PyPI versions…</h3>
    <p>${total} packages &nbsp;·&nbsp; ${escHtml(format)}</p>
    <div class="progress-bar"><div class="progress-fill" id="progress"></div></div>
    <div id="pkg-name"></div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    window.addEventListener('message', e => {
      const msg = e.data;
      if (msg.type === 'progress') {
        const pct = Math.round((msg.completed / msg.total) * 100);
        document.getElementById('progress').style.width = pct + '%';
        document.getElementById('pkg-name').textContent = msg.current || '';
      }
    });
  </script>
</body>
</html>`;
}
// ── Results Webview HTML ─────────────────────────────────────────────────────
function buildWebviewHtml(packages, file) {
    const total = packages.length;
    const outdated = packages.filter((p) => p.status === "outdated").length;
    const upToDate = packages.filter((p) => p.status === "up-to-date").length;
    const unpinned = packages.filter((p) => p.status === "unpinned").length;
    const errors = packages.filter((p) => p.status === "error").length;
    const relPath = vscode.workspace.asRelativePath(file.uri);
    const detailPayload = JSON.stringify(packages.map((pkg) => ({
        name: pkg.name,
        version: pkg.version,
        rawSpec: pkg.rawSpec,
        latest: pkg.latest,
        status: pkg.status,
        kind: pkg.kind,
        pypiUrl: pkg.pypiUrl,
        license: pkg.license,
        maintenance: pkg.maintenance,
        latestReleaseDate: pkg.latestReleaseDate,
        vulnerabilities: pkg.vulnerabilities,
        canUpdate: pkg.status === "outdated" && !!pkg.version && !!pkg.latest,
    }))).replace(/</g, "\\u003c");
    const healthPct = total > 0 ? Math.round((upToDate / total) * 100) : 100;
    const rows = packages
        .map((pkg, idx) => {
        const badge = pkg.status === "up-to-date"
            ? `<span class="badge ok">✓ Up to date</span>`
            : pkg.status === "outdated"
                ? `<span class="badge outdated">↑ Outdated</span>`
                : pkg.status === "unpinned"
                    ? `<span class="badge unpinned">~ Unpinned</span>`
                    : pkg.status === "error"
                        ? `<span class="badge error" title="${escHtml(pkg.error ?? "")}">✗ Error</span>`
                        : `<span class="badge unknown">? Unknown</span>`;
        const currentCell = pkg.version
            ? `<code class="ver">${escHtml(pkg.version)}</code>`
            : pkg.rawSpec && pkg.rawSpec !== "*"
                ? `<code class="ver muted">${escHtml(pkg.rawSpec)}</code>`
                : `<span class="muted">—</span>`;
        const latestCell = pkg.latest
            ? `<code class="ver">${escHtml(pkg.latest)}</code>`
            : `<span class="muted">—</span>`;
        const vulnSortValue = !pkg.version
            ? -1
            : pkg.vulnerabilities === null
                ? -1
                : pkg.vulnerabilities.length;
        let vulnerabilityCell = `<span class="muted">—</span>`;
        if (pkg.version) {
            if (pkg.vulnerabilities === null) {
                vulnerabilityCell = `<span class="muted">Unknown</span>`;
            }
            else if (pkg.vulnerabilities.length === 0) {
                vulnerabilityCell = `<span class="vuln-badge vuln-none">✓ None</span>`;
            }
            else {
                const details = pkg.vulnerabilities.map((v) => `${v.id}: ${v.summary}`);
                const tooltip = details.join(" | ");
                const primaryIssue = pkg.vulnerabilities[0]?.id ?? "Known issue";
                const more = pkg.vulnerabilities.length > 1 ? ` +${pkg.vulnerabilities.length - 1}` : "";
                vulnerabilityCell = `<span class="vuln-badge vuln-hit" title="${escHtml(tooltip)}">⚠ ${escHtml(primaryIssue + more)}</span>`;
            }
        }
        const licenseCell = pkg.license
            ? `<span class="chip chip-license">${escHtml(pkg.license)}</span>`
            : `<span class="muted">Unknown</span>`;
        const maintenanceCell = pkg.maintenance === "active"
            ? `<span class="chip chip-maint-ok">Active</span>`
            : pkg.maintenance === "stale"
                ? `<span class="chip chip-maint-stale">Stale 2y+</span>`
                : pkg.maintenance === "unstable"
                    ? `<span class="chip chip-maint-unstable">Unstable 0.x</span>`
                    : `<span class="muted">Unknown</span>`;
        const canUpdate = pkg.status === "outdated" && !!pkg.version && !!pkg.latest;
        const updateCell = canUpdate
            ? `<button class="update-btn" data-name="${escHtml(pkg.name)}" data-latest="${escHtml(pkg.latest ?? "")}" onclick="doUpdate(event, this)">Update</button>`
            : `<span class="muted">—</span>`;
        return `<tr class="row-${pkg.status}" data-vulns="${vulnSortValue}" data-idx="${idx}">
      <td><a class="pkg-link" href="${pkg.pypiUrl}">${escHtml(pkg.name)}</a>${kindLabel(pkg.kind)}</td>
      <td>${currentCell}</td>
      <td>${latestCell}</td>
      <td>${vulnerabilityCell}</td>
      <td>${licenseCell}</td>
      <td>${maintenanceCell}</td>
      <td>${badge}</td>
      <td>${updateCell}</td>
    </tr>`;
    })
        .join("\n");
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>PyLens</title>
<style>
  :root {
    --pl-accent: var(--vscode-button-background, #0078d4);
    --pl-accent-strong: var(--vscode-button-hoverBackground, #106ebe);
    --pl-surface: var(--vscode-editor-inactiveSelectionBackground, rgba(128,128,128,0.09));
    --pl-border: var(--vscode-panel-border, rgba(128,128,128,0.2));
    --pl-muted: var(--vscode-descriptionForeground);
    --pl-ok: #6db96d;
    --pl-warn: #e8c44a;
    --pl-danger: #e05c5c;
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

  body {
    font-family: var(--vscode-font-family,'Segoe UI',sans-serif);
    font-size: 13px;
    background: radial-gradient(circle at top, rgba(65, 138, 209, 0.08), transparent 42%), var(--vscode-editor-background);
    color: var(--vscode-foreground);
    padding: 22px 26px 40px;
    line-height: 1.5;
  }

  /* ── Header ─────────────────────────────── */
  header { margin-bottom: 20px; }

  .header-row {
    display: flex; align-items: center; gap: 10px; margin-bottom: 6px;
  }

  .logo {
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .logo svg { width: 100%; height: 100%; }

  h1 { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }

  .meta {
    font-size: 11px;
    color: var(--pl-muted);
    display: flex; gap: 12px; align-items: center;
  }

  .format-badge {
    font-size: 10px; font-weight: 600;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    padding: 1px 7px; border-radius: 10px;
    text-transform: uppercase; letter-spacing: 0.04em;
  }

  /* ── Health bar ─────────────────────────── */
  .health-section {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 16px; padding: 10px 14px;
    background: var(--pl-surface);
    border-radius: 8px;
    border: 1px solid var(--pl-border);
  }
  .health-bar-wrap {
    flex: 1; height: 8px; border-radius: 4px;
    background: rgba(128,128,128,0.15); overflow: hidden;
  }
  .health-bar-fill {
    height: 100%; border-radius: 4px;
    transition: width 0.6s ease;
    background: ${healthPct >= 80 ? '#6db96d' : healthPct >= 50 ? '#e8c44a' : '#e05c5c'};
  }
  .health-label {
    font-size: 13px; font-weight: 700; white-space: nowrap;
    color: ${healthPct >= 80 ? '#6db96d' : healthPct >= 50 ? '#e8c44a' : '#e05c5c'};
  }
  .health-text {
    font-size: 11px;
    color: var(--pl-muted);
    white-space: nowrap;
  }

  /* ── Stats ──────────────────────────────── */
  .stats {
    display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap;
  }

  .stat {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 14px; border-radius: 6px;
    background: var(--pl-surface);
    border: 1px solid var(--pl-border);
    font-size: 12px;
    transition: transform 0.1s;
  }
  .stat:hover { transform: translateY(-1px); }

  .stat-n { font-weight: 700; font-size: 16px; }
  .stat-outdated .stat-n { color: #e8944a; }
  .stat-ok       .stat-n { color: #6db96d; }
  .stat-error    .stat-n { color: #e05c5c; }

  /* ── Search / filter ────────────────────── */
  .toolbar {
    display: flex; gap: 8px; margin-bottom: 14px; align-items: center; flex-wrap: wrap;
  }

  .search-box {
    flex: 1; min-width: 180px; max-width: 320px;
    padding: 6px 10px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    border-radius: 4px; font-size: 12px; outline: none;
    transition: border-color 0.15s;
  }
  .search-box:focus { border-color: var(--vscode-focusBorder); }

  .filter-btn {
    padding: 5px 12px; border-radius: 4px;
    background: var(--vscode-button-secondaryBackground, rgba(255,255,255,0.08));
    color: var(--vscode-button-secondaryForeground, inherit);
    border: 1px solid transparent; cursor: pointer; font-size: 11px;
    transition: all 0.15s;
  }
  .filter-btn:hover {
    background: var(--vscode-button-secondaryHoverBackground);
    transform: translateY(-1px);
  }
  .filter-btn.active {
    background: var(--pl-accent);
    color: var(--vscode-button-foreground, #fff);
  }

  .toolbar-spacer { flex: 1; }

  .export-btn {
    padding: 4px 10px; border-radius: 4px;
    background: transparent;
    color: var(--vscode-textLink-foreground);
    border: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.3));
    cursor: pointer; font-size: 10px; text-transform: uppercase;
    letter-spacing: 0.04em; font-weight: 600;
    transition: all 0.15s;
  }
  .export-btn:hover {
    background: var(--vscode-button-secondaryBackground, rgba(255,255,255,0.08));
    transform: translateY(-1px);
  }

  /* ── Table ──────────────────────────────── */
  .table-wrap {
    border: 1px solid var(--pl-border);
    border-radius: 8px; overflow: hidden;
    background: var(--pl-surface);
  }

  table { width: 100%; border-collapse: collapse; }

  thead tr {
    background: var(--vscode-editor-inactiveSelectionBackground, rgba(128,128,128,0.1));
  }

  th {
    text-align: left;
    padding: 10px 14px;
    font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.07em;
    color: var(--vscode-descriptionForeground);
    border-bottom: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.2));
    cursor: pointer; user-select: none; white-space: nowrap;
    transition: color 0.15s;
  }
  th:hover { color: var(--vscode-foreground); }
  th .sort-icon { margin-left: 4px; opacity: 0.4; font-size: 9px; transition: opacity 0.15s; }
  th.sorted .sort-icon { opacity: 1; }
  th.th-static { cursor: default; }
  th.th-static:hover { color: var(--vscode-descriptionForeground); }

  td {
    padding: 8px 14px;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.08));
    vertical-align: middle;
  }

  tr:last-child td { border-bottom: none; }
  tr { transition: background 0.1s; }
  #tbody tr { cursor: pointer; }
  tr:hover td { background: var(--vscode-list-hoverBackground); }

  tr.row-outdated   td:first-child { border-left: 3px solid #e8944a; }
  tr.row-up-to-date td:first-child { border-left: 3px solid #6db96d; }
  tr.row-error      td:first-child { border-left: 3px solid #e05c5c; }
  tr.row-unpinned   td:first-child,
  tr.row-unknown    td:first-child { border-left: 3px solid rgba(128,128,128,0.4); }

  .pkg-link {
    color: var(--vscode-textLink-foreground);
    text-decoration: none; font-weight: 500;
    transition: opacity 0.15s;
  }
  .pkg-link:hover { text-decoration: underline; opacity: 0.85; }

  code.ver {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 12px;
    background: var(--vscode-textCodeBlock-background, rgba(128,128,128,0.12));
    padding: 1px 6px; border-radius: 3px;
  }

  .muted { color: var(--pl-muted); }

  /* Badges */
  .badge {
    display: inline-flex; align-items: center; gap: 3px;
    padding: 2px 8px; border-radius: 10px;
    font-size: 11px; font-weight: 600; white-space: nowrap;
  }
  .badge.ok       { background: rgba(109,185,109,0.15); color: var(--pl-ok); }
  .badge.outdated { background: rgba(232,148,74,0.15);  color: #e8944a; }
  .badge.error    { background: rgba(224, 92, 92,0.15); color: var(--pl-danger); }
  .badge.unpinned { background: rgba(128,128,160,0.15); color: #9999cc; }
  .badge.unknown  { background: rgba(128,128,160,0.15); color: #9999cc; }

  .vuln-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
  }
  .vuln-none {
    background: rgba(109,185,109,0.12);
    color: var(--pl-ok);
  }
  .vuln-hit {
    background: rgba(224, 92, 92,0.15);
    color: var(--pl-danger);
  }
  .chip {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.01em;
    max-width: 200px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .chip-license {
    background: rgba(102, 155, 255, 0.14);
    color: #8ab4ff;
  }
  .chip-maint-ok {
    background: rgba(109,185,109,0.15);
    color: var(--pl-ok);
  }
  .chip-maint-stale {
    background: rgba(224, 92, 92,0.15);
    color: var(--pl-danger);
  }
  .chip-maint-unstable {
    background: rgba(232,196,74,0.15);
    color: var(--pl-warn);
  }
  .update-btn {
    padding: 4px 10px;
    border-radius: 4px;
    border: 1px solid transparent;
    background: var(--pl-accent);
    color: var(--vscode-button-foreground, #fff);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
  }
  .update-btn:hover {
    background: var(--pl-accent-strong);
  }
  .update-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Kind chips */
  .kind {
    display: inline-block; font-size: 9px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.05em;
    padding: 0px 5px; border-radius: 4px; margin-left: 6px;
    vertical-align: middle;
  }
  .kind--dev   { background: rgba(100,140,200,0.2); color: #7aaddf; }
  .kind--opt   { background: rgba(160,120,200,0.2); color: #c0a0e8; }
  .kind--trans { background: rgba(128,128,128,0.15); color: #999; }

  /* Hidden row (filtered) */
  tr.hidden { display: none; }

  .detail-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.32);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.18s ease;
    z-index: 20;
  }
  .detail-overlay.open {
    opacity: 1;
    pointer-events: auto;
  }

  .detail-panel {
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    width: min(420px, 90vw);
    background: linear-gradient(180deg, rgba(20,24,32,0.98), rgba(12,14,20,0.98));
    color: #e6edf3;
    border-left: 1px solid rgba(255,255,255,0.08);
    box-shadow: -24px 0 42px rgba(0,0,0,0.45);
    transform: translateX(102%);
    transition: transform 0.22s ease;
    z-index: 30;
    overflow-y: auto;
    padding: 18px 18px 24px;
  }
  .detail-panel.open { transform: translateX(0); }
  .detail-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
  }
  .detail-kicker {
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #8ca2b7;
    font-weight: 700;
  }
  .detail-title {
    margin-top: 6px;
    font-size: 30px;
    font-weight: 800;
    line-height: 1.05;
    color: #f7fbff;
  }
  .detail-subtitle {
    margin-top: 6px;
    font-size: 13px;
    color: #9eb4c8;
  }
  .detail-close {
    border: none;
    background: transparent;
    color: #95a7b8;
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 6px;
  }
  .detail-close:hover { background: rgba(255,255,255,0.08); color: #e8f1f9; }
  .detail-section {
    border-top: 1px solid rgba(255,255,255,0.08);
    padding-top: 14px;
    margin-top: 14px;
  }
  .detail-section h3 {
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #8599ad;
    margin-bottom: 10px;
  }
  .vuln-card-side {
    background: linear-gradient(180deg, rgba(119, 25, 30, 0.45), rgba(73, 19, 24, 0.45));
    border: 1px solid rgba(255, 111, 111, 0.26);
    border-radius: 10px;
    padding: 12px;
    margin-bottom: 10px;
  }
  .vuln-id-side {
    font-weight: 700;
    font-size: 15px;
    color: #ffafaf;
    margin-bottom: 6px;
  }
  .vuln-summary-side {
    font-size: 13px;
    line-height: 1.45;
    color: #ffd6d6;
  }
  .vuln-fixed-side {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(255,255,255,0.12);
    font-size: 12px;
    letter-spacing: 0.03em;
    color: #ffb7a9;
    font-weight: 700;
    text-transform: uppercase;
  }
  .impact-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    row-gap: 8px;
    column-gap: 12px;
    font-size: 13px;
    color: #d6e2ee;
  }
  .impact-label { color: #8fa4b8; }
  .impact-value { justify-self: end; font-weight: 600; text-align: right; }
  .detail-update-btn {
    width: 100%;
    margin-top: 16px;
    border: 1px solid rgba(136, 203, 255, 0.46);
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 25px;
    font-weight: 800;
    color: #083354;
    background: linear-gradient(180deg, #9dcfff, #6eb8ff);
    cursor: pointer;
  }
  .detail-update-btn:hover { filter: brightness(1.03); }
  .detail-update-btn:disabled { opacity: 0.65; cursor: not-allowed; }
  .detail-note {
    margin-top: 10px;
    font-size: 11px;
    color: #8599ad;
    line-height: 1.4;
    text-align: center;
  }
  .detail-empty {
    font-size: 13px;
    color: #a6bacd;
    padding: 10px 0;
  }

  /* Footer */
  footer {
    margin-top: 16px;
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    display: flex; justify-content: space-between; align-items: center;
  }
  .footer-actions { display: flex; gap: 8px; }

  /* ── Animations ─────────────────────────── */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .stats, .toolbar, .table-wrap { animation: fadeIn 0.3s ease; }
  .table-wrap { animation-delay: 0.1s; animation-fill-mode: both; }
</style>
</head>
<body>

<header>
  <div class="header-row">
    <span class="logo">${brandLogoSvg(24)}</span>
    <h1>PyLens</h1>
  </div>
  <div class="meta">
    <span class="format-badge">${escHtml(file.format)}</span>
    <span>${escHtml(relPath)}</span>
  </div>
</header>

<div class="health-section">
  <span class="health-text">Health</span>
  <div class="health-bar-wrap">
    <div class="health-bar-fill" style="width: ${healthPct}%"></div>
  </div>
  <span class="health-label">${healthPct}%</span>
</div>

<div class="stats">
  <div class="stat">
    <span class="stat-n">${total}</span> packages
  </div>
  <div class="stat stat-outdated">
    <span class="stat-n">${outdated}</span> outdated
  </div>
  <div class="stat stat-ok">
    <span class="stat-n">${upToDate}</span> up to date
  </div>
  ${unpinned > 0 ? `<div class="stat"><span class="stat-n">${unpinned}</span> unpinned</div>` : ""}
  ${errors > 0 ? `<div class="stat stat-error"><span class="stat-n">${errors}</span> errors</div>` : ""}
</div>

<div class="toolbar">
  <input class="search-box" id="search" type="text" placeholder="Filter packages…" oninput="applyFilters()" />
  <button class="filter-btn active" id="btn-all"        onclick="setFilter('all')">All</button>
  <button class="filter-btn"        id="btn-outdated"   onclick="setFilter('outdated')">Outdated</button>
  <button class="filter-btn"        id="btn-up-to-date" onclick="setFilter('up-to-date')">Up to date</button>
  ${unpinned > 0 ? `<button class="filter-btn" id="btn-unpinned" onclick="setFilter('unpinned')">Unpinned</button>` : ""}
  <span class="toolbar-spacer"></span>
  <button class="export-btn" onclick="doExport('json')">⬇ JSON</button>
  <button class="export-btn" onclick="doExport('csv')">⬇ CSV</button>
</div>

<div class="table-wrap">
  <table id="pkg-table">
    <thead>
      <tr>
        <th onclick="sortBy('name')"    data-col="name">    Package    <span class="sort-icon">⇅</span></th>
        <th onclick="sortBy('current')" data-col="current"> Current    <span class="sort-icon">⇅</span></th>
        <th onclick="sortBy('latest')"  data-col="latest">  Latest     <span class="sort-icon">⇅</span></th>
        <th onclick="sortBy('vulns')"   data-col="vulns">   Vulnerabilities <span class="sort-icon">⇅</span></th>
        <th class="th-static">License</th>
        <th class="th-static">Maintenance</th>
        <th onclick="sortBy('status')"  data-col="status">  Status     <span class="sort-icon">⇅</span></th>
        <th class="th-static">Update</th>
      </tr>
    </thead>
    <tbody id="tbody">
      ${rows}
    </tbody>
  </table>
</div>

<div id="detail-overlay" class="detail-overlay" onclick="closeDetailPanel()"></div>
<aside id="detail-panel" class="detail-panel" aria-hidden="true">
  <div class="detail-top">
    <div>
      <div class="detail-kicker">Library Detail</div>
      <div id="detail-title" class="detail-title">Select a package</div>
      <div id="detail-subtitle" class="detail-subtitle">Click a row to inspect vulnerabilities and impact.</div>
    </div>
    <button class="detail-close" onclick="closeDetailPanel()" aria-label="Close details">×</button>
  </div>

  <div class="detail-section">
    <h3>Vulnerability Report</h3>
    <div id="detail-vulns"></div>
  </div>

  <div class="detail-section">
    <h3>Project Impact</h3>
    <div class="impact-grid">
      <div class="impact-label">Used in</div>
      <div id="impact-file" class="impact-value"></div>
      <div class="impact-label">Dependency type</div>
      <div id="impact-kind" class="impact-value"></div>
      <div class="impact-label">Status</div>
      <div id="impact-status" class="impact-value"></div>
      <div class="impact-label">License</div>
      <div id="impact-license" class="impact-value"></div>
      <div class="impact-label">Maintenance</div>
      <div id="impact-maintenance" class="impact-value"></div>
      <div class="impact-label">Last release</div>
      <div id="impact-release" class="impact-value"></div>
      <div class="impact-label">Latest version</div>
      <div id="impact-latest" class="impact-value"></div>
    </div>
    <button id="detail-update-btn" class="detail-update-btn" onclick="doDetailUpdate()">Safe Update</button>
    <div id="detail-note" class="detail-note"></div>
  </div>
</aside>

<footer>
  <span>Versions from PyPI &nbsp;·&nbsp; Security data from PyPI + OSV &nbsp;·&nbsp; Click package to open on PyPI</span>
  <div class="footer-actions">
    <button class="export-btn" onclick="doRefresh()">↻ Refresh</button>
  </div>
</footer>

<script>
  const vscode = acquireVsCodeApi();
  const packageDetails = ${detailPayload};
  const scannedFilePath = ${JSON.stringify(relPath)};

  let currentFilter = 'all';
  let sortCol = 'status';
  let sortAsc = true;
  let activeDetailIndex = null;

  const statusOrder = { outdated: 0, 'up-to-date': 1, unpinned: 2, error: 3, unknown: 4 };
  const panel = document.getElementById('detail-panel');
  const overlay = document.getElementById('detail-overlay');

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;');
  }

  function dependencyKindLabel(kind) {
    if (kind === 'dev') return 'Dev';
    if (kind === 'optional') return 'Optional';
    if (kind === 'transitive') return 'Transitive';
    return 'Direct';
  }

  function statusLabel(status) {
    if (status === 'up-to-date') return 'Up to date';
    if (status === 'outdated') return 'Outdated';
    if (status === 'unpinned') return 'Unpinned';
    if (status === 'error') return 'Error';
    return 'Unknown';
  }

  function maintenanceLabel(maintenance) {
    if (maintenance === 'active') return 'Active';
    if (maintenance === 'stale') return 'Stale 2y+';
    if (maintenance === 'unstable') return 'Unstable 0.x';
    return 'Unknown';
  }

  function formatDate(isoValue) {
    if (!isoValue) return 'Unknown';
    const date = new Date(isoValue);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleDateString();
  }

  function setFilter(f) {
    currentFilter = f;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('btn-' + f);
    if (btn) btn.classList.add('active');
    applyFilters();
  }

  function applyFilters() {
    const q = document.getElementById('search').value.toLowerCase();
    document.querySelectorAll('#tbody tr').forEach(row => {
      const name = row.querySelector('.pkg-link')?.textContent?.toLowerCase() ?? '';
      const statusClass = [...row.classList].find(c => c.startsWith('row-'))?.replace('row-','') ?? '';
      const matchSearch = name.includes(q);
      const matchFilter = currentFilter === 'all' || statusClass === currentFilter;
      row.classList.toggle('hidden', !(matchSearch && matchFilter));
    });
  }

  function sortBy(col) {
    if (sortCol === col) { sortAsc = !sortAsc; }
    else { sortCol = col; sortAsc = true; }

    document.querySelectorAll('th').forEach(th => {
      th.classList.toggle('sorted', th.dataset.col === col);
    });

    const tbody = document.getElementById('tbody');
    const rows = [...tbody.querySelectorAll('tr')];

    rows.sort((a, b) => {
      let av = '', bv = '';
      if (col === 'name') {
        av = a.querySelector('.pkg-link')?.textContent ?? '';
        bv = b.querySelector('.pkg-link')?.textContent ?? '';
      } else if (col === 'current') {
        av = a.querySelectorAll('td')[1]?.textContent?.trim() ?? '';
        bv = b.querySelectorAll('td')[1]?.textContent?.trim() ?? '';
      } else if (col === 'latest') {
        av = a.querySelectorAll('td')[2]?.textContent?.trim() ?? '';
        bv = b.querySelectorAll('td')[2]?.textContent?.trim() ?? '';
      } else if (col === 'vulns') {
        const avn = Number(a.dataset.vulns ?? -1);
        const bvn = Number(b.dataset.vulns ?? -1);
        return sortAsc ? avn - bvn : bvn - avn;
      } else if (col === 'status') {
        const as = [...a.classList].find(c => c.startsWith('row-'))?.replace('row-','') ?? '';
        const bs = [...b.classList].find(c => c.startsWith('row-'))?.replace('row-','') ?? '';
        av = String(statusOrder[as] ?? 9);
        bv = String(statusOrder[bs] ?? 9);
      }
      const cmp = av.localeCompare(bv, undefined, { numeric: true });
      return sortAsc ? cmp : -cmp;
    });

    rows.forEach(r => tbody.appendChild(r));
  }

  function doExport(format) {
    vscode.postMessage({ type: 'export', format });
  }

  function doRefresh() {
    vscode.postMessage({ type: 'refresh' });
  }

  function sendUpdate(name, latest, button) {
    if (!button || button.disabled) return;
    if (!name || !latest) return;
    button.disabled = true;
    button.textContent = 'Updating...';
    vscode.postMessage({ type: 'update', name, latest });
  }

  function doUpdate(evt, button) {
    if (evt) {
      evt.preventDefault();
      evt.stopPropagation();
    }
    sendUpdate(button?.dataset?.name, button?.dataset?.latest, button);
  }

  function closeDetailPanel() {
    panel.classList.remove('open');
    overlay.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    activeDetailIndex = null;
  }

  function openDetailPanel(index) {
    const pkg = packageDetails[index];
    if (!pkg) return;

    activeDetailIndex = index;
    const currentDisplay = pkg.version || pkg.rawSpec || '—';

    document.getElementById('detail-title').textContent = pkg.name + ' ' + currentDisplay;
    document.getElementById('detail-subtitle').textContent =
      'Latest ' + (pkg.latest || '—') + ' • ' + statusLabel(pkg.status) + ' • ' + maintenanceLabel(pkg.maintenance);
    document.getElementById('impact-file').textContent = scannedFilePath;
    document.getElementById('impact-kind').textContent = dependencyKindLabel(pkg.kind);
    document.getElementById('impact-status').textContent = statusLabel(pkg.status);
    document.getElementById('impact-license').textContent = pkg.license || 'Unknown';
    document.getElementById('impact-maintenance').textContent = maintenanceLabel(pkg.maintenance);
    document.getElementById('impact-release').textContent = formatDate(pkg.latestReleaseDate);
    document.getElementById('impact-latest').textContent = pkg.latest || '—';

    const vulnWrap = document.getElementById('detail-vulns');
    if (!pkg.version) {
      vulnWrap.innerHTML = '<div class="detail-empty">Package is unpinned, so version-specific vulnerability details are unavailable.</div>';
    } else if (pkg.vulnerabilities === null) {
      vulnWrap.innerHTML = '<div class="detail-empty">Vulnerability data is unavailable for this package right now.</div>';
    } else if (pkg.vulnerabilities.length === 0) {
      vulnWrap.innerHTML = '<div class="detail-empty">No known vulnerabilities reported by PyPI or OSV for this version.</div>';
    } else {
      vulnWrap.innerHTML = pkg.vulnerabilities.map((v) => {
        const fixedIn = Array.isArray(v.fixedIn) && v.fixedIn.length > 0
          ? '<div class="vuln-fixed-side">Fixed in version ' + esc(v.fixedIn[0]) + '</div>'
          : '';
        return '<div class="vuln-card-side">' +
          '<div class="vuln-id-side">⚠ ' + esc(v.id) + '</div>' +
          '<div class="vuln-summary-side">' + esc(v.summary) + '</div>' +
          fixedIn +
        '</div>';
      }).join('');
    }

    const updateBtn = document.getElementById('detail-update-btn');
    const note = document.getElementById('detail-note');
    if (pkg.canUpdate) {
      updateBtn.style.display = 'block';
      updateBtn.disabled = false;
      updateBtn.textContent = 'Safe Update to ' + pkg.latest;
      updateBtn.dataset.name = pkg.name;
      updateBtn.dataset.latest = pkg.latest || '';
      const vulnCount = Array.isArray(pkg.vulnerabilities) ? pkg.vulnerabilities.length : 0;
      note.textContent = vulnCount > 0
        ? 'Updating to ' + pkg.latest + ' may resolve known issues in ' + currentDisplay + '.'
        : 'Update available from ' + currentDisplay + ' to ' + pkg.latest + '.';
    } else {
      updateBtn.style.display = 'none';
      note.textContent = 'No safe update action available for this package.';
    }

    panel.classList.add('open');
    overlay.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
  }

  function doDetailUpdate() {
    const button = document.getElementById('detail-update-btn');
    sendUpdate(button?.dataset?.name, button?.dataset?.latest, button);
  }

  document.getElementById('tbody').addEventListener('click', (event) => {
    const target = event.target;
    if (target.closest('a.pkg-link') || target.closest('.update-btn')) {
      return;
    }
    const row = target.closest('tr');
    if (!row) { return; }
    const idx = Number(row.dataset.idx);
    if (Number.isInteger(idx)) {
      openDetailPanel(idx);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && activeDetailIndex !== null) {
      closeDetailPanel();
    }
  });

  // Default sort
  sortBy('status');
</script>
</body>
</html>`;
}
function buildSidebarHtml(stats, isScanning) {
    const baseCss = `
  :root {
    --pl-accent: var(--vscode-button-background, #0078d4);
    --pl-accent-strong: var(--vscode-button-hoverBackground, #106ebe);
    --pl-bg: var(--vscode-sideBar-background, var(--vscode-editor-background));
    --pl-fg: var(--vscode-foreground);
    --pl-muted: var(--vscode-descriptionForeground);
    --pl-border: var(--vscode-panel-border, rgba(128,128,128,0.28));
    --pl-surface: var(--vscode-editor-inactiveSelectionBackground, rgba(128,128,128,0.08));
    --pl-ok: #6db96d;
    --pl-warn: #e8c44a;
    --pl-danger: #e05c5c;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: var(--vscode-font-family,'Segoe UI',sans-serif);
    background: radial-gradient(circle at top, rgba(65, 138, 209, 0.08), transparent 42%), var(--pl-bg);
    color: var(--pl-fg);
    padding: 14px;
    min-height: 100vh;
  }
  .shell {
    border: 1px solid var(--pl-border);
    border-radius: 12px;
    background: var(--pl-surface);
    box-shadow: 0 14px 26px rgba(0,0,0,0.18);
    overflow: hidden;
  }
  .section { padding: 14px; }
  .section + .section { border-top: 1px solid rgba(255,255,255,0.06); }
  .centered {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    min-height: calc(100vh - 28px);
    gap: 10px;
  }
  .kicker {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #8ea5bb;
  }
  .title {
    margin: 0;
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .subtitle {
    margin: 0;
    color: var(--pl-muted);
    font-size: 12px;
    line-height: 1.45;
  }
  .spinner {
    width: 30px;
    height: 30px;
    border: 2px solid rgba(128,128,128,0.24);
    border-top-color: var(--pl-accent);
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .header .icon {
    width: 15px;
    height: 15px;
    display: inline-flex;
  }
  .header .icon svg { width: 100%; height: 100%; }
  .header h2 { margin: 0; font-size: 14px; font-weight: 700; }
  .file-info {
    font-size: 11px;
    color: var(--pl-muted);
    margin-bottom: 12px;
    word-break: break-all;
    line-height: 1.4;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    padding: 2px 7px;
    margin-right: 6px;
    border-radius: 999px;
    font-size: 9px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    font-weight: 700;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
  }
  .health {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 8px;
    background: rgba(128,128,128,0.1);
  }
  .health-label { font-size: 10px; color: var(--pl-muted); }
  .health-bar {
    flex: 1;
    height: 6px;
    border-radius: 6px;
    overflow: hidden;
    background: rgba(128,128,128,0.2);
  }
  .health-fill { height: 100%; }
  .health-value { font-size: 13px; font-weight: 700; }

  .stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .stat {
    padding: 9px 10px;
    border-radius: 8px;
    background: rgba(128,128,128,0.1);
  }
  .stat .n { font-size: 18px; font-weight: 800; line-height: 1; display: block; }
  .stat .l { font-size: 10px; color: var(--pl-muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .stat.outdated .n { color: #e8944a; }
  .stat.ok .n { color: var(--pl-ok); }
  .stat.error .n { color: var(--pl-danger); }
  .stat.unpinned .n { color: #9ca8d1; }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .btn {
    border: 1px solid transparent;
    border-radius: 6px;
    padding: 8px 10px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }
  .btn-primary {
    background: var(--pl-accent);
    color: var(--vscode-button-foreground, #fff);
  }
  .btn-primary:hover { background: var(--pl-accent-strong); }
  .btn-secondary {
    background: var(--vscode-button-secondaryBackground, rgba(255,255,255,0.08));
    color: var(--vscode-button-secondaryForeground, inherit);
    border-color: var(--pl-border);
  }
  .btn-secondary:hover { filter: brightness(1.03); }
  .btn-link {
    background: transparent;
    border-color: var(--pl-border);
    color: var(--vscode-textLink-foreground);
    font-weight: 600;
  }
  .last-scan {
    margin-top: 10px;
    font-size: 10px;
    text-align: center;
    color: var(--pl-muted);
  }`;
    if (isScanning) {
        return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>${baseCss}</style>
</head>
<body>
  <div class="shell centered">
    <div class="spinner"></div>
    <div class="kicker">PyLens</div>
    <p class="title">Scanning Packages…</p>
    <p class="subtitle">Fetching versions and vulnerability metadata from PyPI.</p>
  </div>
</body>
</html>`;
    }
    if (!stats) {
        return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>${baseCss}</style>
</head>
<body>
  <div class="shell centered">
    <span style="display:inline-flex; width:34px; height:34px; opacity:0.95;">${brandLogoSvg(34)}</span>
    <div class="kicker">PyLens</div>
    <p class="title">Dependency Health</p>
    <p class="subtitle">Scan your project files and review outdated packages, vulnerabilities, and update options.</p>
    <div class="actions" style="width:min(240px, 90%); margin-top: 4px;">
      <button class="btn btn-primary" onclick="scan()">Scan Packages</button>
      <button class="btn btn-secondary" onclick="selectFile()">Select File…</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    function scan() { vscode.postMessage({ type: 'scan' }); }
    function selectFile() { vscode.postMessage({ type: 'selectFile' }); }
  </script>
</body>
</html>`;
    }
    // Show stats
    const healthColor = stats.healthPct >= 80 ? "var(--pl-ok)" : stats.healthPct >= 50 ? "var(--pl-warn)" : "var(--pl-danger)";
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
${baseCss}
.health-fill { border-radius: 6px; background: ${healthColor}; }
.health-value { color: ${healthColor}; }
</style>
</head>
<body>
  <div class="shell">
    <div class="section">
      <div class="header">
        <span class="icon">${brandLogoSvg(15)}</span>
        <h2>PyLens</h2>
      </div>

      <div class="file-info">
        <span class="chip">${escHtml(stats.format)}</span>
        ${escHtml(stats.fileName)}
      </div>

      <div class="health">
        <span class="health-label">Health</span>
        <div class="health-bar"><div class="health-fill" style="width:${stats.healthPct}%"></div></div>
        <span class="health-value">${stats.healthPct}%</span>
      </div>
    </div>

    <div class="section">
      <div class="stats">
        <div class="stat">
          <span class="n">${stats.total}</span>
          <span class="l">Total</span>
        </div>
        <div class="stat outdated">
          <span class="n">${stats.outdated}</span>
          <span class="l">Outdated</span>
        </div>
        <div class="stat ok">
          <span class="n">${stats.upToDate}</span>
          <span class="l">Up To Date</span>
        </div>
        <div class="stat ${stats.errors > 0 ? "error" : "unpinned"}">
          <span class="n">${stats.errors > 0 ? stats.errors : stats.unpinned}</span>
          <span class="l">${stats.errors > 0 ? "Errors" : "Unpinned"}</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="actions">
        <button class="btn btn-primary" onclick="openFull()">View Full Report</button>
        <button class="btn btn-secondary" onclick="rescan()">↻ Rescan</button>
        <button class="btn btn-link" onclick="selectFile()">Change File…</button>
      </div>
      ${stats.lastScanned ? `<div class="last-scan">Last scanned: ${escHtml(stats.lastScanned)}</div>` : ""}
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    function openFull()   { vscode.postMessage({ type: 'openFull' }); }
    function rescan()     { vscode.postMessage({ type: 'scan' }); }
    function selectFile() { vscode.postMessage({ type: 'selectFile' }); }
  </script>
</body>
</html>`;
}
//# sourceMappingURL=webview.js.map