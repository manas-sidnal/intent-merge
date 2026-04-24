import * as vscode from 'vscode';
import { showPanel } from './ui/panel';
import { ConflictCodeLensProvider } from './ui/codeLens';

export function activate(context: vscode.ExtensionContext) {

	console.log('Extension "intent-merge" is now active!');

	const resolveCmd = vscode.commands.registerCommand(
		'intent-merge.resolve',
		() => {

			const editor = vscode.window.activeTextEditor;

			if (!editor) {
				vscode.window.showErrorMessage("Open a file first.");
				return;
			}

			const text = editor.document.getText();

			console.log("File:", editor.document.fileName);
			console.log("Length:", text.length);

			vscode.window.showInformationMessage("Phase 1 working ✅");

			// 👇 UI call
			showPanel();
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