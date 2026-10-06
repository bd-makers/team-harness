# prepush-existing-installs — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

- **문제** (`docs/followups.md` 12번): pre-push 훅(pr-check, #125)은 init·sync만 설치한다. 0.45.0 이하로 설치한 소비자는
  다음 릴리스로 CLI를 올려도 init·sync를 다시 돌리기 전까지 PR 필수 문서 강제(D11)가 꺼져 있다.
- **이미 해결된 부분**: #126 이후 doctor가 pre-push 훅이 없거나 pr-check 줄이 없으면 `warning` + `run: harness-team sync`를
  처방한다(`src/git-hooks.mjs` `checkPrePushHook`, `tests/git-hooks.test.mjs:204-205`). "모르는 채로 꺼져 있다"는 doctor를 돌리면 드러난다.
- **남은 틈**: 업그레이드한 사람이 doctor를 돌리기 전에 알 길이 없다. 더구나 CHANGELOG `[Unreleased]`에 pr-check·pre-push·doctor 검사
  항목이 아예 없다(#125·#126이 CHANGELOG를 건드리지 않음 — `grep -c 'pre-push\|pr-check' CHANGELOG.md` = 0).
- **기대 결과**: 다음 릴리스 노트와 README가 "기존 설치본은 `harness-team sync` 1회"를 말하고, followups 12번이 근거와 함께 닫힌다.
- **제약**: 코드 변경 없음(사용자 결정 (a), 2026-10-06). migrate는 pull(cycle §4-5) — 하네스·에이전트가 먼저 밀지 않는다. 릴리스는 범위 밖.

## 설계 / 접근

**결정 (a)**: migrate에 pre-push 설치를 넣지 않고 문서로 안내한다.

1. `CHANGELOG.md` `[Unreleased]`
   - `### Added`에 pr-check(+ pre-push 훅·ship 연동, #125)와 doctor `pre-push hook (pr-check)` 검사(#126) 항목을 넣는다.
   - pr-check 항목 끝에 **업그레이드 안내**: 기존 설치본은 `harness-team sync` 1회(migrate는 git 훅을 설치하지 않는다), 훅 관리자는 README 블록.
2. `README.md`
   - `pr-check`의 pre-push 훅 bullet에 "기존 설치본은 `harness-team sync` 1회" 한 줄.
   - `/harness-migrate` 절에 "pre-push 훅은 설치하지 않는다 — git 훅은 `harness-team sync`" 한 줄.
   - 표현은 "pre-push"로 좁힌다 — 0.6 이전 구조 변환 경로(`migrate.mjs:165`)는 post-commit을 설치하므로 "git 훅을 설치하지 않는다"는 틀린 말이다.
3. `docs/followups.md`: 12번을 지우고 하단 처리 기록에 근거 한 줄, 우선순위 줄을 13–16으로.

### 2차 장치 규칙 (cycle §5) — 검토·기각
- **(b) migrate가 pre-push 설치**: 기각. migrate는 pre-push를 설치하지 않고 일반 경로는 git 훅을 하나도 설치하지 않는다(post-commit도 레거시 경로 `migrate.mjs:165`에만).
  refresh 경로의 원칙은 "refresh는 갱신이지 설치가 아니다"(`migrate.mjs:378`). 누락은 이미 doctor(원래 장치의 진단)가 sync로 처방하므로,
  migrate에 설치를 더하는 것은 같은 틈을 메우는 두 번째 장치다.
  - 반대 근거(기록): migrate는 settings.json의 SessionStart·PreToolUse 훅은 **없으면 추가**한다(README migrate 절). 즉 "migrate는 설치하지 않는다"는
    Claude 설정에는 성립하지 않고 git 훅에만 성립한다. 그래도 git 훅 설치의 정본은 sync이고 doctor가 그쪽을 가리키므로 경로를 늘리지 않는다.
- **(c) 둘 다**: (b)의 기각 사유를 그대로 받는다.
- **원래 장치를 줄이는 안**: pre-push 강제 자체는 D11 "강제한다"의 유일한 실행 지점이라 줄일 대상이 아니다. 줄일 것은 새 장치(코드)를 안 만드는 쪽 — (a).

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **기존 설치본**: pre-push 훅을 설치하지 않던 버전(≤ 0.45.0)의 init·sync로 설치한 소비자 저장소. 그 `.git/hooks/pre-push`에 pr-check 블록이 없다.
- **pre-push 설치 경로**: `installPrePushHook`을 부르는 곳 — init(`init.mjs:109`)·sync(`sync.mjs:10`) 둘뿐. migrate는 포함하지 않는다(이 task의 결정).
- 게이트 근거: 목표·제약·완료 기준이 한 문장씩으로 고정되고, 영향 파일 3개(CHANGELOG·README·followups)가 식별됐다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 기존 설치본이 업그레이드 후 `sync` 1회로 pre-push를 받는다는 것을 릴리스 노트·README가 말하게 하고 12번을 닫는다.
- [x] **Constraint 명확도** (30%) — 코드 변경 없음, migrate 미변경(pull), 릴리스 제외.
- [x] **Success 기준** (30%) — CHANGELOG `[Unreleased]`에 pr-check·doctor 검사·sync 안내 존재, README 두 곳, followups 12번 삭제, `npm run test` PASS.
- [x] **Context 명확도** (brownfield 한정) — `migrate.mjs:14,165,378`, `init.mjs:109`, `sync.mjs:10`, `git-hooks.mjs` `checkPrePushHook`.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구). -->
## Done evidence

```json
{ "version": 1, "review": "optional", "tests": "skip" }
```

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 출처: `docs/followups.md` 12번, 인계 `.claude/handoffs/2026-10-06-0851-prepush-existing-installs.md`.
- doctor 처방 테스트: `tests/git-hooks.test.mjs:193-216`, `tests/doctor.test.mjs:656`.
- 다이어그램: 생략(사용자 결정 2026-10-06 — 코드·구조 변화 없음).
