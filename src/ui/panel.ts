import * as vscode from "vscode";
import { ResolutionResult } from "../types";

type ApplyMergeCallback = (mergedCode: string, conflictIndex: number) => void;

export function showPanel(
  context: vscode.ExtensionContext,
  onApplyMerge: ApplyMergeCallback
) {
  const panel = vscode.window.createWebviewPanel(
    "intentMerge",
    "Intent Merge",
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
    }
  );

  panel.webview.html = getHtml();

  panel.webview.onDidReceiveMessage((message) => {
    if (message.command === "applyMerge") {
      onApplyMerge(message.mergedCode, message.conflictIndex);
    }
  });

  return {
    update(results: (ResolutionResult & { issues: string[] })[]) {
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
    /* ── Reset & Base ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:           #0d0e14;
      --surface:      #13151f;
      --surface2:     #1a1d2a;
      --border:       #252837;
      --border-bright:#353850;
      --text:         #c8cad8;
      --text-bright:  #f0f2ff;
      --text-muted:   #666a85;

      /* Brand accents */
      --accent:       #7c6ff7;
      --accent-glow:  rgba(124, 111, 247, 0.25);
      --accent2:      #5b8af5;
      --accent-grad:  linear-gradient(135deg, #7c6ff7 0%, #5b8af5 100%);

      /* Semantic */
      --green:        #3dd68c;
      --green-dim:    rgba(61, 214, 140, 0.12);
      --amber:        #f5a623;
      --amber-dim:    rgba(245, 166, 35, 0.12);
      --red:          #f55f5f;
      --red-dim:      rgba(245, 95, 95, 0.12);

      /* Conflict diff colors */
      --diff-current-bg:    rgba(91, 138, 245, 0.08);
      --diff-current-border: rgba(91, 138, 245, 0.35);
      --diff-incoming-bg:   rgba(61, 214, 140, 0.08);
      --diff-incoming-border: rgba(61, 214, 140, 0.35);

      --radius: 8px;
      --radius-sm: 5px;
      --font: 'Inter', system-ui, sans-serif;
      --mono: 'JetBrains Mono', 'Fira Code', monospace;
    }

    html { background: var(--bg); }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      font-size: 13px;
      line-height: 1.6;
      padding: 0 0 40px 0;
      min-height: 100vh;
    }

    /* ── Header ── */
    .header {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(13, 14, 20, 0.92);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      padding: 14px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .logo-icon {
      width: 28px;
      height: 28px;
      border-radius: 7px;
      background: var(--accent-grad);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
      box-shadow: 0 0 16px var(--accent-glow);
    }

    .logo-text {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-bright);
      letter-spacing: 0.2px;
    }

    .logo-sub {
      font-size: 10px;
      font-weight: 500;
      color: var(--text-muted);
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }

    .header-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 20px;
      background: var(--accent-grad);
      color: white;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    /* ── Main content ── */
    .content { padding: 20px; }

    /* ── Loading state ── */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      gap: 16px;
      animation: fadeIn 0.4s ease;
    }

    .loading-state.hidden { display: none; }

    .spinner-ring {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      animation: spin 0.9s linear infinite;
    }

    .loading-text {
      color: var(--text-muted);
      font-size: 13px;
    }

    .loading-steps {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 4px;
    }

    .step {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--text-muted);
      transition: color 0.3s;
    }

    .step.active { color: var(--text); }
    .step.done   { color: var(--green); }

    .step-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--border-bright);
      flex-shrink: 0;
      transition: background 0.3s;
    }

    .step.active .step-dot { background: var(--accent); animation: pulse-dot 1s infinite; }
    .step.done   .step-dot { background: var(--green); }

    /* ── Results state ── */
    .results-state { display: none; animation: fadeIn 0.5s ease; }
    .results-state.visible { display: block; }

    /* ── Summary bar ── */
    .summary-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .summary-label {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      font-weight: 600;
    }

    .summary-count {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-bright);
    }

    .divider-dot { color: var(--border-bright); }

    /* ── Conflict card ── */
    .conflict-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      margin-bottom: 16px;
      overflow: hidden;
      animation: slideUp 0.4s ease both;
    }

    .conflict-card:nth-child(2) { animation-delay: 0.05s; }
    .conflict-card:nth-child(3) { animation-delay: 0.10s; }
    .conflict-card:nth-child(4) { animation-delay: 0.15s; }

    .card-header {
      padding: 12px 16px;
      background: var(--surface2);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .conflict-num {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    /* ── Type badge ── */
    .type-badge {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 20px;
    }

    .type-badge.logic      { background: rgba(124,111,247,0.18); color: #a99fff; border: 1px solid rgba(124,111,247,0.3); }
    .type-badge.import     { background: rgba(91,138,245,0.18);  color: #8ab4ff; border: 1px solid rgba(91,138,245,0.3);  }
    .type-badge.formatting { background: rgba(245,166,35,0.15);  color: #f5c842; border: 1px solid rgba(245,166,35,0.3);  }
    .type-badge.dependency { background: rgba(245,95,95,0.15);   color: #ff9595; border: 1px solid rgba(245,95,95,0.3);   }

    /* ── Confidence bar ── */
    .confidence-wrap {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .confidence-label {
      font-size: 10px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      font-weight: 600;
    }

    .confidence-track {
      width: 70px;
      height: 5px;
      border-radius: 10px;
      background: var(--border);
      overflow: hidden;
    }

    .confidence-fill {
      height: 100%;
      border-radius: 10px;
      transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .confidence-fill.high   { background: var(--green); }
    .confidence-fill.medium { background: var(--amber); }
    .confidence-fill.low    { background: var(--red); }

    .confidence-pct {
      font-size: 11px;
      font-weight: 600;
      min-width: 28px;
      text-align: right;
    }

    .confidence-pct.high   { color: var(--green); }
    .confidence-pct.medium { color: var(--amber); }
    .confidence-pct.low    { color: var(--red); }

    /* ── Card body ── */
    .card-body { padding: 16px; display: flex; flex-direction: column; gap: 14px; }

    /* ── Explanation ── */
    .explanation-block {
      background: rgba(124,111,247,0.07);
      border: 1px solid rgba(124,111,247,0.2);
      border-left: 3px solid var(--accent);
      border-radius: var(--radius-sm);
      padding: 12px 14px;
    }

    .block-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.9px;
      color: var(--text-muted);
      margin-bottom: 6px;
    }

    .explanation-text { color: var(--text); font-size: 12.5px; line-height: 1.7; }

    /* ── Diff view ── */
    .diff-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    @media (max-width: 500px) { .diff-grid { grid-template-columns: 1fr; } }

    .diff-panel {
      border-radius: var(--radius-sm);
      overflow: hidden;
      border: 1px solid;
    }

    .diff-panel.current  { background: var(--diff-current-bg);  border-color: var(--diff-current-border); }
    .diff-panel.incoming { background: var(--diff-incoming-bg);  border-color: var(--diff-incoming-border); }

    .diff-panel-header {
      padding: 6px 10px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .diff-panel.current  .diff-panel-header { color: #8ab4ff; border-bottom: 1px solid var(--diff-current-border); }
    .diff-panel.incoming .diff-panel-header { color: #6ddba6; border-bottom: 1px solid var(--diff-incoming-border); }

    .diff-dot { width: 7px; height: 7px; border-radius: 50%; }
    .diff-panel.current  .diff-dot { background: #5b8af5; }
    .diff-panel.incoming .diff-dot { background: var(--green); }

    .diff-code {
      font-family: var(--mono);
      font-size: 11.5px;
      padding: 10px;
      white-space: pre-wrap;
      word-break: break-all;
      color: var(--text);
      line-height: 1.65;
    }

    /* ── Merged code ── */
    .merged-block {
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-bright);
      overflow: hidden;
      background: #0a0b10;
    }

    .merged-header {
      padding: 7px 12px;
      background: var(--surface2);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .merged-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--green);
    }

    .copy-btn {
      all: unset;
      font-size: 10px;
      color: var(--text-muted);
      cursor: pointer;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid var(--border);
      transition: color 0.2s, border-color 0.2s;
    }

    .copy-btn:hover { color: var(--text-bright); border-color: var(--border-bright); }
    .copy-btn.copied { color: var(--green); border-color: var(--green); }

    .merged-code {
      font-family: var(--mono);
      font-size: 11.5px;
      padding: 14px;
      white-space: pre-wrap;
      word-break: break-all;
      color: #c8ffdc;
      line-height: 1.7;
    }

    /* ── Validation warnings ── */
    .warnings {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .warning-item {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 11.5px;
      color: var(--amber);
      background: var(--amber-dim);
      border: 1px solid rgba(245,166,35,0.25);
      border-radius: var(--radius-sm);
      padding: 7px 10px;
    }

    .warning-icon { font-size: 12px; }

    /* ── Apply button ── */
    .apply-btn {
      all: unset;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 18px;
      border-radius: var(--radius-sm);
      background: var(--accent-grad);
      color: white;
      font-family: var(--font);
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
      box-shadow: 0 0 20px var(--accent-glow);
      margin-top: 4px;
    }

    .apply-btn:hover { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 0 28px var(--accent-glow); }
    .apply-btn:active { transform: translateY(0); }
    .apply-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

    .apply-btn.applied {
      background: linear-gradient(135deg, var(--green) 0%, #2aad6e 100%);
      box-shadow: 0 0 20px rgba(61,214,140,0.25);
    }

    .btn-spinner {
      width: 13px;
      height: 13px;
      border: 2px solid rgba(255,255,255,0.25);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
      display: none;
    }

    .apply-btn.loading .btn-spinner { display: block; }
    .apply-btn.loading .btn-label   { display: none; }

    /* ── Card footer ── */
    .card-footer {
      padding: 12px 16px;
      border-top: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    /* ── Keyframes ── */
    @keyframes spin    { to { transform: rotate(360deg); } }
    @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
  </style>
</head>
<body>

  <!-- ── Header ── -->
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

    <!-- ── Loading state ── -->
    <div class="loading-state" id="loading">
      <div class="spinner-ring"></div>
      <div class="loading-text">Analyzing conflicts with AI...</div>
      <div class="loading-steps">
        <div class="step active" id="step-parse">
          <div class="step-dot"></div>Parsing conflict markers
        </div>
        <div class="step" id="step-classify">
          <div class="step-dot"></div>Classifying conflict types
        </div>
        <div class="step" id="step-resolve">
          <div class="step-dot"></div>Resolving with Llama 3.1
        </div>
        <div class="step" id="step-validate">
          <div class="step-dot"></div>Validating output
        </div>
      </div>
    </div>

    <!-- ── Results state ── -->
    <div class="results-state" id="results"></div>

  </div>

  <script>
    const vscodeApi = acquireVsCodeApi();
    const loadingEl = document.getElementById('loading');
    const resultsEl = document.getElementById('results');

    // Animate loading steps
    const steps = ['step-parse', 'step-classify', 'step-resolve', 'step-validate'];
    let stepIdx = 0;
    const stepTimer = setInterval(() => {
      if (stepIdx > 0) {
        document.getElementById(steps[stepIdx - 1]).className = 'step done';
      }
      if (stepIdx < steps.length) {
        document.getElementById(steps[stepIdx]).className = 'step active';
        stepIdx++;
      } else {
        clearInterval(stepTimer);
      }
    }, 600);

    function escapeHtml(str) {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function confidenceClass(v) {
      if (v >= 0.8) return 'high';
      if (v >= 0.5) return 'medium';
      return 'low';
    }

    function renderCard(result, index) {
      const pct = Math.round(result.confidence * 100);
      const cls = confidenceClass(result.confidence);
      const issues = result.issues || [];

      const warningsHtml = issues.length > 0 ? \`
        <div class="warnings">
          \${issues.map(w => \`
            <div class="warning-item">
              <span class="warning-icon">⚠</span>
              \${escapeHtml(w)}
            </div>
          \`).join('')}
        </div>
      \` : '';

      return \`
        <div class="conflict-card">
          <div class="card-header">
            <span class="conflict-num">Conflict #\${index + 1}</span>
            <span class="type-badge \${result.type}">\${result.type}</span>
            <div class="confidence-wrap">
              <span class="confidence-label">Confidence</span>
              <div class="confidence-track">
                <div class="confidence-fill \${cls}" style="width:\${pct}%"></div>
              </div>
              <span class="confidence-pct \${cls}">\${pct}%</span>
            </div>
          </div>

          <div class="card-body">

            <!-- Explanation -->
            <div class="explanation-block">
              <div class="block-label">AI Explanation</div>
              <div class="explanation-text">\${escapeHtml(result.explanation)}</div>
            </div>

            <!-- Diff view -->
            <div>
              <div class="block-label" style="margin-bottom:8px">Conflict Diff</div>
              <div class="diff-grid">
                <div class="diff-panel current">
                  <div class="diff-panel-header">
                    <div class="diff-dot"></div> Current (HEAD)
                  </div>
                  <pre class="diff-code">\${escapeHtml(result._current || '')}</pre>
                </div>
                <div class="diff-panel incoming">
                  <div class="diff-panel-header">
                    <div class="diff-dot"></div> Incoming
                  </div>
                  <pre class="diff-code">\${escapeHtml(result._incoming || '')}</pre>
                </div>
              </div>
            </div>

            <!-- Merged code -->
            <div class="merged-block">
              <div class="merged-header">
                <span class="merged-title">✦ Merged Resolution</span>
                <button class="copy-btn" onclick="copyCode(\${index})">Copy</button>
              </div>
              <pre class="merged-code" id="merged-code-\${index}">\${escapeHtml(result.mergedCode)}</pre>
            </div>

            \${warningsHtml}
          </div>

          <div class="card-footer">
            <button class="apply-btn" id="apply-btn-\${index}" onclick="applyMerge(\${index})">
              <span class="btn-spinner"></span>
              <span class="btn-label">⚡ Apply Merge</span>
            </button>
          </div>
        </div>
      \`;
    }

    let allResults = [];

    function copyCode(index) {
      const code = allResults[index]?.mergedCode || '';
      navigator.clipboard?.writeText(code).catch(() => {});
      const btn = document.querySelector(\`#merged-code-\${index}\`).parentElement.querySelector('.copy-btn');
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1800);
    }

    function applyMerge(index) {
      const result = allResults[index];
      if (!result) return;

      const btn = document.getElementById(\`apply-btn-\${index}\`);
      btn.disabled = true;
      btn.classList.add('loading');

      vscodeApi.postMessage({
        command: 'applyMerge',
        mergedCode: result.mergedCode,
        conflictIndex: index,
      });

      // Show success after slight delay
      setTimeout(() => {
        btn.classList.remove('loading');
        btn.classList.add('applied');
        btn.querySelector('.btn-label').textContent = '✓ Applied';
      }, 800);
    }

    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.command === 'update') {
        clearInterval(stepTimer);
        allResults = msg.results;

        // Finish loading animation
        steps.forEach(id => document.getElementById(id).className = 'step done');

        setTimeout(() => {
          loadingEl.classList.add('hidden');
          resultsEl.classList.add('visible');

          const summaryHtml = \`
            <div class="summary-bar">
              <span class="summary-label">Results</span>
              <span class="summary-count">\${msg.results.length} conflict\${msg.results.length !== 1 ? 's' : ''} resolved</span>
              <span class="divider-dot">·</span>
              <span class="summary-label">Powered by Groq + Llama 3.1</span>
            </div>
          \`;

          const cardsHtml = msg.results.map((r, i) => renderCard(r, i)).join('');
          resultsEl.innerHTML = summaryHtml + cardsHtml;
        }, 400);
      }
    });
  </script>
</body>
</html>`;
}