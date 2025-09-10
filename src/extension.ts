// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import OpenAI from 'openai';
import { StaleCommentsService } from './staleCommentsService';
import { StaleCommentsTreeProvider } from './staleCommentsTreeProvider';

// Output channel for logging
let outputChannel: vscode.OutputChannel;
let staleCommentsService: StaleCommentsService;
let staleCommentsTreeProvider: StaleCommentsTreeProvider;
let sharedAIClient: AIClient;

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
export class AIClient {
	private openai: OpenAI | null = null;
	private apiKey: string = '';
	private apiUrl: string = '';

	constructor() {
		this.updateClient();
	}

	// ... rest of the class remains the same

	private updateClient(): void {
		const config = vscode.workspace.getConfiguration('dropcomments');
		const newApiKey = config.get<string>('apiKey', '');
		const newApiUrl = config.get<string>('apiUrl', '');
		
		// Validate and normalize API URL
		const normalizedApiUrl = this.validateAndNormalizeUrl(newApiUrl);
		
		if (newApiKey !== this.apiKey || normalizedApiUrl !== this.apiUrl) {
			this.apiKey = newApiKey;
			this.apiUrl = normalizedApiUrl;
			
			if (this.apiKey) {
				const clientOptions: any = { apiKey: this.apiKey };
				
				if (this.apiUrl) {
					clientOptions.baseURL = this.apiUrl;
					outputChannel.appendLine(`Using custom AI endpoint: ${new URL(this.apiUrl).protocol}//${new URL(this.apiUrl).host}`);
				}
				
				this.openai = new OpenAI(clientOptions);
			} else {
				this.openai = null;
			}
		}
	}

