---
name: verify
description: 프로젝트 검증을 수행합니다 (커밋 게이트 목록, 없으면 typecheck·lint·test)
disable-model-invocation: true
allowed-tools: Bash, Read
---

# /verify — 프로젝트 전체 검증

아래 검증을 실행하고 결과를 요약해주세요. 이 스킬은 스택별 명령을 하드코딩하지 않는다.

## 검증 항목 — 정본을 고르는 순서

### 1. `.harness/gates.json`이 있으면 — 커밋 게이트 목록이 정본
커밋 게이트(`harness-team gate commit`)가 실제로 돌리는 목록이다. 에이전트가 다른 명령으로 검증하면 "통과했는데 커밋이 막히는" 어긋남이 생긴다.
- `commit`이 **배열**이면 그 명령들을 순서대로 쓴다.
- `commit`이 **객체**(`{"<디렉터리>": [명령…]}`)면 모든 값의 명령을 **중복 없이** 순서대로 모아 쓴다 — 전체 검증이므로 전부 실행한다.
- 실행 위치는 게이트와 같은 저장소 루트다.
- 파일이 깨졌거나(JSON 오류) `commit`이 위 두 형식이 아니면 **"설정 오류"로 보고하고 멈춘다** — `## 명령`으로 조용히 내려가지 않는다(게이트도 이 경우 커밋을 막는다).

### 2. `.harness/gates.json`이 없을 때만 — `AGENTS.md`의 `## 명령`
`typecheck:` · `lint:` · `test:` 세 줄을 읽고, 값이 `(configure)`인 항목은 "미설정"으로 보고하고 건너뛴다.

명령마다 실행해 각각 보고한다. **첫 실패에서 멈추지 않는다.**

## 결과 보고 형식

```
출처: .harness/gates.json (또는 AGENTS.md ## 명령)
✅ / ❌ / ➖ <명령> — (통과 / 핵심 에러 요약 / 미설정)
```

에러가 있으면 핵심 에러만 요약하고, 수정 제안을 함께 제시하세요.
실패가 있으면 코드를 고치기 전에 `harness-team stack --json`의 `installTrace`를 먼저 본다 — `absent`면 환경(설치 누락)이 원인일 수 있고, `next_actions`가 준비 명령을 준다.
