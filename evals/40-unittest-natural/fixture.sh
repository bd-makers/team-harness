#!/usr/bin/env bash
# Seeds a dependency-free Node ESM library: order pricing logic that calls an internal coupon table.
# No tests exist yet, so any passing `node --test` run in the trace comes from the agent's new tests.
set -euo pipefail

# eval 샌드박스는 HOME을 바꾸고 운영자의 mise 설치 경로를 가려서, PATH의 mise shim이 node를 못 찾는다.
# 샌드박스 레이아웃($PWD = $HOME/cwd)에서만, 운영자 node의 실제 설치 경로를 샌드박스 HOME의 mise 설정에 고정한다.
if [ "$PWD" = "$HOME/cwd" ] && command -v mise >/dev/null 2>&1 && command -v node >/dev/null 2>&1; then
  node_bin="$(node -p 'require("fs").realpathSync(process.execPath)')"
  mkdir -p "$HOME/.config/mise"
  printf '[tools]\nnode = "path:%s"\n' "$(dirname "$(dirname "$node_bin")")" > "$HOME/.config/mise/config.toml"
fi

mkdir -p src

cat > package.json <<'EOF'
{
  "name": "shop-core",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
EOF

cat > AGENTS.md <<'EOF'
# shop-core
- Node.js ESM 라이브러리, 런타임 의존성 없음.
- 테스트: `node:test` + `node:assert/strict`. 실행은 `node --test`. 테스트 파일은 `test/*.test.js`.
- 이 환경은 오프라인이다 — 패키지 설치와 외부 네트워크 호출은 하지 않는다.
EOF

cat > src/coupons.js <<'EOF'
// 쿠폰 원장 — 앱이 소유한 인메모리 테이블.
const COUPONS = new Map([
  ['WELCOME3000', { amountOff: 3000, expiresAt: new Date('2027-12-31T23:59:59+09:00') }],
  ['SUMMER5000', { amountOff: 5000, expiresAt: new Date('2025-08-31T23:59:59+09:00') }],
]);

export function findCoupon(code) {
  return COUPONS.get(code.trim().toUpperCase()) ?? null;
}
EOF

cat > src/pricing.js <<'EOF'
import { findCoupon } from './coupons.js';

const VOLUME_TIERS = [
  { minSubtotal: 100000, rate: 0.1 },
  { minSubtotal: 50000, rate: 0.05 },
];
const FREE_SHIPPING_FROM = 30000;
const SHIPPING_FEE = 3000;

// 주문 금액을 계산한다. 할인 = 구간 할인 + 쿠폰, 배송비는 할인 후 금액 기준.
export function priceOrder(items, { couponCode, now = new Date() } = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('EMPTY_ORDER');
  }
  const subtotal = items.reduce((sum, { unitPrice, qty }) => {
    if (!Number.isInteger(qty) || qty <= 0) throw new Error('INVALID_QTY');
    return sum + unitPrice * qty;
  }, 0);

  const tier = VOLUME_TIERS.find((t) => subtotal >= t.minSubtotal);
  let discount = tier ? Math.floor(subtotal * tier.rate) : 0;

  if (couponCode) {
    const coupon = findCoupon(couponCode);
    if (!coupon) throw new Error('UNKNOWN_COUPON');
    if (now > coupon.expiresAt) throw new Error('COUPON_EXPIRED');
    discount += coupon.amountOff;
  }

  discount = Math.min(discount, subtotal);
  const afterDiscount = subtotal - discount;
  const shipping = afterDiscount >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
  return { subtotal, discount, shipping, total: afterDiscount + shipping };
}
EOF
