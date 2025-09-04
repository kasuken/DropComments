# Changelog

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