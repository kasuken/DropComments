# DropComments: Emoji Comments — Technical Specification

## Overview
- Purpose: Allow users to control whether AI-generated comments include emojis via a boolean setting.
- Scope: Introduce configuration `dropcomments.useEmojis` and wire it into the prompt used for generating comments so the AI includes or avoids emojis accordingly.
- Non-goals: Custom emoji catalogs, post-processing to insert/remove emojis, per-language emoji customization.

## Assumptions
- Default should be non-emoji to align with conservative code style guides.
- The AI model generally follows clear instructions to include or avoid emojis.
- No changes to comment insertion position, language token mapping, or undo granularity.

## PRD Traceability
- Setting exposed in VS Code settings: `dropcomments.useEmojis` (boolean, default: false).
- Behavior: When true, prompt asks to include relevant emojis; when false, instructs to avoid emojis.
- Documentation: README lists and explains the setting.
- Compatibility: Feature must not break existing flows across supported languages.

## Integration Points
- Manifest (package.json)
  - Add `dropcomments.useEmojis` (boolean, default false, description: "Include emojis in generated comments.").
- Extension logic (src/extension.ts)
  - Read `useEmojis` from configuration on each command run.
  - Pass the flag to the prompt composer which appends one of two concise instructions: include relevant emojis vs avoid emojis.
  - Keep comment token mapping and insertion logic unchanged.
- Tests (src/test/extension.test.ts)
  - Assert configuration property exists and defaults to false.
  - Optionally verify prompt composition changes when toggled (via mocks/stubs).
- Docs (README.md)
  - Add setting to the Settings section; note default and effect.

## Behavior Details
- Default (false): Avoid emojis; comments must be plain language.
- Enabled (true): Include relevant emojis where they add clarity; avoid excessive or irrelevant emojis.
- Language-agnostic: Only affects content; not formatting tokens.

## Data Flow (Delta)
1) User selects code and runs the Add Comments command.
2) Read `dropcomments.useEmojis` from settings.
3) Build prompt with an additional instruction that depends on the flag.
4) AI returns comment text; insertion proceeds as usual.

## UX and Error Handling
- No new UI beyond the settings toggle.
- No new error states; existing API key/network handling applies.
- If AI occasionally ignores the instruction, accept for v0.1; consider post-filter later.

## Performance & Security
- Negligible performance impact (single conditional branch).
- No added security risks; do not log user code or secrets; avoid logging AI outputs.

## Testing Strategy
- Configuration presence/defaults: ensure `useEmojis` exists and defaults to false.
- Prompt behavior: with mocks, verify the instruction changes with the flag.
- Regression: ensure selection validation, token mapping, and insertion are unaffected.
- Manual smoke: Toggle setting and generate comments in TS/JS, Python, Java to confirm tone change.

## Step-by-Step Implementation Guide
1) Manifest
   - Add `dropcomments.useEmojis` to `contributes.configuration` with default false and clear description.
2) Read Setting
   - In the command handler, read `useEmojis` at invocation time from `dropcomments.useEmojis`.
3) Prompt Composition
   - Modify prompt builder to include one of two lines:
     - Enabled: "Where appropriate, include relevant emojis to make comments more expressive."
     - Disabled: "Do not use emojis in comments."
4) Wiring
   - Thread the flag from handler → prompt builder → AI request. No other logic changes.
5) Documentation
   - Update README Settings section to include the new toggle and default.
6) Tests
   - Extend tests for config presence/default and (optionally) prompt composition via mocks.

## Risks & Mitigations
- Overuse of emojis when enabled → mitigate with "where appropriate" instruction and default=false.
- Occasional instruction violations by AI → acceptable v0.1; consider optional post-filter later.

## Acceptance Criteria Mapping
- Setting exists and is visible in settings (Manifest) — Yes.
- Prompt changes with setting (Prompt Composition) — Yes.
- Documented (README) — Yes.
- No regressions across languages (unchanged insertion/token logic) — Yes.
