# plugin-hardening — Plan

## 목표

v0.9.5 분석에서 식별된 보완 항목 7건 해소 — 팀/조직 도입 가능 수준으로 hardening.
(근거: `docs/chad/harness-plugin-analysis-0.9.5.html`)

## 단계
- [x] CI 추가: `.github/workflows/test.yml` — push/PR 시 `node --test` (unit + e2e), Node 18/20 매트릭스
- [ ] pre-commit-check.sh 패키지 매니저 감지: lockfile 기반(pnpm-lock.yaml/package-lock.json/yarn.lock) 분기, 템플릿 + migrate phase 갱신
- [ ] 4-파일 동기화 자동 검증: commands/*.md ↔ plugin.json commands ↔ bin 라우팅 일치 테스트 추가 (tests/manifest-sync.test.mjs)
- [ ] LICENSE 파일 추가 (MIT, package.json 선언과 일치)
- [ ] doctor 강화: 깨진 symlink·백업 디렉토리 부재 감지, init 시 iCloud/Dropbox 경로 경고
- [ ] doctor plugin-dev 모드: 플러그인 소스 레포에서 backup.json/스크립트 체크 완화 (현재 이 레포에서 5 problem false-positive — Codex 2026-07-02 발견). 인덱스 "Active"(=open) vs active.json(=포인터) 네이밍 정리도 함께 검토
- [ ] release 가드: installed_plugins.json 수정 전 Claude Code 프로세스 감지 시 경고 출력
- [ ] 미확인 항목 조사: templates/.cursor 빈 디렉토리 의도, sim oauth token 권한 600 강제, bd-makers/team-harness 원격 실존 — 결과를 artifact.md에 기록 후 필요 시 단계 추가
- [ ] 전체 회귀: `npm test` green + e2e 3-스택 매트릭스 통과 확인

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-07-02: "hardening" = 실패 모드 축소 작업으로 정의 (기능 추가 아님) — spec.md Ontology 반영.

## 참고
- 분석 리포트 §6 리스크 / §10 미확인: `docs/chad/harness-plugin-analysis-0.9.5.html`
- 검증 체크리스트: 리포트 §8
