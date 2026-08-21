# done-guard-evidence — Plan

## 목표

`collectDoneIssues`에 증거 기반 체크 2종(테스트 작성 / 리뷰 마커)을 추가하고,
리뷰 명령이 기계 판독 가능한 마커를 남기도록 계약을 확장한다.

## 단계

- [x] 1. `parseDoneEvidenceDeclaration(spec)` — spec의 `## Done evidence` json 블록 파싱.
      없으면 기본값(`tests: required`, `review: optional`), 깨졌으면 invalid 반환.
- [x] 2. `classifyChangedPaths(paths)` — 파일 목록을 `{ source, test }` 변경 여부로 분류.
      순수 함수로 분리해 테스트 가능하게 한다.
- [x] 3. `parseReviewMarkers(artifact)` — artifact 전체에서 `<!-- harness:review ... -->` 스캔,
      `kind`/`at` 파싱. 잘못된 마커는 조용히 무시(마커 없음과 동일 취급).
- [x] 4. `collectDoneIssues`에 체크 A(테스트 작성) 배선 — `tests: required`일 때만,
      `git log --since=<switchedAt> --name-only` 결과로 판정. 비-git이면 skip.
- [x] 5. `collectDoneIssues`에 체크 B(리뷰 마커) 배선 — `review: required`일 때만,
      `at >= switchedAt` 마커 존재 여부로 판정.
- [x] 6. 선언 invalid를 차단 사유로 배선 (조용한 기본값 폴백 금지).
- [x] 7. `commands/harness-review.md` 5단계에 마커 append 계약 추가 (0.17 재편으로 대상 변경).
- [x] 8. `commands/harness-adversarial-review.md`에 `kind=<engine>-adversarial` 마커 명시 (동상).
- [x] 9. artifact 템플릿(`taskArtifactTemplate`)의 `## Reviews` 안내문에 마커 형식 한 줄 추가.
- [x] 10. spec 템플릿(`taskSpecTemplate`)에 `## Done evidence` 선언 자리 추가 (주석 형태, 기본은 미선언).
- [x] 11. `tests/done-guard.test.mjs`에 신규 케이스 추가 — 순수 함수 단위 + 가드 통합
      (테스트 미작성 차단 / 테스트 동반 통과 / 문서만 변경 시 미발동 / `tests: skip` /
       리뷰 required+마커 없음 차단 / 마커 있음 통과 / 이전 task 마커는 무효 / 선언 invalid 차단).
- [x] 12. `npm run test` 전체 통과 확인.
- [x] 13. `/harness-review` 로 외부 리뷰 → artifact `## Reviews`에 기록.
- [x] 14. 리뷰 발견 사항 검증·조치 후 artifact `## 결과`/`## Learnings` 정리.

## Ontology 변경 로그

- **증거(evidence)** 신규 정의 — git 이력 또는 파일 마커로 확인 가능한 흔적.
- **stale 리뷰** 정의하되 **이번 범위에서 판정하지 않음**으로 확정.
- **`--force` 훈련** 신규 정의 — 이 설계의 최대 리스크로 명시.

## 참고
- spec.md의 "하지 않는 것 (결정)" 3항목이 범위 경계다.
