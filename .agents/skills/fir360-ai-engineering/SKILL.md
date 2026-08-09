---
name: fir360-ai-engineering
description: Engineering practices for safely managing AI-powered complaint processing in FIR360.
---

# FIR360 AI Engineering Practices

This skill outlines safe engineering practices for handling AI-generated data within the FIR360 complaint processing workflow. Refer to `AGENTS.md` for broader project instructions.

## Data Integrity and Handling
- **Preserve Original Statements**: Always preserve the original citizen statement intact.
- **Categorize Information**: Clearly distinguish between user-provided facts, AI-extracted facts, AI-inferred information, missing information, and AI suggestions.
- **No Hallucinations**: Never invent facts or assumptions that are not present in the citizen's statement or verified data.
- **Structured Outputs**: Use structured outputs where appropriate to handle AI-processed data reliably.

## Validation and Uncertainty
- **Validate Outputs**: Validate all AI outputs before they enter downstream workflows or are shown to the user.
- **Explicit Uncertainty**: Handle uncertainty explicitly. Do not silently transform uncertain AI inference into established fact.
- **Detect Gaps**: Accurately detect contradictions and genuinely missing information from the inputs.

## Human-in-the-Loop
- **Follow-up Questions**: Design follow-up questions based only on genuinely missing information.
- **Failure Modes**: Actively consider failure modes and hallucination risks during development.
- **Officer Review**: Keep officer review steps in the workflow where appropriate. Do not bypass the officer for the sake of automation.
