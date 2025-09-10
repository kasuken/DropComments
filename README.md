# DropComments

<p align="center">
  <img src="https://github.com/kasuken/DropComments/blob/main/img/DropCommentsLogo.png?raw=true" alt="DropComments Logo" width="200" />
</p>

DropComments is a Visual Studio Code extension that helps you automatically add comments to your code using AI. 
The goal is to make your code more readable and maintainable with minimal effort.

You can find the extension on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=emanuelebartolesi.dropcomments)

## Features
- Automatically generate code comments with AI assistance
- Support for 20+ programming languages with appropriate comment syntax
- Secure API key storage in VS Code settings
- Progress notifications during comment generation
- Smart comment formatting based on language
- Optional emoji-enhanced comments (toggle via setting)
- **Right-click context menu integration for quick commenting**

<p align="center">
  <img width="704" height="305" alt="screenshot" src="https://github.com/user-attachments/assets/132b16e6-5b61-438c-87f9-dc5665c8f71d" />
</p>

## Requirements
- An OpenAI API key (required for AI comment generation)
- Internet connection for API access
- VS Code workspace trust enabled

## Installation
Install DropComments from the VS Code Marketplace (coming soon).

## Setup
1. Install the extension
2. Open VS Code Settings (Ctrl+,)
3. Search for "DropComments"
4. Enter your OpenAI API key in the "Api Key" field


## Usage
### Command Palette
1. Select the code you want to comment
2. Open the Command Palette (Ctrl+Shift+P)
3. Run "DropComments: Add Comments to Selection"
4. Wait for the AI to generate comments
5. Comments will be inserted above your selection

### Context Menu (Right-Click)
1. Select the code you want to comment
2. Right-click in the editor
3. Choose "Add Comments with DropComments" from the context menu
4. Wait for the AI to generate comments
5. Comments will be inserted above your selection

Tip: To include emojis in generated comments, enable Settings > DropComments: Use Emojis.

### Stale Comments Sidebar (New!)
Automatically detect and regenerate potentially outdated comments across your entire workspace:

1. **Enable the feature**: Set `dropcomments.stale.enable: true` in VS Code settings
2. **Access the sidebar**: Look for "Stale Comments" in the Activity Bar (when enabled)
3. **Scan your workspace**: Click "Scan Workspace" or use auto-scan on startup
4. **Review detected issues**: Browse stale comments grouped by file with staleness scores
5. **Regenerate comments**: Use AI to update individual comments or batch process all
6. **Apply changes**: Preview and apply regenerated comments safely to your code

**Key Features:**
- **Intelligent Detection**: Analyzes symbol drift, function signature changes, comment age, and code complexity
- **Performance Optimized**: Handles large workspaces efficiently with chunked processing
- **Safe Operations**: Preview changes before applying, with conflict detection
- **Flexible Workflow**: Scan manually or automatically, regenerate individually or in batches
- **Highly Configurable**: 9 settings to customize thresholds, exclusions, and behavior

### Supported Languages
TypeScript, JavaScript, Python, Java, C#, VB.NET, C++, C, Go, Rust, PHP, Ruby, Perl, Bash, PowerShell, SQL, HTML, XML, CSS, SCSS, Sass, Less

## Settings

### Core Settings
- `dropcomments.apiKey`: Your OpenAI API key (required)
- `dropcomments.model`: **AI model to use for generating comments** (default: `gpt-4o-mini`). You can set this to any supported OpenAI model name to balance cost, speed, and quality.
- `dropcomments.commentStyle`: **Comment style preference** (default: `succinct`). Choose `succinct` for concise comments focused on key logic, or `detailed` for more explanatory comments with rationale and context.
- `dropcomments.useEmojis`: Include emojis in generated comments (default: false). When enabled, the AI is instructed to add relevant emojis sparingly for clarity.
- `dropcomments.apiUrl`: **Custom API URL** (optional). Set a custom base URL for the AI API to use local LLMs or alternative endpoints. Must be OpenAI Chat Completions-compatible. Leave empty to use the default OpenAI endpoint.

### Stale Comments Settings
- `dropcomments.stale.enable`: **Enable stale comments detection** (default: false). Turn on the sidebar feature for workspace-wide comment analysis.
- `dropcomments.stale.autoScanOnOpen`: Auto-scan workspace when VS Code opens (default: true when enabled).
- `dropcomments.stale.maxScanFiles`: Maximum files to scan in one operation (default: 5000). Prevents performance issues in very large workspaces.
- `dropcomments.stale.scoreThreshold`: Minimum staleness score to flag comments (default: 55). Higher values = fewer, more confident detections.
- `dropcomments.stale.excludeGlobs`: File patterns to exclude from scanning (default: common build/dist patterns).
- `dropcomments.stale.batchConcurrency`: Number of concurrent AI regeneration requests (default: 3).
- `dropcomments.stale.commentOnlyRegeneration`: Generate only comment text vs. full code block (default: true).
- `dropcomments.stale.showLowConfidence`: Show items slightly below threshold (default: false).
- `dropcomments.stale.gitHistoryDepth`: Git blame analysis depth for age calculation (default: 20).

## Custom API URL
DropComments supports routing AI requests to custom endpoints, enabling the use of local LLMs or alternative AI providers:

1. Open VS Code Settings (Ctrl+,)
2. Search for "DropComments: Api Url"
3. Enter your custom endpoint URL (e.g., `http://localhost:8080` for a local LLM)
4. Ensure your endpoint is OpenAI Chat Completions-compatible
5. Use your existing API key setting if required by your custom endpoint

**Compatibility Note**: Custom endpoints must implement the OpenAI Chat Completions API format. Popular local LLM frameworks like Ollama, LM Studio, and text-generation-webui provide OpenAI-compatible endpoints.

**Security**: Only use trusted endpoints. Your code will be sent to the configured URL for comment generation.

## Custom Prompt Template
You can provide a custom prompt template for AI comment generation using the `dropcomments.promptTemplate` setting.

- Leave empty to use the default prompt.
- Supports variables:
  - `{language}`: Language ID of the code
  - `{code}`: Selected code
  - `{style}`: Comment style instruction (succinct/detailed)
  - `{emojiInstruction}`: Emoji usage instruction

**Example template:**
```
You are an expert in {language}. Add comments to the following code:
{style}
{emojiInstruction}
Code:
{code}
```

Set your template in VS Code Settings > DropComments: Prompt Template.

## All Features
- Automatically generate code comments with AI assistance
- Support for 20+ programming languages with appropriate comment syntax
- Secure API key storage in VS Code settings
- Progress notifications during comment generation
- Smart comment formatting based on language
- Optional emoji-enhanced comments (toggle via setting)
- **Right-click context menu integration for quick commenting**
- **Customizable AI model and comment style settings for full control over output**
- **Custom prompt templates for personalized AI interactions**
- **🆕 Stale Comments Sidebar - Workspace-wide comment maintenance with AI**
  - Intelligent staleness detection with configurable scoring
  - Batch regeneration and safe application of updates
  - Performance-optimized for large codebases
  - Seamless integration with existing AI settings

Stay tuned for more impressive features!

## Contributing
Contributions are welcome! Please open issues or pull requests for suggestions and improvements.

## License
[License](LICENSE)
