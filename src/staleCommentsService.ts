import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface StaleCommentItem {
    id: string;
    filePath: string;
    range: vscode.Range;
    originalCommentText: string;
    surroundingCode: string;
    score: number;
    reasons: string[];
    lastModified: Date;
    languageId: string;
    status: 'detected' | 'regenerating' | 'updated' | 'applied' | 'dismissed';
    regeneratedText?: string;
}

export interface StaleCommentHeuristic {
    name: string;
    weight: number;
    calculate(comment: CommentCandidate, context: FileContext): Promise<{ score: number; reason?: string }>;
}

interface CommentCandidate {
    text: string;
    range: vscode.Range;
    type: 'line' | 'block';
}

interface FileContext {
    document: vscode.TextDocument;
    filePath: string;
    symbols: string[];
    gitInfo?: GitBlameInfo;
}

interface GitBlameInfo {
    lastModified: Date;
    commitHash: string;
}

interface CacheEntry {
    fileHash: string;
    mtime: number;
    items: StaleCommentItem[];
}

export class StaleCommentsService {
    private cache = new Map<string, CacheEntry>();
    private dismissedItems = new Set<string>();
    private heuristics: StaleCommentHeuristic[] = [];
    private outputChannel: vscode.OutputChannel;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
        this.context = context;
        this.outputChannel = outputChannel;
        this.initializeHeuristics();
        this.loadPersistedState();
    }

    private initializeHeuristics(): void {
        const config = vscode.workspace.getConfiguration('dropcomments.stale.heuristics');
        
        this.heuristics = [
            {
                name: 'Symbol Drift',
                weight: config.get('weights.symbolDrift', 25),
                calculate: this.calculateSymbolDrift.bind(this)
            },
            {
                name: 'Signature Mismatch',
                weight: config.get('weights.signatureMismatch', 20),
                calculate: this.calculateSignatureMismatch.bind(this)
            },
            {
                name: 'Code Comment Divergence',
                weight: config.get('weights.divergence', 15),
                calculate: this.calculateDivergence.bind(this)
            },
            {
                name: 'Age',
                weight: config.get('weights.age', 15),
                calculate: this.calculateAge.bind(this)
            },
            {
                name: 'Dead Reference',
                weight: config.get('weights.deadReference', 15),
                calculate: this.calculateDeadReference.bind(this)
            },
            {
                name: 'Complexity Delta',
                weight: config.get('weights.complexityDelta', 10),
                calculate: this.calculateComplexityDelta.bind(this)
            }
        ];
    }

    private loadPersistedState(): void {
        const dismissed = this.context.workspaceState.get<string[]>('dismissedStaleComments', []);
        this.dismissedItems = new Set(dismissed);
    }

    private async savePersistedState(): Promise<void> {
        await this.context.workspaceState.update('dismissedStaleComments', Array.from(this.dismissedItems));
    }

    async scanWorkspace(progressCallback?: (message: string, increment: number) => void, token?: vscode.CancellationToken): Promise<StaleCommentItem[]> {
        const config = vscode.workspace.getConfiguration('dropcomments.stale');
        const maxFiles = config.get<number>('maxScanFiles', 5000);
        const excludeGlobs = config.get<string[]>('excludeGlobs', []);

        this.outputChannel.appendLine('Starting workspace scan for stale comments...');

        const files = await vscode.workspace.findFiles(
            '**/*',
            `{${excludeGlobs.join(',')}}`,
            maxFiles
        );

        if (token?.isCancellationRequested) {
            return [];
        }

        const allItems: StaleCommentItem[] = [];
        const batchSize = 25;

        for (let i = 0; i < files.length; i += batchSize) {
            if (token?.isCancellationRequested) {
                break;
            }

            const batch = files.slice(i, i + batchSize);
            const batchPromises = batch.map(uri => this.scanFile(uri));
            const batchResults = await Promise.allSettled(batchPromises);

            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    allItems.push(...result.value);
                }
            }

            progressCallback?.(
                `Scanned ${Math.min(i + batchSize, files.length)} of ${files.length} files`,
                (i + batchSize) / files.length * 100
            );

            await new Promise(resolve => setTimeout(resolve, 0));
        }

        this.outputChannel.appendLine(`Scan complete. Found ${allItems.length} stale comments.`);
        return allItems;
    }

    async scanFile(uri: vscode.Uri): Promise<StaleCommentItem[]> {
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            const filePath = uri.fsPath;

            const stat = await vscode.workspace.fs.stat(uri);
            const mtime = stat.mtime;
            const fileContent = document.getText();
            const fileHash = this.hashString(fileContent);

            const cached = this.cache.get(filePath);
            if (cached && cached.fileHash === fileHash && cached.mtime === mtime) {
                return cached.items.filter(item => !this.dismissedItems.has(item.id));
            }

            if (fileContent.length > 1024 * 1024) {
                this.outputChannel.appendLine(`Skipping large file: ${filePath}`);
                return [];
            }

            const comments = this.extractComments(document);
            if (comments.length === 0) {
                return [];
            }

            const context = await this.buildFileContext(document, filePath);
            
            const items: StaleCommentItem[] = [];
            const config = vscode.workspace.getConfiguration('dropcomments.stale');
            const threshold = config.get<number>('scoreThreshold', 55);
            const showLowConfidence = config.get<boolean>('showLowConfidence', false);

            for (const comment of comments) {
                const item = await this.scoreComment(comment, context);
                if (item.score >= threshold || (showLowConfidence && item.score >= threshold - 10)) {
                    if (!this.dismissedItems.has(item.id)) {
                        items.push(item);
                    }
                }
            }

            this.cache.set(filePath, { fileHash, mtime, items });
            return items;
        } catch (error) {
            this.outputChannel.appendLine(`Error scanning file ${uri.fsPath}: ${error}`);
            return [];
        }
    }

    // Placeholder methods for heuristics - will implement next
    private async calculateSymbolDrift(comment: CommentCandidate, context: FileContext): Promise<{ score: number; reason?: string }> {
        return { score: 0 };
    }

    private async calculateSignatureMismatch(comment: CommentCandidate, context: FileContext): Promise<{ score: number; reason?: string }> {
        return { score: 0 };
    }

    private async calculateDivergence(comment: CommentCandidate, context: FileContext): Promise<{ score: number; reason?: string }> {
        return { score: 0 };
    }

    private async calculateAge(comment: CommentCandidate, context: FileContext): Promise<{ score: number; reason?: string }> {
        return { score: 0 };
    }

    private async calculateDeadReference(comment: CommentCandidate, context: FileContext): Promise<{ score: number; reason?: string }> {
        return { score: 0 };
    }

    private async calculateComplexityDelta(comment: CommentCandidate, context: FileContext): Promise<{ score: number; reason?: string }> {
        return { score: 0 };
    }

    // Utility methods
    private extractComments(document: vscode.TextDocument): CommentCandidate[] {
        return [];
    }

    private async buildFileContext(document: vscode.TextDocument, filePath: string): Promise<FileContext> {
        return {
            document,
            filePath,
            symbols: [],
            gitInfo: undefined
        };
    }

    private async scoreComment(comment: CommentCandidate, context: FileContext): Promise<StaleCommentItem> {
        return {
            id: '',
            filePath: context.filePath,
            range: comment.range,
            originalCommentText: comment.text,
            surroundingCode: '',
            score: 0,
            reasons: [],
            lastModified: new Date(),
            languageId: context.document.languageId,
            status: 'detected'
        };
    }

    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    // Public API methods
    async regenerate(item: StaleCommentItem): Promise<void> {
        item.status = 'regenerating';
        
        try {
            // Import the shared AI client from the main extension
            const { getSharedAIClient } = await import('./extension.js');
            const aiClient = getSharedAIClient();
            
            const config = vscode.workspace.getConfiguration('dropcomments');
            const useEmojis = config.get<boolean>('useEmojis', false);
            const model = config.get<string>('model', 'gpt-4o-mini');
            const commentStyle = config.get<string>('commentStyle', 'succinct');
            const commentOnlyMode = vscode.workspace.getConfiguration('dropcomments.stale').get<boolean>('commentOnlyRegeneration', true);
            
            // Build specific prompt for comment regeneration
            const prompt = this.buildRegenerationPrompt(item, useEmojis, commentStyle, commentOnlyMode);
            
            const regeneratedText = await aiClient.generateComments(item.languageId, prompt, useEmojis, model, commentStyle);
            
            if (commentOnlyMode) {
                // Extract just the comment part from the response
                item.regeneratedText = this.extractCommentFromResponse(regeneratedText, item.languageId);
            } else {
                item.regeneratedText = regeneratedText;
            }
            
            item.status = 'updated';
            this.outputChannel.appendLine(`Regenerated comment for ${item.filePath}:${item.range.start.line + 1}`);
        } catch (error) {
            item.status = 'detected';
            this.outputChannel.appendLine(`Failed to regenerate comment: ${error}`);
            throw error;
        }
    }

    private getCommentTokens(languageId: string): { line?: string; blockStart?: string; blockEnd?: string } {
        // Default comment tokens mapping
        const tokens: Record<string, { line?: string; blockStart?: string; blockEnd?: string }> = {
            'typescript': { line: '//' },
            'javascript': { line: '//' },
            'python': { line: '#' },
            'java': { line: '//', blockStart: '/*', blockEnd: '*/' },
            'c': { line: '//', blockStart: '/*', blockEnd: '*/' },
            'cpp': { line: '//', blockStart: '/*', blockEnd: '*/' },
            'csharp': { line: '//' },
            'go': { line: '//', blockStart: '/*', blockEnd: '*/' },
            'rust': { line: '//', blockStart: '/*', blockEnd: '*/' },
            'php': { line: '//', blockStart: '/*', blockEnd: '*/' },
            'ruby': { line: '#' },
            'swift': { line: '//', blockStart: '/*', blockEnd: '*/' },
            'kotlin': { line: '//', blockStart: '/*', blockEnd: '*/' },
            'scala': { line: '//', blockStart: '/*', blockEnd: '*/' },
            'dart': { line: '//', blockStart: '/*', blockEnd: '*/' },
            'html': { blockStart: '<!--', blockEnd: '-->' },
            'xml': { blockStart: '<!--', blockEnd: '-->' },
            'css': { blockStart: '/*', blockEnd: '*/' },
            'scss': { line: '//', blockStart: '/*', blockEnd: '*/' },
            'sass': { line: '//' },
            'less': { line: '//', blockStart: '/*', blockEnd: '*/' }
        };
        
        return tokens[languageId] || { line: '//' }; // Default to // for unknown languages
    }

    private buildRegenerationPrompt(item: StaleCommentItem, useEmojis: boolean, commentStyle: string, commentOnlyMode: boolean): string {
        const emojiInstruction = useEmojis ? "You MAY add occasional emojis in comments." : "Do not use emojis.";
        
        let styleInstruction = "";
        if (commentStyle === "detailed") {
            styleInstruction = "Make comments more detailed and explanatory, including rationale and context where helpful.";
        } else {
            styleInstruction = "Keep comments succinct and focused only on key logic.";
        }

        const outputInstruction = commentOnlyMode 
            ? "Return ONLY the updated comment text (no code, no markdown fences)."
            : "Return the code block with the updated comment in place.";

        return [
            "You are a senior developer helping update stale code comments.",
            `The following comment appears to be stale or outdated:`,
            `Original comment: "${item.originalCommentText}"`,
            "",
            "Current code context:",
            item.surroundingCode,
            "",
            `Update the comment to accurately reflect the current code in ${item.languageId}.`,
            styleInstruction,
            emojiInstruction,
            "Ensure the comment is relevant, accurate, and adds value.",
            outputInstruction,
            "",
            "Stale comment reasons:",
            ...item.reasons.map(reason => `- ${reason}`)
        ].join('\n');
    }

    private extractCommentFromResponse(response: string, languageId: string): string {
        // Clean any markdown fences
        let text = response.trim();
        if (text.startsWith("```")) {
            text = text.replace(/^```[a-zA-Z0-9_-]*\s*/, '').replace(/```$/, '').trim();
        }

        // Extract comment lines based on language
        const tokens = this.getCommentTokens(languageId);
        const lines = text.split('\n');
        
        let commentLines: string[] = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (tokens.line && trimmed.startsWith(tokens.line)) {
                commentLines.push(line);
            } else if (tokens.blockStart && trimmed.startsWith(tokens.blockStart)) {
                commentLines.push(line);
            } else if (tokens.blockEnd && trimmed.endsWith(tokens.blockEnd)) {
                commentLines.push(line);
            } else if (commentLines.length > 0 && trimmed.length > 0 && !trimmed.match(/^[a-zA-Z_$]/)) {
                // Continuation of block comment
                commentLines.push(line);
            }
        }

        return commentLines.join('\n') || text; // Fallback to full response if no comment detected
    }

    async apply(item: StaleCommentItem): Promise<void> {
        if (!item.regeneratedText) {
            throw new Error('No regenerated text available');
        }

        const edit = new vscode.WorkspaceEdit();
        edit.replace(vscode.Uri.file(item.filePath), item.range, item.regeneratedText);
        
        await vscode.workspace.applyEdit(edit);
        item.status = 'applied';
    }

    async dismiss(item: StaleCommentItem): Promise<void> {
        this.dismissedItems.add(item.id);
        item.status = 'dismissed';
        await this.savePersistedState();
    }

    getItems(): StaleCommentItem[] {
        const allItems: StaleCommentItem[] = [];
        for (const cacheEntry of this.cache.values()) {
            allItems.push(...cacheEntry.items.filter(item => !this.dismissedItems.has(item.id)));
        }
        return allItems.sort((a, b) => b.score - a.score);
    }
}