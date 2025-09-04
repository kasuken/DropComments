# DropComments: Emoji Comments PRD

## Feature Summary
Allow users to choose, via settings, whether AI-generated comments should include emojis for expressiveness and clarity.

## User Stories
- **As a user, I want to enable or disable emojis in generated comments, so I can control the style and tone of my code documentation.**
- **As a user, I want the emoji setting to be easy to find and change in VS Code settings.**
- **As a user, I want the extension to respect my emoji preference every time I generate comments.**

## Acceptance Criteria
- A new setting `dropcomments.useEmojis` (boolean, default: false) is available in VS Code settings under DropComments.
- When enabled, the extension instructs the AI to include relevant emojis in generated comments.
- When disabled, the extension instructs the AI to avoid using emojis in comments.
- The setting is documented in the README and visible in the settings UI.
- The feature works for all supported languages and does not break existing functionality.