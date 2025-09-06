# DropComments: Model and Comment Style Settings PRD

## Feature Summary
Enable users to customize the AI model and comment style used for code commenting in DropComments. Users can select the OpenAI model and choose between succinct or detailed comment styles, allowing for more control over the quality and verbosity of generated comments.

## User Stories
- **As a user, I want to select which OpenAI model is used for comment generation, so I can balance cost, speed, and quality.**
- **As a user, I want to choose between succinct and detailed comment styles, so the generated comments match my documentation needs.**
- **As a user, I want these settings to apply to both command palette and context menu usage, so my preferences are always respected.**
- **As a user, I want the extension to remember my choices and use them automatically for future comment generations.**

## Acceptance Criteria
- Users can set `dropcomments.model` in VS Code settings to select the OpenAI model for comment generation.
- Users can set `dropcomments.commentStyle` in VS Code settings to choose between "succinct" and "detailed" comment styles.
- The selected model is used for all AI requests made by DropComments.
- The selected comment style is reflected in the prompt and affects the verbosity and detail of generated comments.
- Both settings are respected for comments generated via command palette and context menu.
- The extension defaults to `gpt-4o-mini` for model and `succinct` for comment style if not set.
- Documentation is updated to describe these settings and their impact.
- No breaking changes to existing functionality; users who do not change settings experience the same behavior as before.