import * as vscode from 'vscode';
import * as copyPaste from "copy-paste";
import * as extension from "./Json2Ts";
let Json2Ts = extension.Json2Ts;

export function activate(context: vscode.ExtensionContext) {

	let clipboardJson2Interface = vscode.commands.registerCommand("convert.json2interface", () => {
		copyPaste.paste((error, content) => {
			// 通过 eval 方法格式化 js 对象，再通过 JSON.stringify 转为标准格式的 JSON 数据
			let processJsObject = JSON.stringify(eval('[' + content + ']')[0]);

			if (extension.isJson(processJsObject)) {
				convert(processJsObject, extension.filterComment(content));
			} else {
				vscode.window.showErrorMessage("Clipboard has no valid JSON content.");
			}
		});
	});

	context.subscriptions.push(clipboardJson2Interface);
}


function convert(content: string, command: extension.Command) {
	vscode.window.setStatusBarMessage("Convert JSON to TypeScript interfaces...");

	let json2ts = new Json2Ts();
	let result = json2ts.convert(content, command);

	vscode.window.activeTextEditor?.edit((editBuilder) => {
		let startLine = vscode.window.activeTextEditor?.selection.start.line;
		if (startLine !== undefined) {
			let lastCharIndex = vscode.window.activeTextEditor?.document.lineAt(startLine).text.length;
			if (lastCharIndex !== undefined) {
				let position = new vscode.Position(startLine, lastCharIndex);
				editBuilder.insert(position, result);
				vscode.window.setStatusBarMessage("Here are your TypeScript interfaces... Enjoy! :)");
			} else {
				vscode.window.showErrorMessage("lastCharIndex is not find");
			}
		} else {
			vscode.window.showErrorMessage("startLine is not find");
		}
	});
}

export function deactivate() {}