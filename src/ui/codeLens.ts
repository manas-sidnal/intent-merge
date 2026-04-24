import * as vscode from 'vscode';

export class ConflictCodeLensProvider implements vscode.CodeLensProvider {

    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {

        console.log("CodeLens triggered.");

        const lenses: vscode.CodeLens[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {

            if (lines[i].includes('<<<<<<<')) {

                const range = new vscode.Range(i, 0, i, 0);

                lenses.push(
                    new vscode.CodeLens(range, {
                        title: 'Resolve with Intent Merge',
                        command: 'intent-merge.resolve'
                    })
                );
            }
        }

        return lenses;
    }
}