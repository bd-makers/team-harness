---
description: "현재 프로젝트에 팀 하네스를 scaffold하거나 기존 설치를 갱신합니다 (Claude 메인 + Codex 리뷰어 + Cursor 미러). 마커 병합·JSON deep-merge라 재실행해도 사용자 텍스트를 보존"
phase: First-time
argument-hint: '[--stack react-native|react|next|node|python|go|generic] [--shape single] [--yes]'
---

현재 작업 디렉토리에 팀용 하네스를 설치합니다. **기존 프로젝트에 다시 실행해도 됩니다** —
에이전트 파일은 `<!-- harness:section -->` 마커 블록만 갱신하고, `.claude/settings.json`·`.codex/hooks.json`은
deep-merge하며, hooks·rules·skills·`docs/` seed는 이미 있으면 건너뜁니다. 마커가 한쪽만 남은 파일은
병합하지 않고 경고합니다. (예전의 `apply` 명령은 이 명령의 별칭이었고 삭제됐습니다.)

건너뛰기는 **파일 단위**라 비대칭이 생깁니다 — 템플릿에 *새로 추가된* 파일은 재실행으로 도달하지만,
*수정된* 파일은 **영영 도달하지 않습니다**. 그래서 하네스가 스킬·규칙·훅에 실은 개선을 기존 설치에
배달하는 경로는 `init`이 아니라 **`harness-team migrate`** 입니다(파일 단위 설치본 한정 — `AGENTS.md`·`CLAUDE.md`
관리 절은 반대로 `init`만 갱신하며, 아래 절이 그 규칙입니다). migrate는 설치본의 바이트가
하네스가 실제로 배포한 적 있는 버전일 때만 갱신하고, 사용자가 편집한 파일은 건드리지 않습니다.
낡은 설치본이 있으면 `harness-team doctor`가 경고로 알려 줍니다. `docs/` seed(`README.md`·
`decisions.md`)는 설치 후 팀이 저작하는 파일이라 **refresh 대상이 아닙니다**.

**관리 절의 사용자 편집은 지우지 않습니다.** 관리 절(`protocol`·`roles`·`workflow`·`stack`·`principles`)은
**마지막으로 하네스가 렌더한 내용과 바이트가 같을 때만** 템플릿 렌더로 교체합니다. 다르면 — 즉 사용자가
그 절을 고쳤으면 — **그 절만 건너뛰고 무엇이 반영되지 않았는지 diff로 보여줍니다**. `--yes`에서도 같습니다
(프롬프트만 생략되고 경고·건너뛰기는 그대로이며, 종료 코드도 바뀌지 않습니다). 템플릿 변경을 반영하려면
그 diff를 보고 직접 옮긴 뒤 다시 실행하세요.

판정 근거는 `.harness/render-state.json`이며 **커밋 대상**입니다 — `.gitignore`가 `.harness/`를 통째로
무시하면 팀원이 clone한 뒤 첫 `init`마다 판정 근거가 없어 관리 절을 한 번 덮어씁니다. 근거가 아직 없는
기존 설치본에서는 첫 실행이 stock으로 간주해 한 번 교체하며, 그 1회는 `migrate`가 원본을 백업하고
diff로 미리 알려 줍니다(아래 `harness-team migrate` 참고).

Claude의 Bash는 TTY가 아니라 CLI의 readline 프롬프트(사용자명·적용 확인)에 답할 수
없습니다. 그래서 아래 Step 0~1에서 답을 먼저 받아 **플래그로 넘깁니다** — 플래그 없이 `init`만 실행하지 마세요.
`--stack`을 주지 않으면 자동 감지하며, React Native/Expo 전용 rules 4종은 유효 stack이 RN 계열일 때만 설치됩니다
(workspace 저장소는 RN 앱마다 `paths:`를 그 앱 경로로 스코프한 사본).
감지와 다른 `--stack`은 `.harness/render-state.json`에 고정되어 이후 플래그 없는 `init`·`doctor`·`migrate`도
그 스택을 씁니다 — 감지된 id를 다시 주면(`--stack node` 등) 고정이 풀립니다.
고정 여부는 `harness-team stack`으로 확인합니다 — text는 `pin:` 줄, `--json`은 `stackPin`(고정 없으면 `null`) 필드에 감지·고정·유효 스택과 해제 명령이 나옵니다.

**Step 0 — 기존 CLAUDE.md 커스텀 내용 확인**

현재 디렉토리에 `CLAUDE.md`가 있으면 내용을 읽고, 하네스 마커(`<!-- harness:section -->`, `<!-- harness:user -->`) 외부에 커스텀 내용이 있는지 확인하세요.

커스텀 내용이 있다면 `AskUserQuestion` 툴로 다음을 물어보세요:

> 현재 CLAUDE.md에 하네스 마커 외부의 내용이 있습니다.
> 이 내용을 하네스의 `<!-- harness:user -->` 섹션으로 이전할까요?
>
> **예** — init 완료 후 해당 내용을 `<!-- harness:user:begin -->` 블록에 추가합니다
> **아니오** — 건너뜁니다

**예** 선택 시: init 실행 완료 후, 기존 커스텀 내용을 생성된 `CLAUDE.md`의 `<!-- harness:user:begin -->` ~ `<!-- harness:user:end -->` 사이에 추가합니다.

**Step 0.5 — 저장소 모양 확인 (workspace 저장소만)**

`init --yes`는 감지된 모양을 그대로 받으므로, 실행 **전에** 미리보기로 확인받는다:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" stack --json
```

`repoShape.shape`가 `single`이면 이 단계를 건너뛴다(묻지 않는다). `app-packages`·`monorepo`면 workspace 목록
(`repoShape.workspaces`의 `dir`·`kind`·`stackId`)을 보여 주고 `AskUserQuestion`으로 묻는다 — 이 모양으로 진행할지,
단일 앱으로 처리할지. 커밋 게이트가 workspace별 목록(turbo·nx가 있으면 그 도구 위임)으로 제안되고 RN 앱이 있으면 rules가
그 앱 경로로 스코프된다는 점을 함께 알린다. **단일 앱**을 고르면 Step 1의 인수에 `--shape single`을 더한다.
이미 `.harness/gates.json`에 확정된 모양이 있으면 init은 그것을 따르므로 묻지 않는다(바꾸려면 `harness-team gate suggest`).

**Step 1 — 실행**

하네스 전용 `.gitignore` 항목(`.claude/settings.local.json`, `.harness/active.json`, `.harness/config.json`,
`.harness/observability/`, `.harness/backup/`, 사용자 handoff)은 항상 추가된다.

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" init --yes $ARGUMENTS
```

결과 확인 후 `/harness-doctor`로 무결성 점검을 권장합니다.
