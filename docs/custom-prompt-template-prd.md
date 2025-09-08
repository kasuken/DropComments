# DropComments: Custom Prompt Template PRD

## Feature Summary
Allow users to define a custom prompt template for AI comment generation. If the user does not set a custom template, the extension will use its default prompt. This enables advanced users to tailor the AI’s instructions for their specific workflow, coding standards, or language.

## User Stories

- **As a user, I want to provide my own prompt template, so I can control how the AI generates comments for my code.**
- **As a user, I want the extension to use my custom template if set, and fall back to the default prompt if not, so I always get useful comments.**
- **As a user, I want to use variables in my template (e.g., language, code, style, emoji instructions), so my prompt is dynamic and context-aware.**
- **As a user, I want to edit my template in VS Code settings, so I can easily experiment and refine my workflow.**

## Acceptance Criteria

- A new setting `dropcomments.promptTemplate` is available in VS Code settings.
- If `dropcomments.promptTemplate` is set and non-empty, the extension uses it for AI comment generation.
- If the setting is empty or unset, the extension uses its default prompt logic.
- The template supports variables for substitution:
  - `{language}`: Language ID of the code
  - `{code}`: Selected code
  - `{style}`: Comment style instruction (succinct/detailed)
  - `{emojiInstruction}`: Emoji usage instruction
- Documentation is updated to describe how to use and format custom templates.
- No breaking changes to existing functionality; users who do not set a custom template experience the same behavior as before.

## Goals & Non-Goals

**Goals:**
- Empower users to customize the AI prompt for comment generation.
- Support variable substitution for context-aware templates.
- Maintain a robust default prompt for users who do not customize.

**Non-Goals:**
- No support for multiple templates or per-language templates in this iteration.
- No UI for previewing or validating template output.
- No advanced scripting or conditional logic in templates.

## Scope

- In scope: New setting, template substitution logic, documentation.
- Out of scope: UI preview, template validation, multi-template management.

## UX Details

- Setting name: `DropComments: Prompt Template`
- Setting key: `dropcomments.promptTemplate`
- Type: string (multi-line supported)
- Location: Settings > Extensions > DropComments
- Behavior: Uses custom template if set, otherwise defaults.

## Dependencies & Constraints

- Template must be a string; variable names are fixed.
- If the template is invalid or missing variables, the extension will still attempt to substitute what it can.
- No impact on API key, model, or endpoint settings.

## Error Handling & Edge Cases

- Empty or unset template: use default prompt.
- Invalid variable names: ignored, no error.
- Malformed template: use as-is, no validation.

## Security & Privacy

- No additional secrets or sensitive data stored.
- User is responsible for the content of their template.

## Performance

- Negligible overhead for string substitution.

## Test Plan

- Set a custom template and verify it is used for comment generation.
- Leave the template empty and verify the default prompt is used.
- Use all supported variables and confirm correct substitution.
- Use unsupported variables and confirm they are ignored.
- Validate fallback and error handling.

## Rollout & Documentation

- Version bump: minor.
- README: Add section on custom prompt templates with example.
- CHANGELOG: Announce new setting and its purpose.

## Success Metrics

- Qualitative: Users can successfully customize the prompt and see the effect in generated comments.
- Support signals: Positive feedback on flexibility; minimal confusion or support requests.

## Risks & Mitigations

- Risk: Users expect advanced logic or validation in templates.
  - Mitigation: Clearly document limitations and provide examples.
- Risk: Malformed templates lead to poor AI output.
  - Mitigation: Default fallback and clear documentation.

## Open Questions

- Should we support per-language or per-workspace templates in the future?
- Should we add a UI preview for template output?