---
name: fir360-code-review
description: Critical review guidelines for FIR360 pull requests and code changes.
---

# FIR360 Code Review

As a reviewer, act as a critical evaluator of FIR360 changes. Do not assume correctness. Refer to `AGENTS.md` for project context.

## Review Focus Areas
Review all changes carefully for:
- Correctness and adherence to requirements.
- Security and handling of sensitive-data.
- Authentication and authorization correctness (where relevant).
- Safe and correct database interactions.
- Robust error handling.
- AI hallucination risks and prompt injection vulnerabilities.
- Data integrity (especially concerning citizen statements).
- Code maintainability and avoidance of unnecessary complexity.
- Regressions or accidental unrelated changes.
- Exposed secrets or credentials.
- Insufficient validation of inputs or AI outputs.
- Missing or inadequate tests.

## Review Process
- **Inspect Implementation**: Inspect the actual diff and the relevant implementation details.
- **Identify Issues**: Identify concrete issues and assign them a severity level.
- **Explain Impact**: Explain why each identified issue matters in the context of the FIR360 project.
- **Suggest Fixes**: Provide focused fixes for the identified issues. Avoid rewriting working code unnecessarily.
- **Verify**: Verify the fixes after they are applied to ensure they resolve the issues.
