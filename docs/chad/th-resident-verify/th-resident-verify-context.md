# th-resident-verify — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: Implement the approved V1 declared JSON Schema boundary verifier.
- Current atomic step: Commit the verified implementation, then run the no-mistakes delivery pipeline.
- Stop / human-decision condition: Stop only if an external dependency becomes necessary or no-mistakes produces an ask-user finding.

## Constraints and settled decisions
- Node built-ins only; no OpenAPI resolver, TypeScript AST, Zod execution, CI gate, or done hard gate.
- Boundary declaration stays in the task spec; no new task SSOT file.
- Gate is a Claude PreToolUse plan-checkbox transition; standalone CLI remains available to all surfaces.

## JIT retrieval map
- Identifiers / symbols: `runBoundary`, `runTask`, `deepMergeJson`, `CHECKS`.
- Narrow globs: `src/commands/*.mjs`, `templates/.claude/**`, `tests/*.test.mjs`, `tests/e2e/*.test.mjs`.
- Read next: task/context tests, apply sandbox helper, settings template.
- Verification command: `npm test` (164 functional + 1 serialized performance test passed).

## Failure capsules (max 3 unresolved)
### F-001
- Signal:
- Tried:
- Compact finding / current hypothesis:
- Next discriminator:
- Source (safe path or command):

## Resume checklist
- Review the staged diff, commit only this task, and drive no-mistakes without `--yes`.
