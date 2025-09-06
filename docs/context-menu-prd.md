# DropComments: Context Menu Integration PRD

## Feature Summary
Enable users to access DropComments functionality through the right-click context menu in the VS Code editor. This provides an intuitive and discoverable way to add AI-generated comments to selected code without needing to memorize keyboard shortcuts or command palette commands.

## User Stories
- **As a user, I want to right-click on selected code and see a DropComments option in the context menu, so I can easily add comments without using the command palette.**
- **As a user, I want the context menu option to only appear when I have code selected, so the menu stays clean and relevant.**
- **As a user, I want the context menu option to have a clear and descriptive label, so I understand what it will do.**
- **As a user, I want the context menu option to trigger the same commenting functionality as the command palette command, so I have consistent behavior across different access methods.**
- **As a user, I want the context menu option to be positioned logically within the menu structure, so it feels natural and doesn't interfere with other extensions.**

## Acceptance Criteria
- A new context menu item "Add Comments with DropComments" appears in the editor context menu when text is selected.
- The context menu item only appears when there is an active text selection in the editor.
- Clicking the context menu item triggers the same AI comment generation process as the existing command palette command.
- The context menu item is positioned in an appropriate group within the context menu (e.g., with other code enhancement tools).
- The feature works consistently across all supported programming languages.
- The context menu integration does not conflict with existing VS Code functionality or other extensions.
- The context menu option respects all existing DropComments settings (API key, emojis, etc.).
- Error handling for missing API key or other configuration issues works the same as with command palette access.

## Goals and Non‑Goals
Goals:
- Provide a visible, low-friction entry point to DropComments via the editor context menu.
- Show the action only when relevant (editor has focus and a non-empty selection).
- Keep behavior identical to the existing command palette path.

Non‑Goals (this iteration):
- Introducing a dedicated "DropComments" submenu with multiple actions.
- Adding editor title bar buttons or inline code actions.
- Localizing labels or adding per-language visibility rules.

## UX Details
- Location: Editor context menu (right‑click within a text editor).
- Label: "Add Comments with DropComments".
- Visibility: Display only when `editorTextFocus` AND there is a non-empty selection.
- Positioning: Group with modification/edit actions (e.g., `1_modification@7`) so it’s discoverable but not intrusive.
- Optional icon: A comment-related codicon may be added later; not required initially.

## Constraints & Dependencies
- VS Code contributions required: `contributes.commands`, `contributes.menus["editor/context"]`.
- Activation: Ensure `onCommand:` activation for the command(s) so the extension activates when invoked from the menu.
- Reuse existing command logic (`dropcomments.addComments`) to guarantee parity with the Command Palette flow.

## Error Handling & Empty States
- Missing API key: Present the same prompt to open settings as the command palette flow.
- Workspace not trusted: Show the same trust error.
- Empty selection: Item is hidden; no disabled state is needed.
- AI/service errors: Same user-facing errors as existing behavior (rate limits, 5xx, etc.).

## Accessibility
- Use a descriptive text label for screen readers; icon is optional and secondary.
- Keep wording concise and action-oriented.

## Success Metrics
- Qualitative: Users discover and use the right‑click action without needing documentation.
- Quantitative (development/dogfooding): A noticeable share of invocations come from context menu versus palette (lightweight logging only during development).
- Stability: No increase in activation/configuration error reports.

## Test Plan (High Level)
- Automated integration tests:
	- Happy path: With non-empty selection, invoke the context menu command ID; selection is updated and success message is shown.
	- Visibility: Command is unavailable without selection (indirectly validated via when clause and invocation behavior).
	- Settings: Toggle `dropcomments.useEmojis` and verify parity with palette command behavior.
	- API key: With no key configured, verify the same prompt to open settings.
- Manual QA:
	- Try across multiple languages (e.g., TS, Python, HTML) to ensure presence and behavior.
	- Confirm menu ordering feels natural and does not crowd core VS Code actions.

## Risks & Mitigations
- Risk: Menu clutter or confusing ordering.
	- Mitigation: Use a conservative group slot and validate visually across files/languages.
- Risk: Label overlap if more actions are added later.
	- Mitigation: Start with a single item; consider a "DropComments" submenu in a future iteration.
- Risk: Extension does not activate from menu.
	- Mitigation: Add `onCommand:` activation events for both palette and context commands.

## Rollout
- Versioning: Minor release (additive, non-breaking).
- Documentation: Update README usage to include right‑click access; optionally add a screenshot later.
- Changelog: Note the new context menu entry and that settings/error handling match the existing command.