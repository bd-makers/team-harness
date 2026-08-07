# release-0-13 — Plan

## 목표

team-harness 0.13.0 minor 릴리스 준비 브랜치를 만들어 PR로 올린다 (직접 병합/태그 금지).

## 단계
- [x] 실제 동작하는 전역 설치 절차 실측 확인 (marketplace clone 경로로 `npm i -g`)
- [x] README.md 설치 안내 수정 (3채널 표, 독립 CLI 섹션, clone 팀원 복구 절차)
- [x] src/commands/doctor.mjs 경고 detail + nextActions 문구 수정
- [x] tests/doctor.test.mjs 대응 기대값 확인/수정 (해당 문자열을 검증하는 어써션 없음 확인 — 수정 불필요)
- [x] CHANGELOG.md `## [Unreleased]` 채우기 (Added/Changed/Fixed)
- [x] docs/what-changes-latest-version.html 0.13.0 내용으로 갱신 (사람이 쓴 근거 포함)
- [x] docs/what-changes-0.13.0.html 스냅샷 생성 (latest와 완전 일치)
- [x] node --test tests/ 통과 확인
- [x] npm test 통과 확인
- [x] npm run docs:generate 실행
- [x] npm run docs:check 통과 확인
- [x] node bin/harness-team.mjs release 0.13.0 --dry-run 출력 확인
- [x] node bin/harness-team.mjs release 0.13.0 실제 실행 (1회)
- [x] CHANGELOG.md `## [Unreleased]` → `## [0.13.0] - <날짜>` 이동
- [x] MAINTAINING.md 릴리스 절차 경고에 `release`가 `--help`를 실행으로 간주한다는 함정 한 줄 추가
- [x] git commit (release prep), 직접 push to main / merge 금지
- [x] no-mistakes 파이프라인으로 검증·리뷰·PR 생성 위임 (별도 수동 리뷰 라운드 없음 — task 범위는 여기까지, 실제 실행은 `/no-mistakes` 별도 단계)

## Ontology 변경 로그
- (none)

## 참고
- MAINTAINING.md `## 릴리스 절차` 가 정본
