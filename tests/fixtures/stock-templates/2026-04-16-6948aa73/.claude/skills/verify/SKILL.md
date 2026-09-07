---
name: verify
description: 프로젝트 검증을 수행합니다 (typecheck, lint, test)
disable-model-invocation: true
allowed-tools: Bash, Read
---

# /verify — 프로젝트 전체 검증

아래 검증을 순서대로 실행하고 결과를 요약해주세요.

## 검증 항목

### 1. TypeScript 타입 체크
```bash
pnpm tsc --noEmit
```

### 2. ESLint
```bash
pnpm lint
```

### 3. 테스트
```bash
pnpm test --passWithNoTests
```

## 결과 보고 형식

```
✅ / ❌ TypeScript — (에러 수 또는 통과)
✅ / ❌ ESLint — (경고/에러 수 또는 통과)
✅ / ❌ Tests — (통과 suite 수 / 실패 suite 수)
```

에러가 있으면 핵심 에러만 요약하고, 수정 제안을 함께 제시하세요.
