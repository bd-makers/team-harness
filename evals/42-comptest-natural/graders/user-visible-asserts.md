---
type: llm
focus:
  source: file
  path: src/components/LoginForm.test.jsx
---

This is a component test file for `LoginForm` in `src/components/LoginForm.jsx`, a login form with labelled email and password inputs, a submit button, an error paragraph with `role="alert"`, and a welcome message after a successful login.

PASS if every test finds elements the way a user perceives them (by role, label text, or visible text) and asserts only what a user can observe on screen (visible text, alerts, enabled or disabled controls, what appears or disappears).

FAIL if any test asserts an implementation detail: React state or hook values, props, component names, CSS class names or inline styles, DOM structure queried with `container.querySelector`, `getByTestId`, or snapshot matching.
