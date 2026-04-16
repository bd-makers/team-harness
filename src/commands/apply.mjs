// apply = init semantics (detect → plan → dry-run → merge) but implies existing project.
// Same code path; different CLI verb for user clarity.
import { runInit } from './init.mjs';
export const runApply = runInit;
