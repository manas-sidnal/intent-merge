import * as vscode from "vscode";
import { ResolutionResult } from "../types";

type Callbacks = {
  onApplyMerge: (mergedCode: string, conflictIndex: number) => void;
  onUndoMerge: (conflictIndex: number) => void;
  onRaisePR: (mergedCode: string, conflictIndex: number) => void;
  onResolveAgain: (conflictIndex: number) => void;
};

export function showPanel(context: vscode.ExtensionContext, callbacks: Callbacks) {
  const panel = vscode.window.createWebviewPanel(
    "intentMerge",
    "Intent Merge",
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  panel.webview.html = getHtml();

  panel.webview.onDidReceiveMessage((msg) => {
    switch (msg.command) {
      case "applyMerge":   callbacks.onApplyMerge(msg.mergedCode, msg.conflictIndex); break;
      case "undoMerge":    callbacks.onUndoMerge(msg.conflictIndex); break;
      case "raisePR":      callbacks.onRaisePR(msg.mergedCode, msg.conflictIndex); break;
      case "resolveAgain": callbacks.onResolveAgain(msg.conflictIndex); break;
    }
  });

  return {
    update(results: (ResolutionResult & { issues: string[]; _current: string; _incoming: string })[]) {
      panel.webview.postMessage({ command: "update", results });
    },
  };
}

function getHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Intent Merge</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0d0e14; --surface: #13151f; --surface2: #1a1d2a;
      --border: #252837; --border-bright: #353850;
      --text: #c8cad8; --text-bright: #f0f2ff; --text-muted: #666a85;
      --accent: #7c6ff7; --accent-glow: rgba(124,111,247,0.25); --accent2: #5b8af5;
      --accent-grad: linear-gradient(135deg, #7c6ff7 0%, #5b8af5 100%);
      --green: #3dd68c; --green-dim: rgba(61,214,140,0.12);
      --amber: #f5a623; --amber-dim: rgba(245,166,35,0.12);
      --red: #f55f5f;
      --diff-curr-bg: rgba(91,138,245,0.08); --diff-curr-bd: rgba(91,138,245,0.35);
      --diff-inc-bg: rgba(61,214,140,0.08);  --diff-inc-bd: rgba(61,214,140,0.35);
      --radius: 8px; --radius-sm: 5px;
      --font: 'Inter', system-ui, sans-serif; --mono: 'JetBrains Mono', monospace;
    }
    html { background: var(--bg); }
    body { background: var(--bg); color: var(--text); font-family: var(--font); font-size: 13px; line-height: 1.6; padding-bottom: 40px; }

    /* Header */
    .header { position: sticky; top: 0; z-index: 100; background: rgba(13,14,20,0.92); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; }
    .logo { display: flex; align-items: center; gap: 10px; }
    .logo-icon { width: 28px; height: 28px; border-radius: 7px; background: var(--accent-grad); display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 0 16px var(--accent-glow); }
    .logo-text { font-size: 14px; font-weight: 700; color: var(--text-bright); }
    .logo-sub { font-size: 10px; font-weight: 500; color: var(--text-muted); letter-spacing: 0.8px; text-transform: uppercase; }
    .header-badge { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 20px; background: var(--accent-grad); color: white; letter-spacing: 0.5px; text-transform: uppercase; }

    .content { padding: 20px; }

    /* Loading */
    .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; gap: 16px; animation: fadeIn 0.4s ease; }
    .loading-state.hidden { display: none; }
    .spinner-ring { width: 44px; height: 44px; border-radius: 50%; border: 3px solid var(--border); border-top-color: var(--accent); animation: spin 0.9s linear infinite; }
    .loading-text { color: var(--text-muted); font-size: 13px; }
    .loading-steps { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
    .step { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-muted); transition: color 0.3s; }
    .step.active { color: var(--text); }
    .step.done   { color: var(--green); }
    .step-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border-bright); flex-shrink: 0; transition: background 0.3s; }
    .step.active .step-dot { background: var(--accent); animation: pulse-dot 1s infinite; }
    .step.done   .step-dot { background: var(--green); }

    /* Results */
    .results-state { display: none; animation: fadeIn 0.5s ease; }
    .results-state.visible { display: block; }

    /* Summary bar */
    .summary-bar { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 16px; flex-wrap: wrap; }
    .summary-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; }
    .summary-count { font-size: 12px; font-weight: 700; color: var(--text-bright); }
    .divider-dot { color: var(--border-bright); }

    /* Card */
    .conflict-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 16px; overflow: hidden; animation: slideUp 0.4s ease both; }

    /* Card header */
    .card-header { padding: 12px 16px; background: var(--surface2); border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .conflict-num { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; }

    /* Type badge */
    .type-badge { font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; padding: 3px 8px; border-radius: 20px; }
    .type-badge.logic      { background: rgba(124,111,247,0.18); color: #a99fff; border: 1px solid rgba(124,111,247,0.3); }
    .type-badge.import     { background: rgba(91,138,245,0.18);  color: #8ab4ff; border: 1px solid rgba(91,138,245,0.3);  }
    .type-badge.formatting { background: rgba(245,166,35,0.15);  color: #f5c842; border: 1px solid rgba(245,166,35,0.3);  }
    .type-badge.dependency { background: rgba(245,95,95,0.15);   color: #ff9595; border: 1px solid rgba(245,95,95,0.3);   }

    /* Confidence */
    .confidence-wrap { margin-left: auto; display: flex; align-items: center; gap: 8px; }
    .confidence-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.6px; font-weight: 600; }
    .confidence-track { width: 70px; height: 5px; border-radius: 10px; background: var(--border); overflow: hidden; }
    .confidence-fill { height: 100%; border-radius: 10px; transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }
    .confidence-fill.high   { background: var(--green); }
    .confidence-fill.medium { background: var(--amber); }
    .confidence-fill.low    { background: var(--red); }
    .confidence-pct { font-size: 11px; font-weight: 600; min-width: 28px; text-align: right; }
    .confidence-pct.high   { color: var(--green); }
    .confidence-pct.medium { color: var(--amber); }
    .confidence-pct.low    { color: var(--red); }

    /* Card body */
    .card-body { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
    .block-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.9px; color: var(--text-muted); margin-bottom: 8px; }

    /* Diff panels */
    .diff-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .diff-panel { border-radius: var(--radius-sm); overflow: hidden; border: 1px solid; }
    .diff-panel.current  { background: var(--diff-curr-bg); border-color: var(--diff-curr-bd); }
    .diff-panel.incoming { background: var(--diff-inc-bg);  border-color: var(--diff-inc-bd); }
    .diff-panel-header { padding: 6px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; display: flex; align-items: center; gap: 6px; }
    .diff-panel.current  .diff-panel-header { color: #8ab4ff; border-bottom: 1px solid var(--diff-curr-bd); }
    .diff-panel.incoming .diff-panel-header { color: #6ddba6; border-bottom: 1px solid var(--diff-inc-bd); }
    .diff-dot { width: 7px; height: 7px; border-radius: 50%; }
    .diff-panel.current  .diff-dot { background: #5b8af5; }
    .diff-panel.incoming .diff-dot { background: var(--green); }
    .diff-desc { font-size: 11px; padding: 6px 10px; color: var(--text-muted); font-style: italic; border-bottom: 1px solid; line-height: 1.5; }
    .diff-panel.current  .diff-desc { border-color: var(--diff-curr-bd); }
    .diff-panel.incoming .diff-desc { border-color: var(--diff-inc-bd); }
    .diff-code { font-family: var(--mono); font-size: 11.5px; padding: 10px; white-space: pre-wrap; word-break: break-all; color: var(--text); line-height: 1.65; }

    /* Merged code */
    .merged-block { border-radius: var(--radius-sm); border: 1px solid var(--border-bright); overflow: hidden; background: #0a0b10; }
    .merged-header { padding: 7px 12px; background: var(--surface2); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
    .merged-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--green); }
    .copy-btn { all: unset; font-size: 10px; color: var(--text-muted); cursor: pointer; padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border); transition: color 0.2s, border-color 0.2s; }
    .copy-btn:hover { color: var(--text-bright); border-color: var(--border-bright); }
    .copy-btn.copied { color: var(--green); border-color: var(--green); }
    .merged-code { font-family: var(--mono); font-size: 11.5px; padding: 14px; white-space: pre-wrap; word-break: break-all; color: #c8ffdc; line-height: 1.7; }

    /* Reasoning */
    .reasoning-block { background: rgba(124,111,247,0.07); border: 1px solid rgba(124,111,247,0.2); border-left: 3px solid var(--accent); border-radius: var(--radius-sm); padding: 12px 14px; }
    .reasoning-text { color: var(--text); font-size: 12.5px; line-height: 1.7; }

    /* Warnings */
    .warning-item { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--amber); background: var(--amber-dim); border: 1px solid rgba(245,166,35,0.25); border-radius: var(--radius-sm); padding: 7px 10px; }

    /* ── Decision Layer ── */
    .decision-layer { padding: 14px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .decision-layer.risk-low    { background: linear-gradient(90deg, rgba(61,214,140,0.08) 0%, transparent 100%); border-left: 3px solid var(--green); }
    .decision-layer.risk-medium { background: linear-gradient(90deg, rgba(245,166,35,0.08) 0%, transparent 100%); border-left: 3px solid var(--amber); }
    .decision-layer.risk-high   { background: linear-gradient(90deg, rgba(245,95,95,0.10) 0%, transparent 100%);  border-left: 3px solid var(--red); }
    .decision-left { display: flex; flex-direction: column; gap: 4px; }
    .decision-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .decision-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); }
    .decision-action { font-size: 13px; font-weight: 600; color: var(--text-bright); }
    .risk-badge { font-size: 10px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; }
    .risk-badge.risk-low    { background: var(--green-dim); color: var(--green); border: 1px solid rgba(61,214,140,0.3); }
    .risk-badge.risk-medium { background: var(--amber-dim); color: var(--amber); border: 1px solid rgba(245,166,35,0.3); }
    .risk-badge.risk-high   { background: rgba(245,95,95,0.12); color: var(--red); border: 1px solid rgba(245,95,95,0.35); }
    .decision-confidence { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
    .decision-conf-label { font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; }
    .decision-conf-value { font-size: 16px; font-weight: 700; }
    .decision-conf-value.high   { color: var(--green); }
    .decision-conf-value.medium { color: var(--amber); }
    .decision-conf-value.low    { color: var(--red); }

    /* Card footer — button area */
    .card-footer { padding: 12px 16px; border-top: 1px solid var(--border); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .footer-right { margin-left: auto; }

    /* Buttons */
    .btn { all: unset; display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; border-radius: var(--radius-sm); font-family: var(--font); font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s; }
    .btn:hover { transform: translateY(-1px); }
    .btn:active { transform: translateY(0); }
    .btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none !important; }

    .btn-primary { background: var(--accent-grad); color: white; box-shadow: 0 0 20px var(--accent-glow); }
    .btn-primary:hover { box-shadow: 0 0 28px var(--accent-glow); }

    .btn-secondary { background: var(--surface2); color: var(--text); border: 1px solid var(--border-bright); }
    .btn-secondary:hover { border-color: var(--accent); color: var(--text-bright); }

    .btn-success { background: linear-gradient(135deg, var(--green) 0%, #2aad6e 100%); color: white; box-shadow: 0 0 16px rgba(61,214,140,0.2); }
    .btn-danger  { background: rgba(245,95,95,0.15); color: #ff9595; border: 1px solid rgba(245,95,95,0.3); }
    .btn-danger:hover { background: rgba(245,95,95,0.25); }
    .btn-ghost   { background: transparent; color: var(--accent); border: 1px solid rgba(124,111,247,0.35); }
    .btn-ghost:hover { background: rgba(124,111,247,0.1); }

    .btn-spinner { width: 13px; height: 13px; border: 2px solid rgba(255,255,255,0.25); border-top-color: white; border-radius: 50%; animation: spin 0.75s linear infinite; display: none; }
    .btn.loading .btn-spinner { display: block; }
    .btn.loading .btn-label   { display: none; }

    @keyframes spin    { to { transform: rotate(360deg); } }
    @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <div class="logo-icon">⚡</div>
      <div>
        <div class="logo-text">Intent Merge</div>
        <div class="logo-sub">AI Conflict Resolution</div>
      </div>
    </div>
    <span class="header-badge">Groq · Llama 3.1</span>
  </div>

  <div class="content">
    <div class="loading-state" id="loading">
      <div class="spinner-ring"></div>
      <div class="loading-text">Analyzing conflicts with AI...</div>
      <div class="loading-steps">
        <div class="step active" id="step-parse"><div class="step-dot"></div>Parsing conflict markers</div>
        <div class="step" id="step-classify"><div class="step-dot"></div>Classifying conflict types</div>
        <div class="step" id="step-resolve"><div class="step-dot"></div>Resolving with Llama 3.1</div>
        <div class="step" id="step-validate"><div class="step-dot"></div>Validating output</div>
      </div>
    </div>
    <div class="results-state" id="results"></div>
  </div>

  <script>
    const vscodeApi = acquireVsCodeApi();
    const steps = ['step-parse','step-classify','step-resolve','step-validate'];
    let stepIdx = 0;
    const stepTimer = setInterval(() => {
      if (stepIdx > 0) document.getElementById(steps[stepIdx-1]).className = 'step done';
      if (stepIdx < steps.length) { document.getElementById(steps[stepIdx]).className = 'step active'; stepIdx++; }
      else clearInterval(stepTimer);
    }, 600);

    function esc(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function confClass(v) { return v >= 0.8 ? 'high' : v >= 0.5 ? 'medium' : 'low'; }

    let allResults = [];

    // Per-card state machine: 'idle' | 'applied' | 'undone'
    const cardState = {};

    function renderCard(r, i) {
      const pct = Math.round(r.confidence * 100);
      const cls = confClass(r.confidence);
      const issues = r.issues || [];

      const warningsHtml = issues.map(w =>
        '<div class="warning-item"><span>⚠</span>' + esc(w) + '</div>'
      ).join('');

      return \`
        <div class="conflict-card" id="card-\${i}">
          <div class="card-header">
            <span class="conflict-num">Conflict #\${i+1}</span>
            <span class="type-badge \${r.type}">\${r.type}</span>
            <div class="confidence-wrap">
              <span class="confidence-label">Confidence</span>
              <div class="confidence-track"><div class="confidence-fill \${cls}" style="width:\${pct}%"></div></div>
              <span class="confidence-pct \${cls}">\${pct}%</span>
            </div>
          </div>

          <div class="decision-layer risk-\${r._risk || 'medium'}">
            <div class="decision-left">
              <span class="decision-label">✦ Recommended Action</span>
              <span class="decision-action">\${esc(r._recommendedAction || 'Review and apply')}</span>
            </div>
            <div class="decision-right">
              <span class="risk-badge risk-\${r._risk || 'medium'}">\${(r._risk || 'medium').toUpperCase()} RISK</span>
              <div class="decision-confidence">
                <span class="decision-conf-label">AI Confidence</span>
                <span class="decision-conf-value \${cls}">\${pct}%</span>
              </div>
            </div>
          </div>

          <div class="card-body">
            <!-- 1. CONFLICT DIFF with per-side descriptions -->
            <div>
              <div class="block-label">Conflict Diff</div>
              <div class="diff-grid">
                <div class="diff-panel current">
                  <div class="diff-panel-header"><div class="diff-dot"></div> Current (HEAD)</div>
                  <div class="diff-desc">\${esc(r.currentDescription)}</div>
                  <pre class="diff-code">\${esc(r._current || '')}</pre>
                </div>
                <div class="diff-panel incoming">
                  <div class="diff-panel-header"><div class="diff-dot"></div> Incoming</div>
                  <div class="diff-desc">\${esc(r.incomingDescription)}</div>
                  <pre class="diff-code">\${esc(r._incoming || '')}</pre>
                </div>
              </div>
            </div>

            <!-- 2. MERGED RESOLUTION -->
            <div class="merged-block">
              <div class="merged-header">
                <span class="merged-title">✦ Merged Resolution</span>
                <button class="copy-btn" onclick="copyCode(\${i})">Copy</button>
              </div>
              <pre class="merged-code" id="merged-code-\${i}">\${esc(r.mergedCode)}</pre>
            </div>

            <!-- 3. WHY THIS MERGED RESOLUTION -->
            <div class="reasoning-block">
              <div class="block-label" style="margin-bottom:6px">Why this merged resolution</div>
              <div class="reasoning-text">\${esc(r.reasoning)}</div>
            </div>

            \${warningsHtml}
          </div>

          <!-- Footer with button state machine -->
          <div class="card-footer" id="footer-\${i}">
            \${renderFooter(i, 'idle')}
          </div>
        </div>
      \`;
    }

    function renderFooter(i, state) {
      if (state === 'idle') {
        return \`
          <button class="btn btn-primary" id="apply-btn-\${i}" onclick="applyMerge(\${i})">
            <span class="btn-spinner"></span>
            <span class="btn-label">⚡ Apply Merge</span>
          </button>
          <button class="btn btn-secondary" onclick="raisePR(\${i})">↗ Apply and Raise PR</button>
        \`;
      }
      if (state === 'applied') {
        return \`
          <button class="btn btn-success" disabled>✓ Merge Applied</button>
          <button class="btn btn-danger" onclick="undoMerge(\${i})">↩ Undo Merge</button>
        \`;
      }
      if (state === 'undone') {
        return \`
          <button class="btn btn-primary" id="apply-btn-\${i}" onclick="applyMerge(\${i})">
            <span class="btn-spinner"></span>
            <span class="btn-label">⚡ Apply Merge</span>
          </button>
          <button class="btn btn-secondary" onclick="raisePR(\${i})">↗ Apply and Raise PR</button>
          <button class="btn btn-ghost footer-right" onclick="resolveAgain(\${i})">↺ Resolve Again</button>
        \`;
      }
      return '';
    }

    function setFooterState(i, state) {
      cardState[i] = state;
      document.getElementById('footer-' + i).innerHTML = renderFooter(i, state);
    }

    function copyCode(i) {
      const code = allResults[i]?.mergedCode || '';
      navigator.clipboard?.writeText(code).catch(() => {});
      const btn = document.querySelector('#card-' + i + ' .copy-btn');
      btn.textContent = 'Copied!'; btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1800);
    }

    function applyMerge(i) {
      const result = allResults[i];
      if (!result) return;
      const btn = document.getElementById('apply-btn-' + i);
      if (btn) { btn.disabled = true; btn.classList.add('loading'); }
      vscodeApi.postMessage({ command: 'applyMerge', mergedCode: result.mergedCode, conflictIndex: i });
      setTimeout(() => setFooterState(i, 'applied'), 700);
    }

    function undoMerge(i) {
      vscodeApi.postMessage({ command: 'undoMerge', conflictIndex: i });
      setFooterState(i, 'undone');
    }

    function raisePR(i) {
      const result = allResults[i];
      if (!result) return;
      const btn = document.querySelector('#footer-' + i + ' .btn-secondary');
      if (btn) { btn.disabled = true; btn.textContent = 'Raising PR...'; }
      vscodeApi.postMessage({ command: 'raisePR', mergedCode: result.mergedCode, conflictIndex: i });
      setTimeout(() => setFooterState(i, 'applied'), 700);
    }

    function resolveAgain(i) {
      vscodeApi.postMessage({ command: 'resolveAgain', conflictIndex: i });
      // Re-show loading state for this card's body only (simplified: just signal extension)
    }

    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.command === 'update') {
        clearInterval(stepTimer);
        allResults = msg.results;
        steps.forEach(id => document.getElementById(id).className = 'step done');

        setTimeout(() => {
          document.getElementById('loading').classList.add('hidden');
          const resultsEl = document.getElementById('results');
          resultsEl.classList.add('visible');

          resultsEl.innerHTML =
            \`<div class="summary-bar">
              <span class="summary-label">Results</span>
              <span class="summary-count">\${msg.results.length} conflict\${msg.results.length !== 1 ? 's' : ''} resolved</span>
              <span class="divider-dot">·</span>
              <span class="summary-label">Powered by Groq + Llama 3.1</span>
            </div>\` +
            msg.results.map((r, i) => renderCard(r, i)).join('');
        }, 400);
      }
    });
  </script>
</body>
</html>`;
}