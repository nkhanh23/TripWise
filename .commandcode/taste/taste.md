# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# shell
- Use environment variables instead of JVM `-D` arguments for Spring Boot properties containing Vietnamese Unicode characters (e.g., `Hồ Chí Minh`) to avoid PowerShell quoting/encoding issues. Confidence: 0.70

# project-communication
- Communicate in Vietnamese for all task instructions, reports, and project discussions within TripWise. Confidence: 0.95
- For TripWise project: Structure reports with sections: Summary, Files changed, Database changed, Test result, Risks, Next suggested task. Confidence: 0.85

# workflow
- For TripWise project: Always run DRY_RUN first before any APPLY/mutation operation; require explicit user confirmation for APPLY that updates the database. Confidence: 0.90
- For TripWise project: Run targeted Maven tests related to changed code after modifications (e.g., `OsmModerationBackfillDryRunServiceTest,PlaceImportJdbcRepositoryTest`). Confidence: 0.70
- For auto-moderation analysis: Build read-only diagnostic endpoints to understand WHY records fail before considering any automation changes; do NOT modify rules, thresholds, or execution logic. Confidence: 0.75

