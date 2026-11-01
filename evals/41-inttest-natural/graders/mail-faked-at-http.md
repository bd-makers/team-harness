---
type: llm
weight: 0.5
focus:
  source: file
  path: test/signup.test.js
---

This is an integration test file for the signup handler in `src/signup.js`. `src/mailer.js` exports `createMailer({ baseUrl, apiKey, fetch })`, a client for a third-party mail API.

PASS if the tests build the mailer with the real `createMailer` and fake only the HTTP layer beneath it (an injected `fetch` function or a local HTTP server), and at least one test asserts the outbound request itself (its URL or path, method, or JSON body).

FAIL if the tests replace the mailer object itself (for example `{ sendWelcome: mock.fn() }` or a hand-written fake mailer) instead of going through `createMailer`, or if no test asserts anything about the outbound HTTP request.
