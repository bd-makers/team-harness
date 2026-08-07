# doctor-hookcli-tests — Spec

## 목적 / 요구사항

0.13.0(`ee6e459`) 검토에서 드러난 **테스트 커버리지 갭 3건**을 메운다.
0.13.0이 추가한 `checkHookCli` 자체는 정상 동작하지만, 그 주변에서 실제로 결함이 발생했던
지점들이 테스트로 고정되어 있지 않다.

요구사항:

1. `doctor`가 안내하는 복구 명령이 **실행 불가능한 형태로 회귀하면 테스트가 실패한다.**
2. `runDoctor`의 `plugin-dev → skip` 분기가 어써션으로 고정된다.
3. `checkHookCli`가 **실제 `--help` 출력**으로도 통과함이 검증된다.

범위 밖: `checkHookCli` 로직 변경, 평문 요약의 warning 반영(별건·기존 동작), README 문안 재작성.

---

## 배경 — 왜 이 갭이 실제 결함을 통과시켰나

`th-activation`(PR #16)은 복구 안내를 `npm i -g harness-aijient-team`으로 냈다.
이 패키지는 **npm 공개 저장소에 배포되지 않으므로 그 명령은 404로 실패**한다.
PR #17이 실측(`npm ls -g` → `readlink`)으로 실제 경로를 확인해 별도로 고쳤다.

두 가지가 겹쳐 결함이 통과했다:

- `harness-activation-artifact.md`의 Probe 기록은 해당 절차를 "확인했다"고 적었으나
  **문서를 읽었을 뿐 실행하지 않았다.** 실행했다면 404가 바로 드러났다.
- `release-0-13-artifact.md`가 직접 인정하듯 `tests/`에 그 문자열을 검증하는 어써션이 없다
  (`checkHookCli`는 boolean 로직만 테스트).

즉 **"선언은 있는데 발동을 검증하지 않는다"** — `harness-activation`이 닫으려던 갭과 같은 종류가
그 task 자신의 검증 절차에서 재현됐다. 이 task는 그것을 테스트로 고정한다.

## 설계 / 접근

### 1. 복구 명령 회귀 테스트 (핵심)

`hookCliInstall`은 현재 `runDoctor` 내부 지역 변수다(`doctor.mjs:143-144`).
모듈 스코프 함수로 추출해 export하고, 테스트가 다음을 고정한다:

- 생성된 명령이 `npm i -g <절대경로>` 형태이며, 경로가
  `marketplaces/harness-aijient-team-marketplace`로 끝난다.
- `CLAUDE_PLUGINS_ROOT`가 설정되면 그 값을 존중한다.
- **`npm i -g harness-aijient-team`(패키지명 직접 설치) 형태가 doctor 출력·README 어디에도
  없다** — #16 결함의 정확한 회귀 가드.

README와의 일치는 셸 변수 표기(`${CLAUDE_PLUGINS_ROOT:-$HOME/.claude/plugins}`)가 달라
문자열 완전 대조가 불가하므로, **공통 경로 조각**을 양쪽에서 검증한다.
선례: `doctor.test.mjs`가 `POST_COMMIT_HOOK`을 import해 훅 계약을 대조하는 방식.

### 2. plugin-dev skip 분기

`tests/doctor.test.mjs:231`의 기존 plugin-dev 테스트에 어써션을 추가한다 —
`checks[]`에 `SessionStart/post-commit hook CLI`가 `status: 'skip'`으로 존재.
신규 테스트 파일 없이 기존 통합 테스트를 확장한다.

### 3. 실제 `--help` 대조

`checkSelfCli`는 `stdout.includes('harness-team')`(느슨), `checkHookCli`는
줄 앵커 정규식 `^\s*(session-context|handoff)(\s|$)`(엄격)으로 **서로 다른 어써션**을 쓴다.
전자만 실제 bin으로 테스트된다(`doctor.test.mjs:44`).

따라서 help 포맷이 바뀌면 한 번의 실행에서 `✓ harness-team CLI (--help OK)`와
`⚠️ hook CLI 미지원`이 동시에 날 수 있다. 가설이 아니다 — 0.13.0이 실제로
`bin/harness-team.mjs`의 help 텍스트를 편집했다(release 설명 `3 manifests` → `4 manifests`).
마침 다른 줄이었을 뿐이다.

임시 디렉토리에 `bin/harness-team.mjs`를 `harness-team` 이름으로 심링크해 PATH로 주입하고,
`checkHookCli`가 **실제 출력**으로 true를 반환하는지 검증한다.

## Ontology

- **복구 명령(recovery command)**: doctor 경고가 사용자에게 제시하는 실행 가능한 해결 절차.
  README·경고 detail·JSON `next_actions` 세 곳에 나타나며 셋이 일치해야 한다.
- **문자열 계약(string contract)**: 코드가 만들어 사용자에게 노출하는 명령·경로 문자열 중,
  틀려도 테스트가 실패하지 않는 것. 이 task가 다루는 대상.
- **help 어써션 비대칭**: 같은 `--help` 출력을 두 검사기가 서로 다른 엄격도로 파싱하는 상태.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
  → "0.13.0 검토에서 드러난 테스트 커버리지 갭 3건(복구 명령 문자열·plugin-dev skip·실제 help 대조)을 메운다."
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
  → 신규 테스트 파일 0(기존 `tests/doctor.test.mjs` 확장), `checkHookCli` 로직 불변,
    `hookCliInstall` 추출은 export 추가만(동작 동일).
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
  → `npm run test` 전체 통과 + 각 테스트를 의도적으로 깨뜨렸을 때(패키지명 직접 설치 형태로
    되돌리기 / skip 어써션 제거 / help 줄 들여쓰기 변경) 실패함을 확인.
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
  → `src/commands/doctor.mjs`(추출·export), `tests/doctor.test.mjs`(확장). 2파일.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

> 게이트 통과 근거: 0.13.0 코드·테스트·probe를 직접 실행해 확인한 결과에서 도출했으므로
> 요구사항이 추정이 아니라 관측에 근거한다.

## 참고

- 선행 task: `chad/harness-activation`(갭 3건 구현), `chad/release-0-13`(#17 복구 안내 수정)
- 검토 대상 커밋: `6371195`(#16), `ee6e459`(#17)
- 관련 코드: `src/commands/doctor.mjs:42`(`checkHookCli`), `:143-144`(`hookCliInstall`),
  `:286-302`(분기), `tests/doctor.test.mjs:53`(boolean 테스트), `:231`(plugin-dev 통합 테스트)
