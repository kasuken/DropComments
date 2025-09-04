# DropComments: Basic Commenting & Settings PRD

## Feature Summary
DropComments enables users to select code in the editor and automatically add AI-generated comments. The extension uses an OpenAI API key stored in VS Code settings under a dedicated DropComments section. More settings will be added in future releases.

## User Stories
- **As a user, I want to select a portion of code and trigger an action to add comments, so that my code becomes more readable.**
- **As a user, I want to securely store my OpenAI API key in VS Code settings, so that DropComments can access the AI service.**
- **As a user, I want to see a dedicated DropComments section in VS Code settings, so I can manage extension-specific options.**
- **As a user, I want the extension to be ready for more settings in the future, so I can customize its behavior as it evolves.**

## Acceptance Criteria
- Users can select code in the editor and run the DropComments command to add AI-generated comments.
- The extension reads the OpenAI API key from a custom DropComments section in VS Code settings.
- The DropComments settings section is visible in VS Code settings and allows entry of the API key.
- The settings structure is designed to support future options (e.g., comment style, language, etc.).
- The feature works for basic code commenting in the initial release.