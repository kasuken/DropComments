# DropComments

<P align="center">
  <img src="https://github.com/kasuken/DropComments/blob/main/img/DropCommentsLogo.png?raw=true)" alt="DropComments Logo" width="200"/>

DropComments is a Visual Studio Code extension that helps you automatically add comments to your code using AI. 
The goal is to make your code more readable and maintainable with minimal effort.

## Features
- Automatically generate code comments with AI assistance
- Support for 20+ programming languages with appropriate comment syntax
- Secure API key storage in VS Code settings
- Progress notifications during comment generation
- Smart comment formatting based on language
- Optional emoji-enhanced comments (toggle via setting)

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
1. Select the code you want to comment
2. Open the Command Palette (Ctrl+Shift+P)
3. Run "DropComments: Add Comments to Selection"
4. Wait for the AI to generate comments
5. Comments will be inserted above your selection

Tip: To include emojis in generated comments, enable Settings > DropComments: Use Emojis.

### Supported Languages
TypeScript, JavaScript, Python, Java, C#, C++, C, Go, Rust, PHP, Ruby, Perl, Bash, PowerShell, SQL, HTML, XML, CSS, SCSS, Sass, Less

## Settings
- `dropcomments.apiKey`: Your OpenAI API key (required)
- `dropcomments.model`: AI model to use (future feature, default: gpt-4o-mini)
- `dropcomments.commentStyle`: Comment style preference (future feature, default: succinct)
- `dropcomments.useEmojis`: Include emojis in generated comments (default: false). When enabled, the AI is instructed to add relevant emojis sparingly for clarity.

## Roadmap
The initial release includes only basic functionalities, but future updates will bring:
- Support for multiple AI models
- Customizable comment styles and templates
- Inline explanations and documentation generation
- Integration with code review tools
- Bulk commenting for entire files or projects
- Custom prompt templates

Stay tuned for more impressive features!

## Contributing
Contributions are welcome! Please open issues or pull requests for suggestions and improvements.

## License
MIT
