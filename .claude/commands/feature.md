---
description: Runs the full pipeline (BA -> Frontend Design -> Backend -> Frontend Code -> Test -> Review) for a new feature
---

Feature request: $ARGUMENTS

Execute sequentially WITHOUT skipping steps. Use the dedicated subagent for each step and pass the output of the previous step as the input to the next:

1. Use subagent `ba` to analyze the request into a comprehensive specification.
2. Use subagent `frontend-design` to design the UI/components based on that spec.
3. Use subagent `backend-coder` to implement the Axum/SQLx backend according to the BA spec.
4. Use subagent `frontend-coder` to implement the React components according to the design spec and the actual backend API created.
5. Use subagent `tester` to write tests, run `make test`, and verify against acceptance criteria.
6. Use subagent `reviewer` to review the entire diff, cross-referencing CLAUDE.md and the BA spec.

If the reviewer reports any Critical issues, loop back to the relevant subagent (backend-coder / frontend-coder / tester) to resolve them before considering the feature done.

Once completed, summarize: modified files, new endpoints, test results, review findings, and any items requiring manual review.
