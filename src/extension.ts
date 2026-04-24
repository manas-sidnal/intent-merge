import * as vscode from 'vscode';
import { showPanel } from './ui/panel';
import { ConflictCodeLensProvider } from './ui/codeLens';
import { processFile } from './logic/orchestrator';

export function activate(context: vscode.ExtensionContext) {

	console.log('Extension "intent-merge" is now active!');

	let currentPanel: ReturnType<typeof showPanel> | undefined;

	const resolveCmd = vscode.commands.registerCommand(
		'intent-merge.resolve',
		async () => {

			const editor = vscode.window.activeTextEditor;

			if (!editor) {
				vscode.window.showErrorMessage("Open a file first.");
				return;
			}

			const text = editor.document.getText();

			// Check for conflict markers before doing anything
			if (!text.includes('<<<<<<<')) {
				vscode.window.showInformationMessage("No merge conflicts detected in this file.");
				return;
			}

			// Show the panel immediately in loading state
			currentPanel = showPanel(context, async (mergedCode: string, conflictIndex: number) => {
				// applyMerge callback — replace the nth conflict block in the document
				const docText = editor.document.getText();
				const regex = /<<<<<<< [^\r\n]*\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>> [^\r\n]*/g;
				const matches = [...docText.matchAll(regex)];
				const match = matches[conflictIndex];

				if (!match || match.index === undefined) {
					vscode.window.showErrorMessage("Could not locate conflict block to replace.");
					return;
				}

				const start = editor.document.positionAt(match.index);
				const end = editor.document.positionAt(match.index + match[0].length);
				const range = new vscode.Range(start, end);

				const edit = new vscode.WorkspaceEdit();
				edit.replace(editor.document.uri, range, mergedCode);
				await vscode.workspace.applyEdit(edit);

				vscode.window.showInformationMessage("✅ Merge applied successfully!");
			});

			// Run the AI pipeline
			try {
				const results = await processFile(text);
				currentPanel.update(results);
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

export function deactivate() {}