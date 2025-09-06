# DropComments: Model and Comment Style Settings Tech Spec

This document translates the PRD "Model and Comment Style Settings" into a concrete technical design and implementation plan. It avoids including source code and focuses on integration points, behavior, testing, and rollout.

## Overview
- Goal: Allow users to configure the AI model (`dropcomments.model`) and comment verbosity (`dropcomments.commentStyle`) used by DropComments.
- Outcome: The selected model is used for all AI requests; the selected style meaningfully adjusts the prompt and the verbosity of generated comments. Works via both Command Palette and Context Menu.

## Scope
- In scope: Reading settings from VS Code configuration, wiring them into the AI request and prompt, documenting behavior, and tests.
- Out of scope: Adding new models beyond free-form string; per-language style presets; dynamic UI for style switching.

## Assumptions
- Settings already exist in `package.json` under `contributes.configuration`:
  - `dropcomments.model` (string, default `gpt-4o-mini`)
  - `dropcomments.commentStyle` (enum: `succinct` | `detailed`, default `succinct`)
- The command handlers for commenting are centralized and reusable by both palette and context menu paths.
- The OpenAI client can accept the model name provided by the setting.

## Integration Points
- Manifest: `package.json`
  - Ensure `dropcomments.model` and `dropcomments.commentStyle` are exposed and described in settings UI.
- Runtime: `src/extension.ts`
  - Read settings via VS Code configuration API at invocation time (not only on activation) to respect changes without reload.
  - Pass the model into the AI request.
  - Adjust the prompt based on the selected comment style.
  - Reuse existing error handling, progress UI, and logging.

## Behavior & UX
- Settings location: Settings > Extensions > DropComments
- Behavior:
  - Model: The value of `dropcomments.model` is used for each AI call. If unset/empty, default to `gpt-4o-mini`.
  - Comment style: `succinct` produces concise comments focused on key logic; `detailed` adds rationale and context where helpful.
- Access paths: The same behavior applies whether the user invokes the command via Command Palette or the editor context menu.

## Contract (internal)
- Inputs:
  - languageId (string), selected code (string), useEmojis (boolean), model (string), commentStyle ("succinct" | "detailed").
- Outputs:
  - Updated code string with comments inserted (string), or an error surfaced to the user.
- Error modes:
  - Missing/invalid API key; rate limiting; server errors; empty selection.
- Success criteria:
  - AI call uses configured model; prompt reflects selected style; output is sanitized and applied to the selection.

## Edge Cases
- Empty or whitespace-only selection: operation does not proceed (existing guard remains).
- Very large selections: existing truncation continues to apply (log truncation event).
- Unsupported/unknown model string: request is sent as-is; upstream errors are shown using existing error handling.
- Configuration changes at runtime: model/style are read at invocation time, so changes are respected without reload.

## Security & Privacy
- No new data flows are introduced. API key usage and request content remain unchanged in nature.
- Model string is user-provided; no additional secrets are logged or stored.

## Performance
- No notable impact. Prompt adjustments are negligible; AI runtime dominates.

## Telemetry & Logging (lightweight)
- Log the effective model and style used when a comment generation completes, using the existing output channel, for debugging/troubleshooting.

## Testing Strategy
- Automated integration tests:
  - Model selection: set a custom model value; assert the value is passed into the AI client (mock or spy pattern) and no runtime errors occur.
  - Style effect: toggle between `succinct` and `detailed`; assert that the prompt construction changes accordingly (e.g., via logs or mock capture).
  - Parity across entry points: invoke via Command Palette and context menu alias; assert both respect the same settings.
  - Error handling: simulate API errors (401/429/5xx) to confirm unchanged behavior.
- Manual QA checklist:
  - Change `dropcomments.model` and verify log line shows the selected model.
  - Switch `dropcomments.commentStyle` and inspect generated comments for expected verbosity.
  - Confirm behavior across a few languages (e.g., TS, Python, HTML).

## Step-by-Step Implementation Guide (No Source Code)
1. Read Settings at Invocation
   - Retrieve `dropcomments.model` and `dropcomments.commentStyle` from VS Code configuration within the comment command handler.
   - Provide fallbacks: model → `gpt-4o-mini`; style → `succinct`.
2. Wire Model into AI Request
   - Use the configured model string when creating the chat completion request to the OpenAI client.
   - Do not hard-code the model name where a setting exists.
3. Adjust Prompt for Style
   - For `succinct`: keep comments concise and focused on key logic.
   - For `detailed`: include rationale/context where helpful; still avoid excessive line-by-line commentary.
   - Ensure these instructions are part of the prompt prior to the code payload.
4. Maintain Existing Guards & UX
   - Keep workspace trust, API key checks, empty selection guard, truncation behavior, and progress notifications as-is.
5. Logging
   - Append a short log line to the output channel indicating the model and style used upon success (avoid logging code content).
6. Documentation
   - Update README > Settings to describe `dropcomments.model` and `dropcomments.commentStyle` as active features with defaults and effects.
   - Update CHANGELOG with an entry describing the additions.

## Acceptance Validation Matrix
- Users can set `dropcomments.model` and it’s used for AI requests: Verified via tests and logs.
- Users can set `dropcomments.commentStyle` and it changes prompt verbosity: Verified via tests and manual inspection.
- Works via Command Palette and Context Menu: Both code paths use the same handler/settings.
- Defaults are respected when unset: Fallback logic validated.
- No regressions in error handling or security: Covered by existing guards and tests.

## Risks & Mitigations
- Risk: User sets an invalid model name leading to upstream errors.
  - Mitigation: Surface provider error clearly; provide README guidance on example model names.
- Risk: Overly verbose prompts in `detailed` style may increase tokens/cost.
  - Mitigation: Keep prompt additions succinct; consider a token cap in future iterations.

## Rollout
- Version bump: minor increment.
- Update README and CHANGELOG.
- Optional: add an example of when to prefer `succinct` vs `detailed`.

## Future Enhancements
- Per-language style presets and auto-style detection for complex code blocks.
- Validation or suggestions for known supported model IDs.
- Workspace or folder-level overrides for team conventions.