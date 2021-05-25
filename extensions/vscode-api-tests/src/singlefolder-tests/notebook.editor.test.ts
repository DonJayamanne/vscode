/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as utils from '../utils';

suite('Notebook Editor', function () {

	const contentSerializer = new class implements vscode.NotebookSerializer {
		deserializeNotebook() {
			return new vscode.NotebookData(
				[new vscode.NotebookCellData(vscode.NotebookCellKind.Code, '// code cell', 'javascript', [new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.error(new Error('Kaboom'))])])],
				new vscode.NotebookDocumentMetadata()
			);
		}
		serializeNotebook() {
			return new Uint8Array();
		}
	};

	const disposables: vscode.Disposable[] = [];

	suiteTeardown(async function () {
		utils.assertNoRpc();
		await utils.revertAllDirty();
		await utils.closeAllEditors();
		utils.disposeAll(disposables);
		disposables.length = 0;

		for (let doc of vscode.notebook.notebookDocuments) {
			assert.strictEqual(doc.isDirty, false, doc.uri.toString());
		}
	});

	suiteSetup(function () {
		disposables.push(vscode.notebook.registerNotebookSerializer('notebook.nbdtest', contentSerializer));
	});


	test('showNotebookDocment', async function () {

		const p = utils.asPromise(vscode.notebook.onDidOpenNotebookDocument);
		const uri = await utils.createRandomFile(undefined, undefined, '.nbdtest');

		const editor = await vscode.window.showNotebookDocument(uri);
		assert.strictEqual(uri.toString(), editor.document.uri.toString());

		const event = await p;
		assert.strictEqual(event.uri.toString(), uri.toString());

		const includes = vscode.notebook.notebookDocuments.includes(editor.document);
		assert.strictEqual(true, includes);
	});

	test('verify error output', async function () {

		const p = utils.asPromise(vscode.notebook.onDidOpenNotebookDocument);
		const uri = await utils.createRandomFile(undefined, undefined, '.nbdtest');

		const editor = await vscode.window.showNotebookDocument(uri);
		const doc = await p;
		let outputs = doc.cellAt(0).outputs;
		assert.strictEqual(outputs[0].outputs.length, 1);
		assert.strictEqual(outputs[0].outputs[0].mime, 'application/vnd.code.notebook.error');
		assert.notStrictEqual(outputs[0].outputs[0].value, undefined, 'Error not defined');

		outputs = editor.document.cellAt(0).outputs;
		assert.strictEqual(outputs.length, 1);
		assert.strictEqual(outputs[0].outputs.length, 1);
		assert.strictEqual(outputs[0].outputs[0].mime, 'application/vnd.code.notebook.error');
		assert.notStrictEqual(outputs[0].outputs[0].value, undefined, 'Error not defined');
	});

	test('notebook editor has viewColumn', async function () {

		const uri1 = await utils.createRandomFile(undefined, undefined, '.nbdtest');
		const editor1 = await vscode.window.showNotebookDocument(uri1);

		assert.strictEqual(editor1.viewColumn, vscode.ViewColumn.One);

		const uri2 = await utils.createRandomFile(undefined, undefined, '.nbdtest');
		const editor2 = await vscode.window.showNotebookDocument(uri2, { viewColumn: vscode.ViewColumn.Beside });
		assert.strictEqual(editor2.viewColumn, vscode.ViewColumn.Two);
	});

	test.skip('Opening a notebook should fire activeNotebook event changed only once', async function () {
		const openedEditor = utils.asPromise(vscode.window.onDidChangeActiveNotebookEditor);
		const resource = await utils.createRandomFile(undefined, undefined, '.nbdtest');
		const editor = await vscode.window.showNotebookDocument(resource);
		assert.ok(await openedEditor);
		assert.strictEqual(editor.document.uri.toString(), resource.toString());
	});
});
