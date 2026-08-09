---
name: fir360-architecture
description: Guidelines for understanding and safely modifying FIR360's architecture.
---

# FIR360 Architecture Guidelines

When tasked with architectural changes in the FIR360 system, follow these instructions to safely modify the codebase. Always refer to the core project rules in `AGENTS.md` before proceeding.

## Pre-modification Analysis
- **Inspect Existing Repository**: Before making any architectural decisions, inspect the existing codebase. Do not assume standard frameworks or layouts without verifying.
- **Identify Boundaries**: Clearly identify the boundaries between the frontend, backend, database (e.g., Supabase), and any MCPs.
- **Trace Data Flow**: Trace the relevant data flow from the citizen's complaint to structured output before making changes.
- **Map the System**: Identify important files, UI components, backend services, APIs, and database interactions.
- **Understand Conventions**: Understand the existing conventions in the project and adhere to them.

## Planning and Execution
- **Distinguish Architecture**: Clearly distinguish between the existing architecture and your proposed changes.
- **Avoid Rewrites**: Do not rewrite working components unnecessarily. Prefer the smallest safe change.
- **Create an Implementation Plan**: Produce a concise implementation plan before making significant architectural changes.
- **Risk Assessment**: Explicitly identify new dependencies, potential risks, and all affected areas.
- **Verify Fit**: Verify that proposed changes fit smoothly into the existing system and conform to established patterns.
