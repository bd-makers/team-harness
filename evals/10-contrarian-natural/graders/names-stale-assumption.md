---
type: llm
---

The active task's design caches the whole product-detail response, including `price`, `stock` and `isPurchasable`, in Redis for 24 hours with no invalidation, while the spec notes that sellers change price and stock often and time sales start every hour.
PASS if, anywhere in the response and under any heading or angle, it challenges the assumption that this cached data stays valid for 24 hours (or that showing price, stock or purchasability up to 24 hours stale is acceptable).
FAIL if it never raises stale price, stock or purchasability caused by the 24-hour cache.
