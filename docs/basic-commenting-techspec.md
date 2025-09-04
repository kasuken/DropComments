# DropComments: Basic Commenting & Settings — Technical Specification

## Overview
- Purpose: Implement the initial “Select code → Add AI-generated comments” capability for the DropComments VS Code extension.
- Goals: Meet PRD acceptance criteria, establish a clean architecture for future settings and features, and ensure secure handling of the OpenAI API key stored in VS Code settings.
- Non-goals: Advanced prompt customization, multi-model orchestration, bulk file processing, or code review integrations (deferred to later releases).

## Assumptions
- Users have a valid OpenAI API key and an active internet connection.
- Initial target is common text/code files supported by VS Code; language-specific formatting is minimal in v0.1.
- Network requests are allowed by the user’s environment (no corporate proxy blocks that prevent HTTPS calls to OpenAI).
- Workspace Trust is enabled; if not trusted, AI features should be disabled gracefully.

## PRD Summary (for traceability)
- Users can select a portion of code in the editor and trigger an action that adds AI-generated comments.
- The OpenAI API key is stored under a custom DropComments settings section in VS Code.
- More settings will be added over time; the first release ships basic functionality only.

## Acceptance Criteria Mapping
- Select code → Run command → Comments added: Command is accessible via Command Palette; requires a non-empty selection; inserts comments at a predictable location using appropriate comment tokens.
- Read API key from custom settings: A namespaced setting (e.g., `dropcomments.apiKey`) is defined and read at runtime; user gets a clear error if missing, with an action to open settings.
- Settings visible in VS Code: A DropComments section is contributed in VS Code settings describing the API key field and placeholders for future options.
- Extensible settings: Configuration surface leaves room for future options without breaking the initial contract.
- Works for basic commenting: Handles typical selections across common languages with sane defaults.

## Current Codebase Integration Points
- Manifest (`package.json`):
  - Currently exposes a sample command `dropcomments.helloWorld` and no activation events.
  - Will need to add a new command for commenting and define activation events.
  - Will need to contribute configuration for `dropcomments` settings (API key now, placeholders for later).
- Extension entry (`src/extension.ts`):
  - Currently registers `dropcomments.helloWorld` and shows a message.
  - Will add a new command handler for the commenting workflow, including selection validation and edit application.
- Tests (`src/test/extension.test.ts`):
  - Currently contains a sample test; will be extended with tests for selection validation, fallback tokens, and success path using mocks.

## High-Level Architecture
- Command Layer
  - VS Code command: `dropcomments.addComments` (title: “DropComments: Add Comments to Selection”).
  - Activation Event: `onCommand:dropcomments.addComments` to minimize startup cost.
  - Entry point retrieves active editor and selection; validates preconditions and coordinates downstream calls.
- Settings & Secrets
  - VS Code configuration keys under `dropcomments.*` (user scope):
    - `dropcomments.apiKey` (required): OpenAI API key.
    - Future (declared but optional in v0.1): `dropcomments.model`, `dropcomments.commentStyle`.
  - Provide an “Open Settings” action when the API key is missing.
- Comment Strategy
  - Language detection via `TextDocument.languageId`.
  - Resolve comment tokens using a small internal map for common languages; fallback to `//` or a safe block comment when unknown.
  - Insertion policy: Insert a block or line-based comment immediately above the start of the selection.
- AI Client
  - Minimal HTTP client to call the OpenAI chat/completions API using the configured API key.
  - Prompt template includes language hint and a concise instruction to produce high-signal, non-redundant comments.
  - Apply a timeout and a light retry (429/5xx) with small backoff and jitter.
- UX & Feedback
  - Progress notification while generating comments.
  - Output Channel named “DropComments” for debug logs (no secrets, no code contents, only metadata and errors).
  - Friendly error messages for missing key, no selection, or network/API issues.

