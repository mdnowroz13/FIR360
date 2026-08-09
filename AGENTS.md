<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# FIR360 Project Instructions

## 1. Project Context

FIR360 is an AI-assisted FIR preparation system designed for police officers.

The system helps transform an unstructured citizen complaint into structured case information, identify missing details, generate relevant follow-up questions, assist with legal-section suggestions, and prepare an FIR in the required format for officer review.

The AI assists the officer. It does not replace the officer's judgment or final authority.

## 2. Development Approach

Before modifying code:

1. Inspect the existing implementation and understand the relevant flow.
2. Identify the files and components that need to change.
3. Prefer the smallest safe change that solves the problem.
4. Do not rewrite working components unnecessarily.
5. Preserve existing architecture and conventions unless there is a clear technical reason to change them.
6. Explain what you intend to change before making significant architectural changes.

## 3. AI Data Integrity

Never invent facts that are not present in the citizen's statement or verified application data.

Clearly distinguish between:

- User-provided facts
- AI-extracted facts
- AI-inferred information
- Missing information
- AI-generated suggestions

When information is uncertain or missing, preserve that uncertainty.

Do not silently fill missing FIR information with assumptions.

The original citizen statement must remain traceable to the structured information derived from it.

## 4. Legal and FIR Safety

AI-generated legal sections and legal suggestions must be treated as suggestions for officer review.

Never represent an AI suggestion as a final legal determination.

The police officer must be able to review, edit, and confirm the relevant sections and important FIR information before final generation.

Do not remove or bypass officer confirmation in order to make the workflow appear more automated.

## 5. Supabase and MCP

Supabase is part of the application's backend/data layer.

When using Supabase MCP:

- Inspect the existing schema before making database changes.
- Prefer safe, targeted changes.
- Do not delete or reset production data without explicit approval.
- Do not expose secrets, tokens, API keys, or credentials.
- Verify database changes after making them.
- Explain database changes and why they are necessary.

## 6. Security and Sensitive Data

Treat complaint information, personal information, police information, and case information as sensitive.

Never hardcode credentials, API keys, access tokens, passwords, or secrets.

Never commit secrets to the repository.

Do not expose sensitive information in logs, test fixtures, screenshots, or generated output unless it is intentionally mocked.

## 7. Testing and Verification

After significant changes:

1. Run the relevant tests or verification.
2. Check the actual application behavior where possible.
3. Verify both successful and failure paths.
4. Do not claim something works without testing it.
5. Report failures honestly instead of hiding or bypassing them.

For AI functionality, test:

- Correct fact extraction
- Missing information
- Contradictory information
- Unclear statements
- Hallucination or invented facts
- Follow-up question quality
- Officer confirmation flow
- Final FIR generation

## 8. AI Agent Behavior

Do not blindly implement a user's requested solution if inspection reveals a safer or more correct approach.

Before significant changes, explain:

- What is changing
- Why it is changing
- Which files are affected
- How it will be verified

After implementation, report:

- What changed
- What was tested
- What passed
- What remains uncertain or needs manual verification

## 9. Do Not Over-Engineer

Prefer simple, maintainable solutions.

Do not add a new dependency, service, MCP, abstraction, agent, or framework unless it solves a real project requirement.

Do not modify unrelated parts of the application.

## 10. Git and Review

Keep changes focused and reviewable.

Before committing significant work:

- Inspect the diff.
- Check for accidental changes.
- Check for secrets.
- Verify relevant tests.
- Summarize the change clearly.

Do not create commits or push changes unless explicitly requested.

## 11. Current Product Boundary

The current hackathon version uses text input for the citizen complaint.

Do not add or restore voice-agent functionality unless explicitly requested.

The current workflow should focus on:

Citizen statement
→ Structured case information
→ Missing-detail detection
→ Follow-up questions
→ Officer review
→ Legal-section suggestions
→ Officer confirmation
→ FIR generation
→ PDF/output
