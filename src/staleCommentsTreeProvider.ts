import * as vscode from 'vscode';
import * as path from 'path';
import { StaleCommentItem, StaleCommentsService } from './staleCommentsService';

export class StaleCommentTreeItem extends vscode.TreeItem {
    constructor(
        public readonly item: StaleCommentItem,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly type: 'file' | 'comment'
    ) {
        super(
            type === 'file' ? path.basename(item.filePath) : item.originalCommentText.substring(0, 80),
            collapsibleState
        );

        if (type === 'file') {
            this.tooltip = `${item.filePath} (${this.getFileItemCount()} stale comments)`;
            this.description = `${this.getFileItemCount()} items`;
            this.iconPath = new vscode.ThemeIcon('file');
        } else {
            this.tooltip = `Score: ${item.score}\nReasons: ${item.reasons.join(', ')}\nLine: ${item.range.start.line + 1}`;
            this.description = `Line ${item.range.start.line + 1} (${item.score})`;
            this.iconPath = new vscode.ThemeIcon(
                item.status === 'regenerating' ? 'loading~spin' :
                item.regeneratedText ? 'edit' : 'comment-unresolved'
            );
            this.contextValue = item.regeneratedText ? 'staleCommentWithRegenerated' : 'staleComment';
            
            // Make comments clickable to open the file
            this.command = {
                command: 'dropcomments.stale.openLocation',
                title: 'Open File',
                arguments: [item]
            };
        }
    }

    private getFileItemCount(): number {
        // This will be set by the tree provider
        return (this as any)._itemCount || 1;
    }
}

export class StaleCommentsTreeProvider implements vscode.TreeDataProvider<StaleCommentTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<StaleCommentTreeItem | undefined | null | void> = new vscode.EventEmitter<StaleCommentTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<StaleCommentTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private items: StaleCommentItem[] = [];
    private groupedItems: Map<string, StaleCommentItem[]> = new Map();

    constructor(private staleCommentsService: StaleCommentsService) {}

    refresh(): void {
        this.items = this.staleCommentsService.getItems();
        this.groupItems();
        this._onDidChangeTreeData.fire();
    }

    private groupItems(): void {
        this.groupedItems.clear();
        
        for (const item of this.items) {
            const filePath = item.filePath;
            if (!this.groupedItems.has(filePath)) {
                this.groupedItems.set(filePath, []);
            }
            this.groupedItems.get(filePath)!.push(item);
        }

        // Sort items within each file by score (highest first)
        for (const [filePath, items] of this.groupedItems.entries()) {
            items.sort((a, b) => b.score - a.score);
        }
    }

    getTreeItem(element: StaleCommentTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: StaleCommentTreeItem): Thenable<StaleCommentTreeItem[]> {
        if (!element) {
            // Root level - return file groups
            const fileItems: StaleCommentTreeItem[] = [];
            
            for (const [filePath, items] of this.groupedItems.entries()) {
                // Use the first item as representative for the file group
                const representativeItem = items[0];
                const fileItem = new StaleCommentTreeItem(
                    representativeItem,
                    vscode.TreeItemCollapsibleState.Expanded,
                    'file'
                );
                
                // Store the count for display
                (fileItem as any)._itemCount = items.length;
                fileItems.push(fileItem);
            }

            // Sort files by highest score in each file
            fileItems.sort((a, b) => {
                const aMaxScore = Math.max(...this.groupedItems.get(a.item.filePath)!.map(item => item.score));
                const bMaxScore = Math.max(...this.groupedItems.get(b.item.filePath)!.map(item => item.score));
                return bMaxScore - aMaxScore;
            });

            return Promise.resolve(fileItems);
        } else if (element.type === 'file') {
            // Return comment items for this file
            const items = this.groupedItems.get(element.item.filePath) || [];
            const commentItems = items.map(item => 
                new StaleCommentTreeItem(item, vscode.TreeItemCollapsibleState.None, 'comment')
            );
            return Promise.resolve(commentItems);
        }

        return Promise.resolve([]);
    }

    getParent(element: StaleCommentTreeItem): vscode.ProviderResult<StaleCommentTreeItem> {
        if (element.type === 'comment') {
            // Find the parent file item
            const fileItems = Array.from(this.groupedItems.keys()).map(filePath => {
                const items = this.groupedItems.get(filePath)!;
                return new StaleCommentTreeItem(items[0], vscode.TreeItemCollapsibleState.Expanded, 'file');
            });
            
            return fileItems.find(fileItem => fileItem.item.filePath === element.item.filePath);
        }
        return null;
    }

    updateItem(item: StaleCommentItem): void {
        // Update the item in our local collection
        const index = this.items.findIndex(i => i.id === item.id);
        if (index !== -1) {
            this.items[index] = item;
            this.groupItems();
            this._onDidChangeTreeData.fire();
        }
    }

    removeItem(item: StaleCommentItem): void {
        const index = this.items.findIndex(i => i.id === item.id);
        if (index !== -1) {
            this.items.splice(index, 1);
            this.groupItems();
            this._onDidChangeTreeData.fire();
        }
    }
}