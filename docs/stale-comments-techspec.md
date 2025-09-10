## Stale Comments Sidebar Feature Technical Specification

Corresponding PRD: `stale-comments-prd.md`

### 1. Objective
Provide a performant, low-friction workflow for detecting potentially stale code comments across a workspace and regenerating/updating them with AI via a dedicated sidebar. Must integrate cleanly with existing DropComments AI comment generation and remain opt‑in to avoid unexpected resource usage.

### 2. Scope
Included:
- Workspace scan (incremental) to identify candidate stale comments in supported languages.
- Heuristic scoring of “staleness”.
- TreeView sidebar (ViewContainer + View) listing stale comments grouped by file.
- Comment preview + regenerated replacement preview (inline diff style).
- One‑click regenerate (single) & batch regenerate (multi-select / all visible with confirmation).
- Apply / discard updated comments safely (editor edit transactions, no code loss).
- Manual refresh & optional autoscan triggers.
Excluded (initial iteration):
- Non-text resources (e.g., notebooks).
- Deep semantic code analysis (AST cross-file symbol dependency graphs beyond immediate file).
- Multi-language embedded regions (e.g., HTML with inline JS) beyond basic token detection already present.

### 3. Assumptions
1. Git is available in most user workspaces; if absent, we fallback to file modified timestamps only (reduced heuristic fidelity).
2. Comments are considered stale if they no longer match adjacent code structure, symbols, or inferred intent.
3. Performance budget: initial full scan < 5 seconds for <= 2k source files (heuristic short-circuit + size limits); incremental updates < 250ms per changed file.
4. AI token usage must be minimized: regeneration only sends relevant code span (function / block) instead of whole file.
5. User will bump extension version post feature before publish pipeline handles release.