## Data Flow
1. User selects code in the editor.
2. User triggers the command via the Command Palette.
3. Extension validates selection and presence of API key.
4. Build prompt with language hint and selected code (truncate if overly large).
5. Send request to OpenAI and await response.
6. Normalize AI response into appropriate comment format (line/block tokens).
7. Apply a single edit to insert the comments above the selection.
8. Notify user of success or failure.

## Configuration (v0.1)
- `dropcomments.apiKey` (string, default empty)
  - Description: “OpenAI API key used by DropComments.”
  - Scope: User-level (application/machine scope as supported by VS Code settings)
- Future placeholders (optional, no behavior changes in v0.1):
  - `dropcomments.model` (string, default: a lightweight model)
  - `dropcomments.commentStyle` (enum: `succinct` | `detailed`, default: `succinct`)

## UX Behavior & Edge Cases
- No selection: Show warning (“Please select some code to comment.”) and exit early.
- Missing API key: Show error with an action to open settings scoped to DropComments.
- Large selection: Truncate prompt content to remain within token budget; note this in logs.
- Unsupported language: Use safe defaults (`//` or `/* */`); do not insert malformed comment tokens.
- Invalid API key / API error: Show summarized error and suggest checking the key or retrying later.

## Performance Considerations
- Use async flow; avoid blocking the UI thread.
- Timeout for network calls (e.g., ~20s) and a single lightweight retry for transient failures.
- Apply edits in a single batch to minimize flicker and improve undo behavior.

## Security & Privacy
- Never log the API key or full user code.
- Only send the minimum necessary selection to the AI API.
- Respect Workspace Trust: if untrusted, disable the command with a notice to the user.

## Testing Strategy
- Automated tests (extension tests):
  - Selection required path (no selection → warning).
  - Missing API key path (error + open settings action stub).
  - Success path: mock AI client to return a deterministic comment; verify insertion position and token format.
  - Unsupported language fallback logic.
  - Error path when AI client returns a failure.
- Manual smoke tests across TS/JS, Python, C#, and Java to verify comment token handling.

## Step-by-Step Implementation Guide
1) Manifest updates (no code):
   - Add `contributes.commands` entry for `dropcomments.addComments` with a clear title.
   - Add `activationEvents` with `onCommand:dropcomments.addComments`.
   - Add `contributes.configuration` for `dropcomments.apiKey` and placeholders (`model`, `commentStyle`).
2) Command handler wiring (no code here):
   - On activation, register the `dropcomments.addComments` command.
   - In the handler: retrieve active editor and selection; validate.
   - Resolve comment tokens based on language id; choose line vs block appropriately.
   - Read `dropcomments.apiKey` from configuration and validate presence.
   - Show progress while invoking the AI client; handle timeout/retry.
   - Insert the generated comments above the selection with a single edit.
   - Show a succinct success or descriptive error message.
3) AI client (no code here):
   - Create a minimal wrapper around the OpenAI API with configurable key and timeouts.
   - Implement tiny retry/backoff policy and clear error messaging.
   - Keep logs in the Output Channel without exposing secrets or user code.
4) Prompt builder (no code here):
   - Template includes: language name, instruction to produce concise, helpful comments, and the selected code as input.
   - Ensure the output is purely comments suitable for the target language.
5) Tests (no code here):
   - Add tests for no selection, missing key, success with mock, and fallback tokens.
   - Consider a test utility for mapping language ids to comment tokens.
6) Documentation & metadata:
   - Update README with a Settings section describing how to set `DropComments: API Key`.
   - Ensure CHANGELOG’s v0.1 entry covers the basic commenting capability.

## Risks & Mitigations
- Risk: API quota limits or 429s impact UX → Mitigation: simple retry, clear messaging.
- Risk: Language token mismatch inserts malformed comments → Mitigation: conservative defaults and unit tests.
- Risk: Missing key leads to user confusion → Mitigation: actionable error with direct link to settings.

## Milestones
- M1: Manifest contributions (command, activation, configuration).
- M2: Command handler skeleton with selection and settings validation.
- M3: AI integration and comment insertion happy path.
- M4: Error handling, tests, and documentation polish.