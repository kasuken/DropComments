# DropComments: Custom Prompt Template — Technical Specification

## Overview
Enable a configurable prompt template for AI-driven comment generation. When users provide a custom template, it replaces the default prompt. If left empty, the extension uses the existing default prompt. This feature is additive, preserves current workflows, and supports simple variable substitution to keep prompts context-aware.

## Objectives (traceable to PRD)
- New setting `dropcomments.promptTemplate` (string; default empty) available in Settings.
- If set (non-empty after trim), the custom template is used for the AI prompt.
- If unset/empty, the default prompt builder is used without behavior change.
- Variable substitution supported:
  - `{language}` → active document language ID
  - `{code}` → selected code (post-truncation, if applicable)
  - `{style}` → instruction derived from `dropcomments.commentStyle`
  - `{emojiInstruction}` → instruction derived from `dropcomments.useEmojis`
- Documentation updated (README and CHANGELOG).

## Non-Goals
- Advanced templating (conditionals/loops), validation UI, or multiple/per-language templates.
- Any changes to model selection, API endpoints, or error classification.

## Assumptions
- The default AI provider (OpenAI-compatible) will accept arbitrary prompt text.
- Workspace trust enforcement remains unchanged before making network calls.
- Templates are provided by the user as plain text and are not executable.

## Inputs, Outputs, and Contracts
- Inputs
  - Editor selection (text) and language ID
  - Settings: `promptTemplate`, `commentStyle` (succinct/detailed), `useEmojis` (boolean), and existing `model`, `apiKey`, `apiUrl` (if any)
- Output
  - Model response expected to be the original code with comments inserted (unchanged contract)
- Error Modes
  - Missing API key, network errors, provider errors → handled by existing paths
  - Empty/whitespace template → silently falls back to default prompt
- Success Criteria
  - With non-empty template, prompt uses correct substitutions
  - With empty/unset template, behavior identical to current release

## Architecture & Integration Points
- Prompt Builder Logic
  - Centralize prompt creation behind a single function that first reads `promptTemplate`.
  - If template is provided and non-empty, apply substitutions and return the result.
  - Otherwise, return the default prompt built from current logic.
- Settings Retrieval
  - Read `promptTemplate` at prompt-build time alongside `commentStyle` and `useEmojis` for consistent state.
- Command Paths
  - No changes: both Command Palette and editor context menu call the same handler and thus share prompt behavior.

## Variable Substitution Rules
- Exact token names with braces: `{language}`, `{code}`, `{style}`, `{emojiInstruction}`.
- Global replacement for each token; unknown tokens remain intact.
- `{style}` mapping:
  - succinct → “Keep comments succinct and focused only on key logic.”
  - detailed → “Make comments more detailed and explanatory, including rationale and context where helpful.”
- `{emojiInstruction}` mapping:
  - useEmojis = true → “You MAY add occasional emojis in comments (never inside string literals or code).”
  - useEmojis = false → “Do not use emojis.”

## Validation & Fallback
- Template is considered unset if empty or whitespace-only after trim.
- No structural validation beyond string substitution; unknown variables are ignored.
- If `{code}` is omitted by the user’s template, the AI may have insufficient context; document as a caveat (no hard error).

## Security & Privacy
- Do not log entire prompts or code in output channels.
- No new secrets added; trust and key handling unchanged.
- Respect workspace trust gating for all AI operations.

## Performance
- Negligible: minor string reads/replacements compared to existing workflow.

## Backward Compatibility
- Users without a configured template see no change in behavior.
- No changes to activation events, command names, or existing settings beyond introducing the new setting.

## Test Strategy
- Unit Tests
  - Substitution: all supported tokens replaced; unsupported tokens remain.
  - Fallback: empty/whitespace-only template uses default prompt.
  - Style/emoji mapping correctness for `{style}` and `{emojiInstruction}`.
- Integration Tests
  - With custom template set: ensure AI call receives the substituted prompt (via interception/mocking where feasible).
  - Parity across invocation paths (Command Palette vs context menu).
  - Large selection truncation continues to work before substitution for `{code}`.
- Manual QA
  - Custom template with all variables → verify meaningful output.
  - Template missing `{code}` → verify stability and document caveat.
  - Toggle `useEmojis` and switch styles to see mapped values reflected.

## Rollout & Documentation
- Version bump: minor.
- README: Add a “Custom Prompt Template” section with variables table and an example template.
- CHANGELOG: Add entry in “Added” for the new setting and behavior.

## Risks & Mitigations
- Users expect advanced templating features → Document scope (simple variables only) and provide examples.
- Poor outcomes from malformed templates → Document best practices and caveats (especially inclusion of `{code}`).
- Prompt injection via template text → Remind users they fully control template content.

## Implementation Guide (Step-by-Step)
1. Manifest
   - Add `dropcomments.promptTemplate` under contributes.configuration with proper title, description, default empty, and scope application.
2. Prompt Builder
   - Read `promptTemplate`, `commentStyle`, and `useEmojis`.
   - If `promptTemplate` non-empty, build substitution map and apply global replacements for `{language}`, `{code}`, `{style}`, `{emojiInstruction}`.
   - Else, construct and return the default prompt as done today.
3. Logging
   - Avoid logging the full prompt or code; retain minimal status logs only.
4. Documentation
   - README: Add section with example and variables; reference caveats (e.g., include `{code}`).
   - CHANGELOG: Note the new setting and its default behavior.
5. Testing
   - Add and run unit + integration tests per strategy above.

## Quality Gates
- Build passes (TypeScript compile).
- Lint passes (ESLint) with no new issues for this feature.
- Unit/integration tests pass.
- Manual smoke test using a simple multi-line template that includes all variables.
