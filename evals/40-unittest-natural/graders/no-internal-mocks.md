---
type: llm
focus:
  source: file
  path: test/pricing.test.js
---

This is a unit test file for `priceOrder` in `src/pricing.js`. `priceOrder` calls `findCoupon` from `src/coupons.js`, an in-memory coupon table the app owns (an internal collaborator, not an external dependency).

PASS if the file exercises `priceOrder` with the real `src/coupons.js`: coupon cases use real coupon codes from that table (or an unknown code), and nothing defined under `src/` is mocked, stubbed, spied on, or substituted (no `mock.module`, `mock.method`, `mock.fn` standing in for `findCoupon`, no loader or import-map swap of `./coupons.js`).
Fixing the clock by passing an explicit `now` value, or faking timers, is allowed and does not count as mocking an internal collaborator.

FAIL if any internal module or function from `src/` is mocked, stubbed, spied on, or replaced.
