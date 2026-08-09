---
name: fir360-testing
description: Systematic testing guidelines for the FIR360 workflow and AI behavior.
---

# FIR360 Testing Guidelines

This skill helps ensure FIR360 is tested systematically rather than assuming code works. Refer to `AGENTS.md` for general testing rules.

## Testing Strategy
- **Inspect First**: Inspect existing tests and testing frameworks before creating new ones.
- **Complete Workflow**: Test the complete workflow where practical, rather than just isolated units.
- **Honest Reporting**: Report failures honestly. Never claim success without actual verification.
- **Verification Types**: Clearly distinguish between automated verification and tasks that require manual verification.
- **UI Behavior**: Verify UI behavior where possible when changes affect the frontend.

## Scenarios to Test
Test the following scenarios systematically:
- Normal successful inputs.
- Incomplete complaints.
- Ambiguous complaints.
- Contradictory information.
- Missing required information.
- AI extraction failures.
- Follow-up question generation.
- Officer confirmation steps.
- Legal-section suggestions correctness.
- Final FIR generation accuracy.
- Final PDF output formatting and data inclusion.
