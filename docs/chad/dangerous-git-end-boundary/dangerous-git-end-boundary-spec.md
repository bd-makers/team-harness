# dangerous-git-end-boundary — Spec

## 목적 / 요구사항
`hook-git-opts-init-cancel` task(PR #89)에서 `pre-commit-check.sh`를 고치다 확인한 형제 훅의 같은 결함.
`templates/.claude/hooks/block-dangerous-git.sh`의 토큰 경계 `END='([[:space:]]|$|")'`가 공백·끝·`"`만
경계로 인정해 **`git push --force;echo`·`git push -f; echo`가 exit 0으로 통과**한다(main `93fba04`에서 재현,
`git reset --hard;echo`는 `--hard` 뒤에 END가 없어 차단됨). 영향: 파괴적 git 명령 차단 훅이 셸 연산자 하나로 우회된다.
기대: `pre-commit-check.sh`와 같은 규칙 — 경계는 "단어 문자가 아니면 전부"(`([^[:alnum:]_-]|$)`)로 두어
`;`·`&&`·`|`·`)`·`>`·`'` 등 어떤 구분자에도 fail-closed. 기존 허용 목록(`--force-if-includes`·`-u`·`HEAD:main`·
`restore -S` 등)은 그대로 통과해야 한다.

제약: 훅 한 파일 + D8 provenance(직전 stock 판 fixture·sha 테이블·fixture 개수). 패턴 본문은 바꾸지 않는다 —
`END`만 교체하고 회귀 테스트로 허용 목록 불변을 증명한다.

## 설계 / 접근
- `END='([^[:alnum:]_-]|$)'` — `-`를 단어 문자로 두므로 `--force-if-includes`가 `-[[:alpha:]]*f[[:alpha:]]*${END}`에
  걸리지 않는 성질(`-force` 뒤 `-`가 경계가 아님)이 유지된다. `--force-with-lease=x`는 기존 선택 그룹이 `=x`를 소비한다.
- 테스트: `GIT_BLOCK`에 `push --force;echo`·`push -f; echo`·`push --force>/dev/null`·`bash -c 'git push -f'`·
  `checkout .;` 추가. `GIT_ALLOW`는 기존 항목 그대로(불변 증명).
- 직전 stock 판을 `tests/fixtures/stock-hooks/pre-end-boundary/block-dangerous-git.sh`로 보존, sha 테이블·README·
  드리프트 가드 개수(15→16) 갱신. `docs:generate`(overview가 훅 소스를 포함).
- 브랜치는 PR #89 위에 스택 — fixture README·개수 줄이 겹치기 때문. 머지 후 base를 main으로 바꾼다.

## Ontology
- **토큰 경계(END)**: subcommand·플래그 토큰이 끝났음을 뜻하는 위치. 정의는 "다음 글자가 단어 문자(`[[:alnum:]_-]`)가
  아니거나 문자열 끝". 열거형 정의는 빠진 글자마다 새므로 쓰지 않는다(#89 codex 리뷰 P2 ×2의 학습).
- **stock 판**: D8 — 과거 배포 템플릿 바이트. 현재 템플릿은 테이블에 넣지 않는다.

자가진단 근거: 재현 명령·수정 위치·기대 결과가 고정돼 있고, 성공 기준은 차단 5건 추가 + 허용 목록 불변 테스트다.

## Ambiguity 자가진단
- [x] **Goal 명확도** — `block-dangerous-git.sh` END 경계 갭 수정.
- [x] **Constraint 명확도** — END만 교체, D8 provenance 유지, 허용 목록 불변.
- [x] **Success 기준** — 새 차단 케이스 exit 2(양 모드), 기존 GIT_ALLOW 전부 exit 0, `npm test`·`docs:check` 통과.
- [x] **Context 명확도** — 훅 1, migrate.mjs sha 테이블, fixtures/stock-hooks, hooks-jq-fallback·migrate-hooks 테스트, overview.
- [x] **Ambiguity ≤ 0.2**

## Done evidence
```json
{ "version": 1, "tests": "required", "review": "required" }
```

## 참고
- 원 발견: `docs/chad/hook-git-opts-init-cancel/hook-git-opts-init-cancel-artifact.md` Reviews 절(2026-09-13).
- 알려진 오탐 유지: 커밋 메시지 안의 `git reset --hard` 문자열 차단(기존 테스트가 고정).