### 4. Supported Languages
Reuse existing `COMMENT_TOKENS` (JS/TS, Python, Java, C#, C/C++, Go, Rust, PHP, Ruby, Bash/Shell, PowerShell, SQL, HTML/XML, CSS/SCSS/SASS, Less). Stale detection will restrict heuristics requiring structural parsing to languages where lightweight function signature regex patterns are feasible (JS/TS, Python, Java, C#, Go, Rust). Others fall back to simpler heuristics (age + mismatch keywords).

### 5. Heuristic Staleness Model
Each comment candidate receives a score in [0,100]. Threshold configurable (default ≥ 55 triggers listing).

Heuristic components (default weights in parentheses – configurable):
1. Symbol Drift (25): Names found in comment (identifier tokens) absent / renamed in subsequent N lines of code.
2. Signature Mismatch (20): Function/method signature changed (arity or parameter names) since last recorded snapshot (Git blame earliest commit vs current).
3. Code vs Comment Embedding Divergence (15): Cosine similarity below threshold using a lightweight bag-of-words / hashing (no external ML dependency) between normalized comment text and code body summary.
4. Age (15): Days since last modification of code block > X while comment unchanged (from blame). Scaled.
5. Dead Reference (15): Comment references file/line numbers / TODO markers resolved.
6. Complexity Delta (10): Cyclomatic hint (count of branching tokens) changed > factor while comment length static.

Score = sum(weight_i * condition_i_factor). Each factor ∈ [0,1].

Performance consideration: Only perform Signature + Complexity heuristics for blocks < MAX_BLOCK_LINES (e.g., 400). Larger blocks flagged only by Age + Drift.

### 6. Data Model
Interface-like (conceptual) objects:
- StaleCommentItem
  - id (stable hash: file path + start line + excerpt)
  - filePath
  - range (start line, end line)
  - originalCommentText
  - surroundingCode (trimmed function / block text)
  - score (number)
  - reasons (string[] human-readable heuristics triggers)
  - lastModified (Date) (comment vs code delta info)
  - languageId
  - status: detected | regenerating | updated | applied | dismissed
  - regeneratedText? (comment-only or full block with inserted comment variant depending mode)

Cache: In‑memory Map<filePath, StaleCommentItem[]> + persisted ephemeral state in `ExtensionContext.workspaceState` keyed by hash to avoid reprocessing unchanged files (store file mtime + git head hash fragment + per-item score snapshot).

### 7. Extension Contributions
Add to package.json (conceptual; actual implementation later):
- `viewsContainers`: activity bar or explorer container: id: `dropcomments-stale`.
- `views`: id: `dropcomments.staleComments`.
- Commands:
  - `dropcomments.stale.scanWorkspace`
  - `dropcomments.stale.rescanFile`
  - `dropcomments.stale.openLocation`
  - `dropcomments.stale.regenerate`
  - `dropcomments.stale.regenerateAll`
  - `dropcomments.stale.apply`
  - `dropcomments.stale.dismiss`
  - `dropcomments.stale.refreshView`

### 8. User Workflow
1. User opens Stale Comments panel → prompt (if first use) to run initial scan.
2. Scan populates list grouped by file; each child shows: score badge, line range, truncated snippet.
3. Click item: opens side preview (custom WebviewPanel or diff view) with:
   - Original code (left) vs Proposed new code (right) OR existing + preview embedded new comment.
   - Buttons: Regenerate (if not yet), Apply, Dismiss, Copy.
4. Regenerate triggers AI prompt (context-limited): sends surrounding block + instruction: “Update ONLY the comment at lines X-Y; keep code unchanged”.
5. User Accepts → apply workspace edit (replace comment range). Update item status to applied; remove or archive in view.
6. Batch regenerate: multi-select → queue with concurrency limit (e.g., 3 in flight) to avoid rate limiting.

### 9. AI Prompt Design (Delta vs Existing)
Goal: Avoid rewriting entire code; only adjust comment.
Prompt components:
- Context: language, code block, original comment.
- Instruction: produce refined comment matching current code logic; keep semantics current; no unrelated commentary; output just new comment text (no code) OR optionally full block with comment if needed (config flag; default comment-only to simplify patching).

Two modes:
1. Comment-only (preferred): Insert into existing location.
2. Full-block (fallback if structural offset uncertain; triggered if cannot confidently isolate comment lines — e.g., multi-line block with interleaved code markers).

### 10. Detection Pipeline
Stages per file:
1. Collect candidate comments:
   - Use regex tokenization based on line or block delimiters.
   - Exclude license headers, generated markers (`@generated`, `eslint-disable`, etc.).
2. Build minimal symbol table (regex for identifiers + function signatures).
3. Apply heuristics quickly; store reasons for those crossing threshold.
4. Debounce large workspace scanning (chunk by N files via `setTimeout` / `schedule` to keep UI responsive).
5. Persist summary to workspaceState.

Incremental updates:
- Listen to `workspace.onDidSaveTextDocument` + `onDidChangeWorkspaceFolders` + FS watchers for rename.
- Rescan changed file only.

### 11. Performance Strategies
- Hard cap: skip files > 1 MB (mark as skipped). Optionally show count of skipped.
- Parallelism: process in small async batches (e.g., 25 files per tick) to yield event loop.
- Hash caching: compute fast non-cryptographic hash (e.g., FNV-1a) of file text slice limited to comment + signature lines to short-circuit re-analysis.
- Avoid AI calls during detection; only on explicit regenerate.

### 12. Configuration Additions
New settings (all under `dropcomments.*`):
- `stale.enable` (boolean, default false)
- `stale.autoScanOnOpen` (boolean, default true when enabled)
- `stale.maxScanFiles` (number, default 5000)
- `stale.scoreThreshold` (number, default 55)
- `stale.excludeGlobs` (string[], default typical build/test-dist patterns)
- `stale.batchConcurrency` (number, default 3)
- `stale.commentOnlyRegeneration` (boolean, default true)
- `stale.showLowConfidence` (boolean, default false) – items with score within 10 points below threshold.
- `stale.gitHistoryDepth` (number, default 20) – max blame traversals.
- `stale.heuristics.weights` (object) – override for advanced users.

### 13. Commands Behavior Summary
- scanWorkspace: Clears previous results (or incremental merge) → runs detection pipeline.
- regenerate: Single item → AI call → store regeneratedText.
- regenerateAll: For all items without regeneratedText; progress UI + cancel token.
- apply: Writes updated comment. If comment-only mode: replace exact range; else diff insert.
- dismiss: Removes item (store id in dismissal set until next full scan or version update).
- openLocation: Reveals file + selects range.
- refreshView: Re-renders tree using current cache.

### 14. Tree View Representation
Tree root nodes = files with at least one stale item.
Label: file name; description: count + highest score.
Children: comment snippet (first line trimmed to 80 chars) + score badge (tooltip includes reasons list & heuristic breakdown).
Context keys (`when` clauses) enable context menu options (regenerate/apply/dismiss) depending on status.

### 15. Error Handling & Resilience
- Git unavailability: log info; disable signature/age heuristics silently; mark items as lower confidence. Provide tooltip note.
- AI failures: set status=detected (retain) + show error message; allow retry.
- Apply race: If document changed since detection, revalidate line range hash (extract substring; if mismatch, prompt user to rescan that block before applying).
- Large file skip: Add virtual item “(skipped large file)” under file header if user explicitly opens.

### 16. Telemetry (Optional / Future)
Not implemented initially. Hooks can be added around regenerate/apply to count interactions (respect privacy; disabled unless user opts in later feature).

### 17. Security & Privacy
- No whole-file upload beyond necessary block for regeneration.
- Strip any secrets-looking tokens from prompt context (simple regex for common secret patterns) before sending.
- Avoid sending comments marked with proprietary markers (e.g., `CONFIDENTIAL`).

### 18. Testing Strategy
Unit:
- Heuristic scoring given synthetic code/comment pairs (edge: renamed symbol, parameter count change).
- Parsing of comment tokens across languages.
Integration:
- Workspace scan on sample project (≤ 50 files) ensures items appear with correct scores.
- Regeneration path ensures only comment replaced.
Manual:
- Large workspace stress test.
- Git absent scenario.

Edge Cases:
1. Multi-line block comments containing code-like text – ensure not mis-parsed as code change.
2. Inline comments inside arrays / objects – avoid merging logic altering formatting.
3. Comment after trailing code on same line – comment-only mode must preserve code.
4. Rapid file save bursts – debounce rescans.
5. Non-UTF8 file – skip gracefully.

### 19. Step-by-Step Implementation Guide
1. Add new config schema entries in package manifest.
2. Implement stale detection service module:
   - Public API: initialize(context), scanWorkspace(progressCb, token), scanFile(uri), getItems(), regenerate(item), apply(item), dismiss(item).
3. Implement heuristic analyzers (pure functions) returning {score, reasons}.
4. Build TreeDataProvider bridging service -> UI (events: onDidChangeTreeData).
5. Register view & commands in activation; honor `stale.enable` flag.
6. Implement regeneration prompt builder (comment-only path) leveraging existing AI client; add method to produce minimal prompt.
7. Add preview UX: reuse diff via `vscode.diff` command OR custom Webview if richer formatting needed (start with diff for speed).
8. Add batch regenerate queue with concurrency semaphore; integrate cancellation token.
9. Add race-protection before apply: verify current document slice matches stored snapshot hash; if mismatch: re-run detection for that block before applying.
10. Persist cache + dismissal set in workspaceState (serialize only essential fields).
11. Add incremental watchers for saves, renames; hook into service.scanFile.
12. Optimize performance (profiling pass) and add bailouts for large files.
13. Write unit tests for heuristics & service glue.
14. Update README (feature overview, settings, limitations).
15. Bump extension version; verify pipeline builds & publishes.

### 20. Risks & Mitigations
- False positives: Provide score + reasons for transparency; allow dismiss / threshold adjust.
- Performance degradation on huge repos: Exclusion globs + max file cap + incremental scanning.
- AI rewriting code inadvertently: comment-only default + strict prompt + hash validation before apply.
- Rate limiting: Concurrency cap + user-driven regeneration only.

### 21. Future Enhancements (Not in MVP)
- ML model fine-tuned staleness classifier (offline) replacing heuristic blend.
- Inline code lens indicators for stale comments.
- Auto-schedule background rescans.
- Telemetry-based adaptive heuristic weight tuning.

### 22. Requirements Coverage Mapping
PRD Items → Spec Elements:
- List stale comments → Sections 7, 14 (Tree view) & detection pipeline.
- Show file, line, snippet → Data model + Tree child representation.
- Filter/sort → Score-based ordering; future enhancement could add explicit filters (initial: sort by score desc, file grouping; config for min score).
- Preview + regenerate → Workflow + AI Prompt design.
- Accept / reject → Commands apply/dismiss.
- Real-time update → Incremental watchers + events.
- Multi-language support → Reuse token map; heuristics degrade gracefully.
- Non-destructive → Apply flow with hash validation.

### 23. Open Questions / Clarifications (If needed later)
- Should we persist user modified regenerated comments if they edit manually before apply? (Initial: apply directly; no intermediate draft editing.)
- Provide explicit filter UI for reasons categories? (Future.)
- Should Age heuristic rely on commit timestamp or authored date? (Use commit timestamp now.)

---
End of Technical Specification.
