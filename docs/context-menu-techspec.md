# DropComments: Context Menu Integration Tech Spec

This document translates the Context Menu PRD into a concrete technical design and implementation plan for the DropComments VS Code extension. It does not include source code; it identifies integration points, configuration changes, and a step-by-step guide a developer can follow.

## Overview
- Goal: Provide an editor right‑click (context) menu entry to trigger DropComments on the current selection.
- Outcome: Users can right‑click selected code and invoke the same functionality as the existing command palette action, with a context-sensitive menu item that appears only when text is selected.

## Scope
- In scope: Editor context menu entry, activation wiring, command alias, doc and tests updates.
- Out of scope: Submenus, toolbar buttons, localization, and non-editor views.

## Assumptions
- The command `dropcomments.addComments` exists and performs AI-powered commenting on the current selection (confirmed in `src/extension.ts`).
- `package.json` currently has `activationEvents: []`; menu-triggered activation requires `onCommand:` entries.
- A second user-facing command (alias) will be introduced for clearer context-menu labeling.

## Dependencies & Integration Points
- VS Code Contributions in `package.json`:
  - `contributes.commands`
  - `contributes.menus["editor/context"]`
  - `activationEvents` entries: `onCommand:*`
- Extension runtime in `src/extension.ts`:
  - Command registration for both command IDs
  - Single shared implementation for comment insertion
  - Output channel logging

## UX & Behavior
- Visibility: Menu item is shown only when there is a non-empty selection and the editor has focus.
- Command label: “Add Comments with DropComments”.
- Optional icon: A comment-related codicon may be added later (non-blocking).
- Menu group: Position within a modification group (e.g., `1_modification@7`) so it’s discoverable but not intrusive.
- Result: Invokes the same logic as the palette command; identical behavior and error flows.

## Technical Design
1. Commands
   - Keep existing: `dropcomments.addComments` (Command Palette entry remains unchanged).
   - Add alias: `dropcomments.addCommentsContext` with the label “Add Comments with DropComments”.
   - Both commands call the same handler to avoid duplication.

2. Menus Contribution (editor/context)
   - Location: `contributes.menus["editor/context"]`.
   - Command: `dropcomments.addCommentsContext`.
   - When: `editorTextFocus && editorHasSelection`.
   - Group: `1_modification@7` (or similar), allowing natural positioning with edit actions.

3. Activation Events
   - Add: `onCommand:dropcomments.addComments` and `onCommand:dropcomments.addCommentsContext` to ensure activation when either entry is invoked.

4. Handler Reuse & Logging
   - Register both commands in `activate()`.
   - Delegate alias to the existing selection-commenting function.
   - Add a brief log line indicating invocation via context menu vs. palette for lightweight telemetry.

## Error Handling & Settings
- Reuse existing checks:
  - Workspace trust
  - API key presence and validity
  - Non-empty selection
- Reuse existing settings:
  - `dropcomments.apiKey`
  - `dropcomments.useEmojis`
- No additional configuration keys are needed.

## Accessibility & i18n
- Plain, descriptive label compatible with screen readers.
- Future work: introduce localization keys when adding i18n.

## Security & Privacy
- No new data flows. The AI usage remains unchanged and governed by existing settings.

## Performance
- Negligible overhead from menu contributions and command aliasing.

## Testing Strategy
- Automated (via `@vscode/test-electron`):
  - Happy path: With selection, execute alias command ID and assert selection is replaced and no errors occur.
  - Visibility: Ensure the command is unavailable without selection (indirectly test via `when` logic—attempt execution should be blocked or no-op under test harness assumptions).
  - Settings: Toggle `dropcomments.useEmojis` and ensure it is read (assert through logs/mocks).
  - API key: With empty API key, assert same error prompt and flow as palette command.
- Manual QA:
  - Right‑click with and without selection.
  - Try a few language modes (TS, Python, HTML).
  - Sanity check in common environments (local, optional WSL/remote).

## Rollout & Documentation
- Version bump: minor (0.3.x → 0.4.x) or patch if you consider purely additive UX.
- README: Add “Right‑click in editor” usage path.
- CHANGELOG: Note the new context menu entry.

## Step-by-Step Implementation (No Source Code)
1. Edit `package.json`:
   - Add `activationEvents` entries for both command IDs: palette and context alias.
   - Under `contributes.commands`, add a new command with ID `dropcomments.addCommentsContext` and title “Add Comments with DropComments”.
   - Under `contributes.menus.editor/context`, add a menu item binding this alias with `when: editorTextFocus && editorHasSelection` and `group: 1_modification@7`.
2. Update `src/extension.ts`:
   - Register the new command ID in `activate()`.
   - Delegate to the same implementation used by `dropcomments.addComments`.
   - Log a short message indicating invocation via context menu.
3. Documentation:
   - Update README usage section to include the right‑click entry point.
   - Add a CHANGELOG entry for the context menu feature.
4. Tests:
   - Add/adjust integration tests to cover the alias command and its visibility.
5. Build & Verify:
   - Compile the extension and run in a development host.
   - Validate menu visibility, correct behavior, and logs.

## Acceptance Criteria Mapping
- Context menu appears only with selection: via `when` clause and tested manually/automatically.
- Clear and descriptive label: provided by the alias command title.
- Same behavior as palette: both commands call the same handler.
- Logical position: controlled by the `group` order.
- Works across languages: selection-based and language-agnostic.
- No conflicts: additive contribution; verify against common context operations.
- Settings respected, errors consistent: unchanged handler path ensures parity.

## Risks & Mitigations
- Risk: Menu clutter or unexpected ordering.
  - Mitigation: Use a conservative group index and test alongside common extensions.
- Risk: Duplicate or inconsistent labels.
  - Mitigation: Keep a single alias for context and reuse the existing handler.

## Future Enhancements
- Create a “DropComments” submenu for multiple actions (e.g., Explain Code, Refactor Comments).
- Add an editor title bar button for quick access.
- Add i18n for labels.