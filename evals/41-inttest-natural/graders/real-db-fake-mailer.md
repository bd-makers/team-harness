---
type: llm
focus:
  source: file
  path: test/signup.test.js
---

This is an integration test file for the signup handler in `src/signup.js`. The handler has two dependencies:
- a managed one the app owns: the SQLite database (`node:sqlite`, schema from `migrate()` in `src/db.js`, accessed through `src/users-repo.js`);
- an unmanaged one: a third-party mail API that `src/mailer.js` calls over HTTP.

PASS if both hold:
1. The database is real: the tests create a real SQLite database (for example `new DatabaseSync(':memory:')` or `openDb(':memory:')`), build the schema with the project's `migrate()`, and do not mock, stub, spy on, or hand-write a fake for the database, `src/db.js`, or `src/users-repo.js`.
2. The mail API is the only thing faked: the fake replaces either the mailer passed to the handler or the HTTP layer underneath it (an injected `fetch`, a local HTTP server), and no real mail API request leaves the process.

FAIL if either does not hold.
