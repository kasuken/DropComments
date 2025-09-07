# DropComments: Custom API URL — Technical Specification

## Context
Enable a configurable API base URL so DropComments can route AI requests to a user-provided endpoint (e.g., local LLM proxy) while preserving default behavior for OpenAI when unset. This change must be additive and non-breaking, and it must work from both the Command Palette and editor context menu.

## Goals (from PRD)
- Introduce a new configuration setting `dropcomments.apiUrl` (string; empty = use default OpenAI endpoint).
- When set and valid, route all AI requests to this base URL; when unset/invalid, use the default endpoint.
- Maintain existing user workflows and behavior for those who do not configure the setting.
- Document the feature and update the changelog.

## Non-Goals
- Provider-specific adapters or schema transformations for non–OpenAI-compatible APIs.
- Multiple endpoints, per-workspace overrides, or custom headers/auth settings.
- Endpoint validation UI or health checks beyond standard error surfacing.

## Assumptions
- Custom endpoints are OpenAI Chat Completions–compatible.
- Authentication uses the existing `dropcomments.apiKey` when relevant.
- Existing workspace trust checks remain in place.

## Contracts (Inputs/Outputs)
- Inputs
  - Settings: `dropcomments.apiKey` (string), `dropcomments.apiUrl` (string), `dropcomments.model` (string), `dropcomments.commentStyle` (enum), `dropcomments.useEmojis` (boolean).
  - Editor selection (text) and document language ID.
- Outputs
  - Editor selection replaced with the same code augmented by comments, preserving execution semantics.
- Error modes
  - Missing API key → existing prompt to configure key.
  - Invalid/empty `apiUrl` → treated as unset; fallback to default endpoint and log a low-verbosity note.
  - Network/HTTP errors → surfaced as today (401/429/5xx); if `apiUrl` is set, include a small log hint for triage.
  - Incompatible schema → explicit error indicating unexpected response format.
- Success criteria
  - With a valid http(s) `apiUrl`, requests route to that endpoint and comment generation completes.
  - With unset/invalid `apiUrl`, behavior matches current release.

## Architecture & Data Flow
- Configuration layer
  - Add `dropcomments.apiUrl` to `package.json` configuration contributions.
  - Read together with existing settings at request time (or within client initialization).
- AI client layer
  - Initialize the OpenAI client with `apiKey` and conditionally a `baseURL` derived from `apiUrl` when valid.
  - Re-initialize only when either `apiKey` or `apiUrl` changes.
  - Log a one-liner to the output channel when a custom endpoint is active (no secrets; scheme + host only).
- Command handlers
  - No changes to invocation flow; both commands share the same handler path.

### Validation and Fallback
- URL parsing using a standard parser; accept only `http:` or `https:` protocols.
- Empty string/whitespace or parsing failures → ignore and fallback to default endpoint.
- Self-signed HTTPS certs: default Node behavior applies; documented caveat.

## Detailed Implementation Guide (Step-by-Step)
1. Configuration contribution
  - Add `dropcomments.apiUrl` under `contributes.configuration.properties` with:
    - type: `string`, default: `""`
    - title: "DropComments: Api Url"
    - description: "Optional base URL for the AI API (OpenAI-compatible). Leave empty to use the default OpenAI endpoint."
2. Settings retrieval
  - Where the API key is currently read, also read `apiUrl`.
  - Normalize and validate `apiUrl`:
    - Trim.
    - Parse via URL constructor; accept only `http:` or `https:`.
    - If invalid, treat as unset and log a short note to the output channel indicating fallback.
3. AI client initialization
  - Build the OpenAI client options from existing logic and include `baseURL` only when `apiUrl` is valid and non-empty.
  - Recreate the client only if `apiKey` or normalized `apiUrl` changed since last initialization.
  - If a custom endpoint is active, log: "Using custom AI endpoint: <scheme>//<host>".
4. Request flow and errors
  - No changes to prompt/model/style/emoji logic or selection truncation.
  - Error handling remains as-is; if a custom endpoint is active, prefix output channel errors with a small tag (e.g., "[Custom endpoint]") to aid debugging.
5. Documentation
  - README: add a "Custom API URL" section with setup steps and compatibility notes.
  - CHANGELOG: add an entry under Added.
6. Testing
  - Unit: URL validation (good/bad protocols; parse failures), client configuration (baseURL applied only when valid).
  - Integration: Use a mock server that returns OpenAI-compatible responses; verify routing, success, and error paths (401/429/5xx, unreachable host).
  - Manual: Verify parity between palette and context menu; check behavior for unset, valid local URL, malformed URL, and unreachable endpoint.

## Edge Cases
- Base URL with path or trailing slash: allowed; client should handle a base URL that includes a path prefix.
- Rapid toggling of settings: ensure re-initialization occurs only on value change to avoid churn.

## Security & Privacy
- Never log API keys or request bodies.
- When logging custom endpoint, log scheme + host only; omit userinfo, queries, and paths where possible.
- Honor existing workspace trust gate before starting network requests.

## Performance
- Negligible overhead for URL parsing and occasional client re-init.

## Backward Compatibility
- Unset/invalid `apiUrl` → identical behavior to current versions.

## Rollout
- Version bump: minor.
- Update README and CHANGELOG.

## Risks & Mitigations
- Non-compatible endpoints → document OpenAI-compatibility and present clear parse/compatibility errors.
- Silent fallback confusion → always log when a custom URL is used or ignored due to invalidity.

## Open Questions
- Future: per-workspace endpoint overrides for team setups?
- Future: settings for custom headers or tokens?