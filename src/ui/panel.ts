import * as vscode from "vscode";

export function showPanel() {
    const panel = vscode.window.createWebviewPanel(
        'intentMerge',
        'Intent Merge',
        vscode.ViewColumn.Beside,
        {
            enableScripts: true
        }
    );

    panel.webview.html = getHtml();

    panel.webview.onDidReceiveMessage(message => {
        if(message.command === 'applyMerge'){
            vscode.window.showInformationMessage("Apply merge clicked.");
        }
    });
}

function getHtml(): string{
    return `

    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            :root {
                --container-padding: 20px;
                --vscode-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                --vscode-font-mono: "SF Mono", Monaco, Menlo, Consolas, "Ubuntu Mono", "Liberation Mono", "Courier New", monospace;
                
                /* VS Code Theme Variable Proxies */
                --bg: #1e1e1e;
                --card-bg: #252526;
                --border: #454545;
                --text-main: #cccccc;
                --text-bright: #ffffff;
                --text-muted: #9d9d9d;
                --accent: #007acc;
                --accent-hover: #0062a3;
                --code-bg: #1a1a1a;
            }

            body {
                background-color: var(--bg);
                color: var(--text-main);
                font-family: var(--vscode-font-family);
                padding: var(--container-padding);
                line-height: 1.5;
                margin: 0;
                user-select: none;
            }

            .header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 24px;
                border-bottom: 1px solid var(--border);
                padding-bottom: 12px;
            }

            .header h1 {
                font-size: 1.2rem;
                font-weight: 600;
                margin: 0;
                color: var(--text-bright);
                letter-spacing: 0.5px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .badge {
                font-size: 0.7rem;
                background: var(--accent);
                color: white;
                padding: 2px 6px;
                border-radius: 4px;
                text-transform: uppercase;
            }

            .section {
                margin-bottom: 24px;
                animation: fadeIn 0.4s ease-out;
            }

            .section-label {
                font-size: 0.75rem;
                font-weight: 700;
                text-transform: uppercase;
                color: var(--text-muted);
                margin-bottom: 8px;
                display: block;
                letter-spacing: 1px;
            }

            .card {
                background-color: var(--card-bg);
                border: 1px solid var(--border);
                border-radius: 6px;
                padding: 16px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }

            #explanation {
                font-size: 0.95rem;
                margin: 0;
                color: var(--text-main);
            }

            #explanation.loading {
                color: var(--text-muted);
                font-style: italic;
            }

            .code-container {
                position: relative;
                background-color: var(--code-bg);
                border: 1px solid var(--border);
                border-radius: 6px;
                overflow: hidden;
            }

            #code {
                display: block;
                padding: 16px;
                margin: 0;
                font-family: var(--vscode-font-mono);
                font-size: 13px;
                color: #dcdcaa; /* VS Code Default Function Yellow */
                white-space: pre;
                overflow-x: auto;
                line-height: 1.6;
            }

            .action-area {
                display: flex;
                gap: 12px;
                align-items: center;
                margin-top: 24px;
            }

            button {
                background-color: var(--accent);
                color: white;
                border: none;
                padding: 8px 18px;
                font-size: 0.9rem;
                font-weight: 500;
                border-radius: 4px;
                cursor: pointer;
                transition: background-color 0.2s, transform 0.1s;
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }

            button:hover {
                background-color: var(--accent-hover);
            }

            button:active {
                transform: translateY(1px);
            }

            button:disabled {
                background-color: var(--border);
                cursor: not-allowed;
                opacity: 0.6;
            }

            /* Loading Spinner */
            .spinner {
                display: none;
                width: 16px;
                height: 16px;
                border: 2px solid rgba(255,255,255,0.1);
                border-top: 2px solid var(--text-bright);
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
            }

            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

            .is-loading .spinner { display: inline-block; }
            .is-loading #apply-text { display: none; }
        </style>
    </head>
    <body>

        <div class="header">
            <h1>Intent Merge <span class="badge">AI</span></h1>
        </div>

        <div class="section">
            <span class="section-label">Analysis</span>
            <div class="card">
                <p id="explanation" class="loading">Waiting for conflict analysis...</p>
            </div>
        </div>

        <div class="section">
            <span class="section-label">Suggested Resolution</span>
            <div class="code-container">
                <code id="code">// The AI-generated merge will be displayed here</code>
            </div>
        </div>

        <div class="action-area">
            <button id="apply-btn" onclick="applyMerge()">
                <span class="spinner"></span>
                <span id="apply-text">Apply Merge</span>
            </button>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            const btn = document.getElementById('apply-btn');
            const explanationEl = document.getElementById('explanation');
            const codeEl = document.getElementById('code');

            function applyMerge() {
                // Visual feedback
                btn.classList.add('is-loading');
                btn.disabled = true;

                // Send message to extension
                vscode.postMessage({
                    command: 'applyMerge'
                });

                // Re-enable after a short delay if no immediate UI teardown happens
                setTimeout(() => {
                    btn.classList.remove('is-loading');
                    btn.disabled = false;
                }, 2000);
            }

            // Handle messages from the extension (for dynamic updates)
            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.command) {
                    case 'update':
                        explanationEl.textContent = message.explanation;
                        explanationEl.classList.remove('loading');
                        codeEl.textContent = message.code;
                        break;
                }
            });
        </script>
    </body>
    </html>
    
    `;
}