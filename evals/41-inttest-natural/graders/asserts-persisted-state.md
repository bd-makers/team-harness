---
type: llm
focus:
  source: file
  path: test/signup.test.js
---

This is an integration test file for the signup handler in `src/signup.js`, which stores users in a SQLite `users` table.

PASS if at least one test asserts on what is actually stored in the database after calling the handler (for example it reads the `users` table, or calls the repository's `findByEmail` and checks the row or the row count), in addition to the handler's returned status or body.

FAIL if every test checks only the handler's return value (status, body) or only the calls made to the fake mail dependency, and none reads the stored database state.
