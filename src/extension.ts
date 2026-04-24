import * as vscode from 'vscode';
import { showPanel } from './ui/panel';
import { ConflictCodeLensProvider } from './ui/codeLens';
import { processFile } from './logic/orchestrator';

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

			// Regex that handles both CRLF and LF
			const conflictRegex = () =>
				/<<<<<<< [^\r\n]*\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>> [^\r\n]*/g;

			const panel = showPanel(context, {
				onApplyMerge: async (mergedCode, conflictIndex) => {
					const docText = editor.document.getText();
					const matches = [...docText.matchAll(conflictRegex())];
					const match = matches[conflictIndex];
					if (!match || match.index === undefined) {
						vscode.window.showErrorMessage("Could not locate conflict block to replace.");
						return;
					}
					const start = editor.document.positionAt(match.index);
					const end = editor.document.positionAt(match.index + match[0].length);
					const edit = new vscode.WorkspaceEdit();
					edit.replace(editor.document.uri, new vscode.Range(start, end), mergedCode);
					await vscode.workspace.applyEdit(edit);
					vscode.window.showInformationMessage("✅ Merge applied!");
				},

				onUndoMerge: async (_conflictIndex) => {
					// Use VS Code's built-in undo — reverses the last WorkspaceEdit
					await vscode.commands.executeCommand('undo');
					vscode.window.showInformationMessage("↩ Merge undone.");
				},

				onRaisePR: async (mergedCode, conflictIndex) => {
					// First apply the merge
					const docText = editor.document.getText();
					const matches = [...docText.matchAll(conflictRegex())];
					const match = matches[conflictIndex];
					if (!match || match.index === undefined) {
						vscode.window.showErrorMessage("Could not locate conflict block.");
						return;
					}
					const start = editor.document.positionAt(match.index);
					const end = editor.document.positionAt(match.index + match[0].length);
					const edit = new vscode.WorkspaceEdit();
					edit.replace(editor.document.uri, new vscode.Range(start, end), mergedCode);
					await vscode.workspace.applyEdit(edit);

					// Open GitHub PR creation page (if remote is available)
					const remoteUrl = await getGitRemoteUrl();
					if (remoteUrl) {
						const prUrl = remoteUrl.replace(/\.git$/, '') + '/compare';
						vscode.env.openExternal(vscode.Uri.parse(prUrl));
					} else {
						vscode.window.showInformationMessage("✅ Merge applied! Open your Git host to raise a PR.");
					}
				},

				onResolveAgain: async (_conflictIndex) => {
					// Re-run the full pipeline on the current document
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

async function getGitRemoteUrl(): Promise<string | undefined> {
	try {
		const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
		const api = gitExtension?.getAPI(1);
		const repo = api?.repositories?.[0];
		return repo?.state?.remotes?.[0]?.fetchUrl;
	} catch {
		return undefined;
	}
}

export function deactivate() {}