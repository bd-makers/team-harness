# harness-comptest — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

`/harness-comptest` 4-파일 추가 완료:
- `commands/harness-comptest.md` — 라우팅(unittest 경계) + 0~6단계 계약
- `skills/harness-comptest/SKILL.md` — Codex 래퍼
- `.claude-plugin/plugin.json` + README 커맨드 표 등록
- `commands/harness-unittest.md` §4 양방향 라우팅 교차 참조 1줄
- `CHANGELOG.md` [Unreleased] Added 기록

검증: `npm run test:unit` 124/124 pass, manifest-sync 8/8 (4-파일 동기화 invariant 무결).

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

### 2026-07-11 — advisor 리뷰
- **요약**: 계약 8개 사양(라우팅·스택 감지·스코프·[허용]/[금지] 전략·GWT·쿼리/RN·커버리지 3상태·검증 자가점검) 충실도 완전. comptest 산출물 정확.
- **발견(1)**: `harness-unittest.md` §4에 삽입한 교차 참조 2번째 문장("이 커맨드는 순수 로직만 다룬다")이 바로 아래 getByRole/renderHook/RNTL 렌더 규칙과 모순 — 라우팅 포인터를 따라온 독자가 직접 충돌을 만남.
- **조치**: 모순 문장 삭제, `(양방향 라우팅)` 태그를 1번째 문장으로 이동. 양방향성은 comptest.md가 반대 방향("순수 로직 → unittest")을 이미 명시하므로 유지됨. §4 전면 재작성은 범위 확장이라 배제(escalation 규칙). 재검증 test:unit 124/124 pass.

## Learnings
- 형제 커맨드 추가 시 **기존 파일에 넣는 교차 참조 한 줄**이 그 섹션의 기존 규칙과 모순되지 않는지 확인해야 한다 — manifest-sync 같은 구조 테스트는 프로즈 정합성을 잡지 못한다.

