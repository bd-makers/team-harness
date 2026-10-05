# pre-push-hook-doctor — Plan

## 목표
pre-push 훅에 pr-check 실행 줄이 없으면 doctor가 알리고 상황별 처방(sync · 직접 호출 · 관리자 설정)을 낸다 — followups 11번.

## 단계
- [x] 1. 판정 공유 — `src/git-hooks.mjs`: 설치기의 "주석 아닌 줄에 marker" 판정을 `hasLiveMarker`로 꺼내 `installGitHook`이 쓰게 한다(판정 함수도 같은 모듈에 두므로 `SH_SHEBANG`·`hasCustomHooksPath`는 export 불필요). 기존 `tests/git-hooks.test.mjs` 그대로 PASS(회귀 없음).
- [x] 2. 판정 함수 — `checkPrePushHook(targetDir)` → `{ status, detail }`: 마커 있음 pass · 기본 dir 없음/마커 없음 warning+sync(관리자 안내 병기) · 비-셸 훅 warning+직접 호출 · core.hooksPath 마커 없음 비경고 안내 · git 아님 생략. 테스트: 임시 git 저장소로 다섯 갈래 각각(S1).
- [x] 3. doctor 연결 — `runDoctor`의 hook CLI 검사 옆에 한 줄, plugin-dev면 skip, JSON 모드 동일 라벨. 테스트: `tests/doctor.test.mjs`에 plugin-dev skip·JSON 상태.
- [x] 4. 문서 — README pr-check 절에 훅 관리자 단락(R4), `docs/followups.md` 11번 삭제(R5), `npm run docs:check`(필요 시 `docs:generate`).
- [x] 5. husky 실측(S2) — 임시 저장소: husky 설치 → init/sync → doctor → `npm install`(prepare) → doctor. 결과를 artifact에 기록. 전제가 틀리면 멈추고 보고.
- [x] 6. 검증 — `npm run test`·`npm run docs:check` PASS.
- [x] 7. 리뷰 — codex(`review --scope worktree`) + 결과 artifact `## Reviews`.
- [x] 8. 커밋·PR — #126

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-10-06: "기본 디렉터리를 다시 쓰는 관리자"(lefthook 등)를 기본 hooks 디렉터리로 다루기로 정의(interview).
- 2026-10-06: "관리자 가드 줄"(`PRE_PUSH_MANAGER_LINE`) 신설 — husky 실측에서 맨 명령이 구버전 팀원 push를 막는 것을 확인(5단계).
- 2026-10-06: 가드 줄 폐기 → "관리자 처방 블록"(`PRE_PUSH_BLOCK` 재사용) — codex P2: 한 줄은 stdin을 소비해 뒤 명령이 EOF를 받는다(재현).

## 참고
- spec: `pre-push-hook-doctor-spec.md` (R1–R5, S1·S2, 2차 장치 규칙 검토)
- 다이어그램: 만들지 않음(2026-10-06 사용자 선택) — 다이어그램 단계 없음.
