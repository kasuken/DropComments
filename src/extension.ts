// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import OpenAI from 'openai';

// Output channel for logging
let outputChannel: vscode.OutputChannel;

// Language comment token mapping
const COMMENT_TOKENS: Record<string, { line: string; blockStart?: string; blockEnd?: string }> = {
	'typescript': { line: '//' },
	'javascript': { line: '//' },
	'python': { line: '#' },
	'java': { line: '//', blockStart: '/*', blockEnd: '*/' },
	'csharp': { line: '//', blockStart: '/*', blockEnd: '*/' },
	'cpp': { line: '//', blockStart: '/*', blockEnd: '*/' },
	'c': { line: '//', blockStart: '/*', blockEnd: '*/' },
	'go': { line: '//', blockStart: '/*', blockEnd: '*/' },
	'rust': { line: '//', blockStart: '/*', blockEnd: '*/' },
	'php': { line: '//', blockStart: '/*', blockEnd: '*/' },
	'ruby': { line: '#' },
	'perl': { line: '#' },
	'bash': { line: '#' },
	'shell': { line: '#' },
	'powershell': { line: '#' },
	'sql': { line: '--', blockStart: '/*', blockEnd: '*/' },
	'html': { line: '', blockStart: '<!--', blockEnd: '-->' },
	'xml': { line: '', blockStart: '<!--', blockEnd: '-->' },
	'css': { line: '', blockStart: '/*', blockEnd: '*/' },
	'scss': { line: '//', blockStart: '/*', blockEnd: '*/' },
	'sass': { line: '//' },
	'less': { line: '//', blockStart: '/*', blockEnd: '*/' }
};

// AI Client class
class AIClient {
	private openai: OpenAI | null = null;
	private apiKey: string = '';

	constructor() {
		this.updateApiKey();
	}

	private updateApiKey(): void {
		const config = vscode.workspace.getConfiguration('dropcomments');
		const newApiKey = config.get<string>('apiKey', '');
		
		if (newApiKey !== this.apiKey) {
			this.apiKey = newApiKey;
			if (this.apiKey) {
				this.openai = new OpenAI({ apiKey: this.apiKey });
			} else {
				this.openai = null;
			}
		}
	}

	private buildPrompt(language: string, selectedCode: string, useEmojis: boolean): string {
		const emojiInstruction = useEmojis
			? "You MAY add occasional emojis in comments (never inside string literals or code)."
			: "Do not use emojis.";

		return [
			"You are a senior developer helping document code.",
			`Add clear, concise ${language} comments to the provided code.`,
			"Do NOT comment on every single line",
			"Comment ONLY where it adds value.",
			"Comment ONLY key logic and complex sections.",
			"Return the ORIGINAL code with comments inserted.",
			"Do NOT wrap the entire selection in a single comment block.",
			"Do NOT remove or reorder code.",
			"Do NOT comment out executable code lines.",
			"Use inline trailing comments sparingly; prefer preceding line comments for multi-line logic.",
			emojiInstruction,
			"Return ONLY the code (no markdown fences, no explanations outside comments).",
			"",
			"Code:",
			selectedCode
		].join('\n');
	}

	async generateComments(language: string, selectedCode: string, useEmojis: boolean): Promise<string> {
		this.updateApiKey();
        
		if (!this.openai) {
			throw new Error('OpenAI API key not configured');
		}

		// Truncate if selection is too large (rough token estimate)
		const maxChars = 3000; // Conservative estimate for token budget
		const truncatedCode = selectedCode.length > maxChars 
			? selectedCode.substring(0, maxChars) + '\n// ... (truncated)'
			: selectedCode;

		if (selectedCode.length > maxChars) {
			outputChannel.appendLine(`Selection truncated from ${selectedCode.length} to ${maxChars} characters`);
		}

		const prompt = this.buildPrompt(language, truncatedCode, useEmojis);
        
		try {
			const response = await this.openai.chat.completions.create({
				model: 'gpt-4o-mini',
				messages: [{ role: 'user', content: prompt }],
				max_tokens: 500,
				temperature: 0.3
			});

			const content = response.choices[0]?.message?.content;
			if (!content) {
				throw new Error('No response from OpenAI');
			}

			return content.trim();
		} catch (error: any) {
			if (error.status === 401) {
				throw new Error('Invalid OpenAI API key. Please check your settings.');
			} else if (error.status === 429) {
				throw new Error('OpenAI API rate limit exceeded. Please try again later.');
			} else if (error.status >= 500) {
				throw new Error('OpenAI service temporarily unavailable. Please try again later.');
			} else {
				outputChannel.appendLine(`OpenAI API error: ${error.message}`);
				throw new Error(`Failed to generate comments: ${error.message}`);
			}
		}
	}
}

