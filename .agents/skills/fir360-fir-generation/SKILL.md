---
name: fir360-fir-generation
description: Instructions for safely implementing and maintaining the FIR360 generation pipeline.
---

# FIR360 FIR Generation

These guidelines govern the FIR generation pipeline. Always refer to `AGENTS.md` for overall context. Do not invent or hardcode legal provisions, NCRB fields, or official formatting requirements not already present in the codebase.

## Pipeline Tracing and Mapping
- **Trace the Data**: Trace exactly how structured complaint data becomes the final FIR data.
- **Explicit Mapping**: Map data fields explicitly. Do not rely on implicit assumptions or guessing field names.
- **Preserve Provenance**: Preserve source information and data provenance where possible throughout the generation process.

## Validation and Generation
- **Required Fields**: Validate all required fields before attempting FIR generation. Do not invent information to fill required fields.
- **Distinguish Sources**: Strictly distinguish AI suggestions from information that has been explicitly confirmed by an officer.
- **Reviewable Legal Sections**: Ensure that any legal-section suggestions remain officer-reviewable.
- **Final Validation**: Validate the final FIR structure before proceeding to PDF generation.

## Verification
- **Output Verification**: Verify that the generated output contains the intended information accurately.
- **Test Formatting**: Test PDF generation and formatting pipelines after any relevant changes to ensure accuracy.