	private validateAndNormalizeUrl(url: string): string {
		if (!url || !url.trim()) {
			return '';
		}
		
		try {
			const parsedUrl = new URL(url.trim());
			if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
				outputChannel.appendLine(`Invalid API URL protocol '${parsedUrl.protocol}'. Only http: and https: are supported. Falling back to default OpenAI endpoint.`);
				return '';
			}
			return parsedUrl.toString();
		} catch (error) {
			outputChannel.appendLine(`Invalid API URL format: ${url}. Falling back to default OpenAI endpoint.`);
			return '';
		}
	}

	   private buildPrompt(language: string, selectedCode: string, useEmojis: boolean, commentStyle: string): string {
		   const config = vscode.workspace.getConfiguration('dropcomments');
		   const customTemplate = config.get<string>('promptTemplate', '');

		   const emojiInstruction = useEmojis
			   ? "You MAY add occasional emojis in comments (never inside string literals or code)."
			   : "Do not use emojis.";

		   let styleInstruction = "";
		   if (commentStyle === "detailed") {
			   styleInstruction = "Make comments more detailed and explanatory, including rationale and context where helpful.";
		   } else {
			   styleInstruction = "Keep comments succinct and focused only on key logic.";
		   }

		   if (customTemplate && customTemplate.trim()) {
			   // Replace variables in the template
			   return customTemplate
				   .replace(/{language}/g, language)
				   .replace(/{code}/g, selectedCode)
				   .replace(/{style}/g, styleInstruction)
				   .replace(/{emojiInstruction}/g, emojiInstruction);
		   }

		   // Default prompt logic
		   return [
			   "You are a senior developer helping document code.",
			   `Add clear, concise ${language} comments to the provided code.`,
			   styleInstruction,
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

	async generateComments(language: string, selectedCode: string, useEmojis: boolean, model: string, commentStyle: string): Promise<string> {
		this.updateClient();
        
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

		const prompt = this.buildPrompt(language, truncatedCode, useEmojis, commentStyle);
        
		try {
			const response = await this.openai.chat.completions.create({
				model: model || 'gpt-4o-mini',
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
			const errorPrefix = this.apiUrl ? '[Custom endpoint] ' : '';
			
			if (error.status === 401) {
				throw new Error('Invalid OpenAI API key. Please check your settings.');
			} else if (error.status === 429) {
				throw new Error('OpenAI API rate limit exceeded. Please try again later.');
			} else if (error.status >= 500) {
				throw new Error('OpenAI service temporarily unavailable. Please try again later.');
			} else {
				outputChannel.appendLine(`${errorPrefix}OpenAI API error: ${error.message}`);
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
	const model = config.get<string>('model', 'gpt-4o-mini');
	const commentStyle = config.get<string>('commentStyle', 'succinct');

	try {
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Generating comments...',
			cancellable: false
		}, async (progress) => {
			progress.report({ increment: 0, message: 'Requesting AI...' });
			
			const aiRaw = await aiClient.generateComments(languageId, selectedText, useEmojis, model, commentStyle);
			
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
		outputChannel.appendLine(`Commented code updated (${languageId}, ${selectedText.length} chars, model: ${model}, style: ${commentStyle})`);
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

	// Initialize shared AI client
	sharedAIClient = new AIClient();

	outputChannel.appendLine('DropComments extension activated');

	// Register the original add comments commands
	const addCommentsDisposable = vscode.commands.registerCommand('dropcomments.addComments', addCommentsToSelection);
	const addCommentsContextDisposable = vscode.commands.registerCommand('dropcomments.addCommentsContext', () => {
		outputChannel.appendLine('DropComments invoked via context menu');
		return addCommentsToSelection();
	});

	context.subscriptions.push(addCommentsDisposable, addCommentsContextDisposable);

	// Initialize stale comments feature if enabled
	const config = vscode.workspace.getConfiguration('dropcomments.stale');
	if (config.get<boolean>('enable', false)) {
		initializeStaleCommentsFeature(context);
	}

	// Watch for configuration changes to enable/disable stale comments
	vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration('dropcomments.stale.enable')) {
			const newConfig = vscode.workspace.getConfiguration('dropcomments.stale');
			if (newConfig.get<boolean>('enable', false)) {
				if (!staleCommentsService) {
					initializeStaleCommentsFeature(context);
				}
			}
		}
	}, null, context.subscriptions);
}

function initializeStaleCommentsFeature(context: vscode.ExtensionContext) {
	// Initialize services
	staleCommentsService = new StaleCommentsService(context, outputChannel);
	staleCommentsTreeProvider = new StaleCommentsTreeProvider(staleCommentsService);

	// Register tree view
	const treeView = vscode.window.createTreeView('dropcomments.staleComments', {
		treeDataProvider: staleCommentsTreeProvider,
		showCollapseAll: true
	});
	context.subscriptions.push(treeView);

	// Register stale comments commands
	const scanWorkspaceCommand = vscode.commands.registerCommand('dropcomments.stale.scanWorkspace', async () => {
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Scanning workspace for stale comments...',
			cancellable: true
		}, async (progress, token) => {
			await staleCommentsService.scanWorkspace(
				(message, increment) => {
					progress.report({ message, increment });
				},
				token
			);
			staleCommentsTreeProvider.refresh();
		});
	});

	const refreshViewCommand = vscode.commands.registerCommand('dropcomments.stale.refreshView', () => {
		staleCommentsTreeProvider.refresh();
	});

	const openLocationCommand = vscode.commands.registerCommand('dropcomments.stale.openLocation', async (item) => {
		const document = await vscode.workspace.openTextDocument(item.filePath);
		const editor = await vscode.window.showTextDocument(document);
		editor.selection = new vscode.Selection(item.range.start, item.range.end);
		editor.revealRange(item.range, vscode.TextEditorRevealType.InCenter);
	});

	const regenerateCommand = vscode.commands.registerCommand('dropcomments.stale.regenerate', async (item) => {
		try {
			await staleCommentsService.regenerate(item);
			staleCommentsTreeProvider.updateItem(item);
			vscode.window.showInformationMessage('Comment regenerated successfully');
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to regenerate comment: ${error}`);
		}
	});

	const regenerateAllCommand = vscode.commands.registerCommand('dropcomments.stale.regenerateAll', async () => {
		const items = staleCommentsService.getItems().filter(item => !item.regeneratedText);
		if (items.length === 0) {
			vscode.window.showInformationMessage('No comments need regeneration');
			return;
		}

		const confirm = await vscode.window.showWarningMessage(
			`This will regenerate ${items.length} comments. Continue?`,
			'Yes', 'No'
		);

		if (confirm === 'Yes') {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: 'Regenerating comments...',
				cancellable: false
			}, async (progress) => {
				const config = vscode.workspace.getConfiguration('dropcomments.stale');
				const concurrency = config.get<number>('batchConcurrency', 3);
				
				for (let i = 0; i < items.length; i += concurrency) {
					const batch = items.slice(i, i + concurrency);
					await Promise.allSettled(batch.map(item => staleCommentsService.regenerate(item)));
					
					progress.report({
						message: `Processed ${Math.min(i + concurrency, items.length)} of ${items.length}`,
						increment: (concurrency / items.length) * 100
					});
				}
				
				staleCommentsTreeProvider.refresh();
			});
		}
	});

	const applyCommand = vscode.commands.registerCommand('dropcomments.stale.apply', async (item) => {
		try {
			await staleCommentsService.apply(item);
			staleCommentsTreeProvider.removeItem(item);
			vscode.window.showInformationMessage('Changes applied successfully');
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to apply changes: ${error}`);
		}
	});

	const dismissCommand = vscode.commands.registerCommand('dropcomments.stale.dismiss', async (item) => {
		await staleCommentsService.dismiss(item);
		staleCommentsTreeProvider.removeItem(item);
	});

	// Register all commands
	context.subscriptions.push(
		scanWorkspaceCommand,
		refreshViewCommand,
		openLocationCommand,
		regenerateCommand,
		regenerateAllCommand,
		applyCommand,
		dismissCommand
	);

	// Auto-scan on startup if enabled
	const autoScan = vscode.workspace.getConfiguration('dropcomments.stale').get<boolean>('autoScanOnOpen', true);
	if (autoScan && vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
		// Delay auto-scan to let workspace fully load
		setTimeout(() => {
			vscode.commands.executeCommand('dropcomments.stale.scanWorkspace');
		}, 2000);
	}

	outputChannel.appendLine('Stale comments feature initialized');
}

// Export function to get the shared AI client for other services
export function getSharedAIClient(): AIClient {
	if (!sharedAIClient) {
		throw new Error('AI client not initialized. Extension must be activated first.');
	}
	return sharedAIClient;
}

// This method is called when your extension is deactivated
export function deactivate() {
	outputChannel?.appendLine('DropComments extension deactivated');
}