# DropComments: Custom API URL PRD

## Feature Summary
Enable users to specify a custom API URL for the AI backend, allowing DropComments to work with local LLMs or alternative endpoints instead of the default OpenAI API. This increases flexibility for privacy, cost, and performance needs.

## User Stories
- **As a user, I want to set a custom API URL for the AI service, so I can use DropComments with a local LLM or self-hosted endpoint.**
- **As a user, I want the extension to use my custom URL for all comment generation requests, so I have full control over where my code is sent.**
- **As a user, I want to easily change the API URL in settings, so I can switch between OpenAI and other providers as needed.**
- **As a user, I want the extension to fall back to the default OpenAI endpoint if no custom URL is set, so it works out of the box.**

## Acceptance Criteria
- Users can set `dropcomments.apiUrl` in VS Code settings to specify a custom API endpoint for AI requests.
- If `dropcomments.apiUrl` is set, all AI requests are sent to this URL; if not set, the default OpenAI endpoint is used.
- The extension supports both remote and local endpoints, provided they are compatible with the expected API format.
- The feature works for both command palette and context menu comment generation.
- Documentation is updated to describe how to set and use a custom API URL, including any compatibility notes.
- No breaking changes to existing functionality; users who do not set a custom URL experience the same behavior as before.

## Goals & Non‑Goals
Goals:
- Allow users to route DropComments requests to a custom HTTP(S) endpoint (e.g., local LLM, proxy, or alternative provider).
- Keep default behavior unchanged when no custom URL is configured.
- Provide clear documentation and in-product setting description.

Non‑Goals (this iteration):
- Implementing provider-specific request/response adapters beyond OpenAI-compatible schemas.
- Adding multiple endpoints or per-workspace overrides; a single global URL is sufficient initially.
- Managing authentication beyond the existing API key field.

## Scope
- In scope: A new setting (`dropcomments.apiUrl`), endpoint switching behavior, doc updates, and tests.
- Out of scope: UI for validating endpoints, automatic detection of provider capabilities, or schema transformation for non-compatible APIs.

## UX Details
- Setting name: `DropComments: Api Url`
- Setting key: `dropcomments.apiUrl`
- Type: string URL; empty string means “use default OpenAI endpoint”.
- Location: Settings > Extensions > DropComments.
- Behavior: Applies to all DropComments requests regardless of invocation method (Command Palette or context menu).

## Dependencies & Constraints
- Endpoint must be API-compatible with the current request format (OpenAI Chat Completions).
- If the custom endpoint requires different headers/auth, this is out of scope for this iteration (relies on the existing API key if relevant).
- Network errors and status codes are surfaced to the user via existing error messaging.

## Error Handling & Edge Cases
- Invalid/empty URL: Treat as not set; use default endpoint.
- Unreachable endpoint (timeouts, DNS, connection refused): Inform the user with an actionable error message consistent with existing error flows.
- Incompatible response schema: Present a clear error indicating the response could not be parsed.
- Self-signed certificates (HTTPS): Not explicitly handled in this PRD; default Node/VS Code behavior applies.

## Security & Privacy
- No additional secrets are stored; only the URL is added.
- Existing API key handling remains unchanged.
- Users are responsible for the trust boundary of their custom endpoints (documented caution recommended).

## Performance
- Negligible overhead. Network performance depends on the custom endpoint.

## Telemetry & Logging (Lightweight)
- Optional: Log a brief note to the DropComments output channel when a custom URL is in use (no sensitive data).

## Test Plan (High Level)
- Default path: With `dropcomments.apiUrl` unset, verify requests use the default endpoint and behavior is unchanged.
- Custom URL path: Set a valid custom URL (mock or test server) and verify requests are routed there and results are processed.
- Error scenarios: Simulate unreachable host/5xx and confirm user-friendly errors.
- Cross-entry parity: Validate identical behavior via Command Palette and context menu.

## Rollout & Documentation
- Version bump: minor.
- README: Add a short “Custom API URL” section with steps and compatibility note.
- CHANGELOG: Announce the new setting and its purpose.

## Success Metrics
- Qualitative: Users can successfully point DropComments at a local or proxy endpoint without code changes.
- Support signals: Reduction in requests for local-LLM support; minimal increase in configuration-related issues.

## Risks & Mitigations
- Risk: Users expect non-OpenAI-compatible endpoints to work.
	- Mitigation: Clearly state compatibility expectations in docs; note that non-compatible APIs may require adapters.
- Risk: Misconfiguration leading to silent failures.
	- Mitigation: Surface clear error messages and add a brief output log when a custom URL is active.

## Open Questions
- Should we allow per-workspace overrides for team-specific endpoints?
- Should we add a secondary setting for custom headers or auth tokens for non-OpenAI providers?