// Comment strategy functions
function getCommentTokens(languageId: string): { line: string; blockStart?: string; blockEnd?: string } {
	return COMMENT_TOKENS[languageId] || { line: '//' }; // Default fallback
}

// (Helper to clean any accidental markdown fences from model output)
function sanitizeModelOutput(output: string): string {
	let text = output.trim();
	if (text.startsWith("```")) {
		text = text.replace(/^```[a-zA-Z0-9_-]*\s*/, '').replace(/```$/, '').trim();
	}
	return text;
}

// Main command handler
async function addCommentsToSelection(): Promise<void> {
	const editor = vscode.window.activeTextEditor;
	
	if (!editor) {
		vscode.window.showWarningMessage('No active editor found.');
		return;
	}

	const selection = editor.selection;
	if (selection.isEmpty) {
		vscode.window.showWarningMessage('Please select some code to comment.');
		return;
	}

	// Check workspace trust
	if (!vscode.workspace.isTrusted) {
		vscode.window.showErrorMessage('DropComments requires workspace trust to access AI services.');
		return;
	}

	// Check API key
	const config = vscode.workspace.getConfiguration('dropcomments');
	const apiKey = config.get<string>('apiKey', '');
	
	if (!apiKey) {
		const action = await vscode.window.showErrorMessage(
			'OpenAI API key not configured. Please set your API key in settings.',
			'Open Settings'
		);
		
		if (action === 'Open Settings') {
			vscode.commands.executeCommand('workbench.action.openSettings', 'dropcomments.apiKey');
		}
		return;
	}

	const selectedText = editor.document.getText(selection);
	if (!selectedText.trim()) {
		vscode.window.showWarningMessage('Selected text is empty or contains only whitespace.');
		return;
	}

	const languageId = editor.document.languageId;
	const aiClient = new AIClient();
	const useEmojis = config.get<boolean>('useEmojis', false);

	try {
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Generating comments...',
			cancellable: false
		}, async (progress) => {
			progress.report({ increment: 0, message: 'Requesting AI...' });
			
			const aiRaw = await aiClient.generateComments(languageId, selectedText, useEmojis);
			
			progress.report({ increment: 50, message: 'Processing response...' });
			const generatedCodeWithComments = sanitizeModelOutput(aiRaw);

			if (!generatedCodeWithComments) {
				throw new Error('Empty AI response');
			}

			progress.report({ increment: 80, message: 'Applying changes...' });
			await editor.edit(editBuilder => {
				editBuilder.replace(selection, generatedCodeWithComments);
			});

			progress.report({ increment: 100, message: 'Done' });
		});

		vscode.window.showInformationMessage('Comments inserted without disabling code.');
		outputChannel.appendLine(`Commented code updated (${languageId}, ${selectedText.length} chars).`);
	} catch (error: any) {
		const errorMessage = error.message || 'Unknown error occurred';
		vscode.window.showErrorMessage(`Failed to add comments: ${errorMessage}`);
		outputChannel.appendLine(`Error: ${errorMessage}`);
	}
}

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	// Create output channel
	outputChannel = vscode.window.createOutputChannel('DropComments');
	context.subscriptions.push(outputChannel);

	outputChannel.appendLine('DropComments extension activated');

	// Register the original hello world command
	const helloWorldDisposable = vscode.commands.registerCommand('dropcomments.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from DropComments!');
	});

	// Register the new add comments command
	const addCommentsDisposable = vscode.commands.registerCommand('dropcomments.addComments', addCommentsToSelection);

	context.subscriptions.push(helloWorldDisposable, addCommentsDisposable);

	// Log configuration changes
	const configWatcher = vscode.workspace.onDidChangeConfiguration((event) => {
		if (event.affectsConfiguration('dropcomments')) {
			outputChannel.appendLine('DropComments configuration changed');
		}
	});
	
	context.subscriptions.push(configWatcher);
}

// This method is called when your extension is deactivated
export function deactivate() {
	outputChannel?.appendLine('DropComments extension deactivated');
}