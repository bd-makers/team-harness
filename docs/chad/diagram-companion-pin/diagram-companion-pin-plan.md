# diagram-companion-pin — Plan

## 목표

`diagram-design`을 복사하지 않고 sha 핀 동반 항목으로 마켓플레이스에 등재하고, 그 때문에
깨지는 릴리스 가드를 "자기 항목 기준"으로 바꾸며, 하네스 규약을 주입하는 `/harness-diagram`
어댑터 커맨드·스킬을 추가한다. 핀을 올리는 절차를 MAINTAINING.md에 남긴다.

## 단계

### A. 마켓플레이스 핀 + 릴리스 가드
- [x] 핀 sha 후보 2개(`0ab077f`, `5538b35`)의 트리를 실제로 받아 대조하고 선택 근거를 spec에 기록
- [x] Anthropic 공식 마켓플레이스 `marketplace.json`을 직접 파싱해 항목 형식 확정(ref/version 유무 포함)
- [x] `src/commands/release.mjs` — 가드를 "이름으로 찾은 자기 항목이 정확히 1개"로 교체
- [x] `src/commands/release.mjs` — 버전 동기화 대상을 `plugins[0]` → 자기 항목으로 교체
- [x] `src/commands/release.mjs` — `ERROR_ADVICE.schema` 문구를 새 계약에 맞게 갱신
- [x] `.claude-plugin/marketplace.json` — `diagram-design` 동반 항목 추가(자기 항목 뒤, `version` 없음)
- [x] `tests/release.test.mjs` — 새 계약 3건 고정(동반 항목 무해·중복 자기 항목 throw·동반 version이면 manifest-format throw)
- [x] `tests/manifest-sync.test.mjs` — `plugins[0]` 인덱스 접근을 이름 조회로 강화 + 저장소 불변식(동반 항목은 version 없음, source.sha는 40hex) 추가
- [x] `commands/harness-release.md` / `README.md` 의 `plugins[0]` 언급 갱신

### B. 어댑터 커맨드
- [x] `commands/harness-diagram.md` 작성 — 실행 절차의 정본(probe→degrade→record, 산출물 경로·형식, artifact 기록)
- [x] `skills/harness-diagram/SKILL.md` 작성 — 커맨드를 SSOT로 읽는 Codex 래퍼, description은 하네스 task 문맥으로 한정
- [x] `.claude-plugin/plugin.json` commands 배열에 등록(#25와 충돌 시 rebase, 상대 항목 보존)
- [x] `CLAUDE.md` + `templates/CLAUDE.md.hbs` 1-B에 절차 정본 포인터 한 문장 추가(AGENTS.md는 건드리지 않음)

### C. 문서 · 검증
- [x] `MAINTAINING.md` — 동반 플러그인 핀 절차(언제·무엇을 확인·누가 결정 + 옛 가드 clone 경고)
- [x] `README.md` — 동반 플러그인 소개, 선택 사항 명시, MIT 저작자 표기
- [x] `CHANGELOG.md` `[Unreleased]` 항목 추가
- [x] `npm run test` 전체 통과를 실제 출력으로 확인
- [ ] 격리 브랜치 커밋 → main 대상 PR 생성(머지하지 않음) → PR 번호 보고
- [x] artifact.md에 결과·네임스페이스 사실·후속 작업 기록

## Ontology 변경 로그

- **동반 플러그인(companion plugin)** 신규 정의 — 하네스가 소유하지 않지만 마켓플레이스가 sha로 핀을 걸어 등재하는 외부 플러그인
- **자기 항목(self entry)** 신규 정의 — `plugin.json.name`과 이름이 같은 marketplace 항목. 릴리스 버전 동기화의 유일한 대상
- **어댑터(adapter)** — 별칭이 아니라 하네스 규약을 주입하는 커맨드. `harness-codex-review`와 같은 역할

## 참고
- spec.md의 "핀 sha 선택", "가장 큰 기술 리스크", "doctor 확장은 하지 않는다" 절
