# AGENTS.md — shared GitHub workflows

This public repository owns reusable GitHub workflow infrastructure for repositories under `ekusiek716`.

## Implementation rules

- Keep reusable workflows read-only unless a workflow's purpose explicitly requires writes.
- Do not add OpenAI, Anthropic, or other paid AI API credentials.
- Prefer the caller repository's short-lived `GITHUB_TOKEN` with the minimum permissions required.
- Do not use `pull_request_target` or check out untrusted pull request code for review-receipt workflows.
- A GitHub review receipt must match the pull request's current HEAD commit. Keep PR-level reaction evidence explicitly labeled as not SHA-bound.
- Timeouts and missing evidence must fail visibly; do not use `continue-on-error` to turn skipped review work green.
- Pin third-party actions to a full commit SHA and document the corresponding release.

## Review guidelines

- Prioritize permission escalation, secret exposure, prompt-injection surfaces, untrusted checkout, stale-SHA acceptance, and false-green failure modes.
- Verify reusable workflow syntax, caller permissions, event coverage, concurrency, timeout behavior, and the documented limitation of PR reactions.
- Do not recommend merge until the workflow is exercised by a real pull request in a caller repository.
