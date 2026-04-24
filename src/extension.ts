import * as vscode from 'vscode';
import { showPanel } from './ui/panel';
import { ConflictCodeLensProvider } from './ui/codeLens';
import { processFile } from './logic/orchestrator';

// Regex that handles both CRLF and LF
const conflictRegex = () =>
	/<<<<<<< [^\r\n]*\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>> [^\r\n]*/g;

// Mirrors parser's detectMinIndent: minimum indentation across all non-empty lines.
function detectBaseIndent(rawBlock: string): string {
	const lines = rawBlock.split(/\r?\n/).filter(l => l.trim().length > 0);
	if (lines.length === 0) { return ''; }
	return lines
		.map(l => l.match(/^(\s*)/)?.[1] ?? '')
		.reduce((min, curr) => curr.length < min.length ? curr : min);
}

/**
 * Applies merged code back into the document, preserving the base indentation
 * of the original conflict block. This is critical for indentation-sensitive
 * languages like Python where the LLM only sees trimmed content.
 */
async function applyMergeToDocument(
	editor: vscode.TextEditor,
	mergedCode: string,
	conflictIndex: number
): Promise<boolean> {
	const docText = editor.document.getText();
	const matches = [...docText.matchAll(conflictRegex())];
	const match = matches[conflictIndex];

	if (!match || match.index === undefined) {
		vscode.window.showErrorMessage("Could not locate conflict block to replace.");
		return false;
	}

	const start = editor.document.positionAt(match.index);

	// Use minimum-indent detection across ALL non-empty lines of the raw block.
	// Reading only the first line fails for nested content (e.g. a raise inside an if
	// inside a function) where the first line has 4 spaces but inner lines have 8.
	const baseIndent = detectBaseIndent(match[1] ?? '');

	// IMPORTANT: start the replace range from column 0 of the marker line.
	// Without this, the leading spaces before <<< stay in the document AND we'd
	// prepend baseIndent again — causing double-indentation (e.g. 8 spaces instead of 4).
	const rangeStart = new vscode.Position(start.line, 0);
	const end = editor.document.positionAt(match.index + match[0].length);

	const reindented = mergedCode
		.split('\n')
		.map(line => (line.trim().length > 0 ? baseIndent + line : line))
		.join('\n');

	const edit = new vscode.WorkspaceEdit();
	edit.replace(editor.document.uri, new vscode.Range(rangeStart, end), reindented);
	await vscode.workspace.applyEdit(edit);
	return true;
}

export function activate(context: vscode.ExtensionContext) {

	console.log('Extension "intent-merge" is now active!');

	const resolveCmd = vscode.commands.registerCommand(
		'intent-merge.resolve',
		async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage("Open a file first.");
				return;
			}

			const text = editor.document.getText();
			if (!text.includes('<<<<<<<')) {
				vscode.window.showInformationMessage("No merge conflicts detected in this file.");
				return;
			}

			const panel = showPanel(context, {

				onApplyMerge: async (mergedCode, conflictIndex) => {
					const ok = await applyMergeToDocument(editor, mergedCode, conflictIndex);
					if (ok) { vscode.window.showInformationMessage("✅ Merge applied!"); }
				},

				onUndoMerge: async (_conflictIndex) => {
					// The webview panel steals focus, so undo would fire in the wrong context.
					// Explicitly re-focus the source editor before triggering undo.
					await vscode.window.showTextDocument(
						editor.document,
						{ viewColumn: editor.viewColumn, preserveFocus: false }
					);
					await vscode.commands.executeCommand('undo');
					vscode.window.showInformationMessage("↩ Merge undone.");
				},

				onRaisePR: async (mergedCode, conflictIndex) => {
					const ok = await applyMergeToDocument(editor, mergedCode, conflictIndex);
					if (!ok) { return; }

					// Open the repo's compare page with the current branch pre-selected
					const gitInfo = await getGitInfo();
					if (gitInfo?.remoteUrl) {
						const base = gitInfo.remoteUrl.replace(/\.git$/, '');
						const branch = gitInfo.currentBranch ?? 'HEAD';
						const prUrl = `${base}/compare/main...${branch}`;
						vscode.env.openExternal(vscode.Uri.parse(prUrl));
					} else {
						vscode.window.showInformationMessage(
							"✅ Merge applied! Open your Git host to raise a PR."
						);
					}
				},

				onResolveAgain: async (_conflictIndex) => {
					const freshText = editor.document.getText();
					try {
						const results = await processFile(freshText);
						panel.update(results);
					} catch (err) {
						vscode.window.showErrorMessage(`Intent Merge error: ${err}`);
					}
				},
			});

			// Run the AI pipeline
			try {
				const results = await processFile(text);
				panel.update(results);
			} catch (err) {
				vscode.window.showErrorMessage(`Intent Merge error: ${err}`);
			}
		}
	);

	const provider = new ConflictCodeLensProvider();

	context.subscriptions.push(
		resolveCmd,
		vscode.languages.registerCodeLensProvider(
			{ scheme: 'file', language: '*' },
			provider
		)
	);
}

interface GitInfo {
	remoteUrl: string | undefined;
	currentBranch: string | undefined;
}

async function getGitInfo(): Promise<GitInfo> {
	try {
		const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
		const api = gitExtension?.getAPI(1);
		const repo = api?.repositories?.[0];
		return {
			remoteUrl: repo?.state?.remotes?.[0]?.fetchUrl,
			currentBranch: repo?.state?.HEAD?.name,
		};
	} catch {
		return { remoteUrl: undefined, currentBranch: undefined };
	}
}

export function deactivate() {}