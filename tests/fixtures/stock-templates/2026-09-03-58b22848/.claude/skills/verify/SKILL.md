---
name: verify
description: 프로젝트 검증을 수행합니다 (typecheck, lint, test)
disable-model-invocation: true
allowed-tools: Bash, Read
---

# /verify — 프로젝트 전체 검증

아래 검증을 순서대로 실행하고 결과를 요약해주세요.

## 검증 항목

명령은 프로젝트 `AGENTS.md`의 **## 명령** 절(`typecheck:` · `lint:` · `test:`)이 정본이다 — 이 스킬은
스택별 명령을 하드코딩하지 않는다(예전 판은 `pnpm`을 박아 두어 npm·Python 프로젝트에도 그대로 들어갔다).
먼저 `AGENTS.md`에서 세 줄을 읽고, 값이 `(configure)`인 항목은 "미설정"으로 보고하고 건너뛴다.

### 1. 타입 체크 — `AGENTS.md`의 `typecheck:` 명령
### 2. Lint — `AGENTS.md`의 `lint:` 명령
### 3. 테스트 — `AGENTS.md`의 `test:` 명령

## 결과 보고 형식

```
✅ / ❌ / ➖ Typecheck — (에러 수 또는 통과 / 미설정)
✅ / ❌ / ➖ Lint — (경고/에러 수 또는 통과 / 미설정)
✅ / ❌ / ➖ Tests — (통과 suite 수 / 실패 suite 수 / 미설정)
```

에러가 있으면 핵심 에러만 요약하고, 수정 제안을 함께 제시하세요.
