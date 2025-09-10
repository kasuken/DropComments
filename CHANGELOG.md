## [0.7.3] - 2025-09-10
### Added
- **🆕 Stale Comments Sidebar Feature:**
  - New dedicated sidebar for detecting and managing potentially outdated code comments across your workspace.
  - Intelligent heuristic-based detection using symbol drift analysis, function signature changes, and comment age scoring.
  - AI-powered comment regeneration with specialized prompts for updating stale comments.
  - File-grouped tree view with score indicators and detailed staleness reasons.
  - Batch operations: scan workspace, regenerate all, or handle comments individually.
  - Performance optimized: chunked processing, file size limits, and progress reporting.
  - **9 new configuration settings** under `dropcomments.stale.*` for full customization.
  - **7 new commands** for workspace scanning, comment regeneration, and management.
  - Seamlessly integrates with existing AI models and custom API endpoints.
  - **Opt-in feature** - enable via `dropcomments.stale.enable: true` setting.

### Technical Implementation
- Multi-language support using existing comment token mapping (20+ languages).
- Context-aware AI integration with comment-only regeneration mode.
- Workspace file system monitoring for incremental updates.
- Graceful degradation when Git is unavailable (fallback to file timestamps).
- Safe edit transactions with conflict detection and user confirmation.

---

## [0.7.0] - 2025-09-08
### Added
- **Custom prompt template support:**
  - New setting `dropcomments.promptTemplate` allows users to define a custom prompt for AI comment generation.
  - Supports variables: `{language}`, `{code}`, `{style}`, `{emojiInstruction}`.
  - If unset, the extension uses the default prompt logic.

---

## [0.6.0] - 2025-09-07
### Added
- **Custom API URL support for local LLMs and alternative endpoints:**
  - You can now set `dropcomments.apiUrl` in VS Code settings to route AI requests to a custom endpoint.
  - Supports local LLMs (Ollama, LM Studio, text-generation-webui) and OpenAI-compatible services.
  - Automatic validation and fallback to default OpenAI endpoint for invalid URLs.
  - Custom endpoint activity is logged to the DropComments output channel for debugging.
- Works seamlessly with both Command Palette and context menu invocation.
- No breaking changes; users who do not set a custom URL experience the same behavior as before.

### Improved
- Enhanced error handling with custom endpoint hints for easier troubleshooting.
- Documentation updated with Custom API URL setup guide and compatibility notes.

---

## [0.5.0] - 2025-09-06
### Added
- **Customizable AI model and comment style settings:**
  - You can now set `dropcomments.model` in VS Code settings to select the OpenAI model used for comment generation (default: `gpt-4o-mini`).
  - You can now set `dropcomments.commentStyle` to choose between `succinct` (concise) and `detailed` (explanatory) comment styles.
- Both settings are respected for comments generated via command palette and context menu.
- The extension defaults to `gpt-4o-mini` for model and `succinct` for comment style if not set.
- No breaking changes; users who do not change settings experience the same behavior as before.

### Improved
- Documentation updated to describe model and comment style settings, their defaults, and effects.

---

## [0.2.0] - 2025-09-04
### Added
- Emoji toggle for AI-generated comments via `dropcomments.useEmojis` (default: false). When enabled, the prompt asks the AI to include relevant emojis sparingly.

## [0.1.0] - 2025-09-03
### Added
- Initial release of DropComments extension
- **Core Features:**
  - AI-powered code commenting using OpenAI GPT-4o-mini
  - Command: "DropComments: Add Comments to Selection"
  - Support for 20+ programming languages with proper comment syntax
  - Smart comment formatting (line comments vs block comments)
  - Progress notifications during comment generation
- **Settings:**
  - `dropcomments.apiKey`: OpenAI API key configuration
  - `dropcomments.model`: AI model selection (future feature)
  - `dropcomments.commentStyle`: Comment style preference (future feature)
- **Error Handling:**
  - Graceful handling of missing API key with direct link to settings
  - Validation for empty selections and missing editors
  - Workspace trust requirement for security
  - Network error handling with retry suggestions
  - Large selection truncation with logging
- **Developer Features:**
  - Output channel "DropComments" for debugging
  - Comprehensive test suite
  - TypeScript implementation with full type safety
- **Supported Languages:**
  - TypeScript, JavaScript, Python, Java, C#, C++, C, Go, Rust
  - PHP, Ruby, Perl, Bash, PowerShell, SQL
  - HTML, XML, CSS, SCSS, Sass, Less

### Technical Implementation
- VS Code extension with manifest contributions
- OpenAI API integration with timeout and retry logic
- Language-specific comment token mapping
- Secure API key storage in VS Code settings
- Single-edit insertion for optimal undo behavior

---
Future releases will include advanced features as outlined in the roadmap.