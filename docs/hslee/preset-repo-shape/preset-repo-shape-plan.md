# preset-repo-shape — Plan

## 목표
init이 저장소 모양(single / app-packages / monorepo)을 판별·확인하고, 커밋 게이트는 turbo·nx 위임 또는 workspace별 목록(`commit` 객체)으로,
RN rules는 앱 경로로 스코프한 rules 프리셋으로 제안한다. workspace가 없는 단일 앱은 출력·기록 바이트 동일(spec G1).

## 단계
- [x] spec/plan 다이어그램 작성 → docs/hslee/preset-repo-shape/preset-repo-shape-diagram.html
- [x] 1. 모양 판별 — `src/repo-shape.mjs` `detectRepoShape(dir, preset)`: `workspaces`(배열·`{packages}`)·`pnpm-workspace.yaml` 패턴을 펼쳐
      `package.json` 있는 디렉터리만(node_modules·점 디렉터리 제외, `!` 부정 패턴), kind는 `node.json` `workspace.app` 조건(앱 우선),
      루트가 앱이면 `"."`(workspace 원천 있을 때만), shape = 0 → single / 앱 ≥ 2 → monorepo / 그 외 app-packages. 테스트: `tests/repo-shape.test.mjs` 픽스처 5종+루트 앱
- [x] 2. 제안 — `buildProposal(dir, stack, { unattended, shape })`: single은 지금 그대로(기존 presets 테스트 무변경), workspace는
      `delegate`(turbo·nx, 데이터) 우선, 없으면 workspace별 `cd <dir> && …` 객체(`"."`=루트 앱), 지문 `{preset, pm, shape, workspaces, signals}`
      (signals는 `<dir>:` 접두), `describeProposal` 객체 표시. turbo·nx 명령 형태는 공식 문서 조사 결과로 확정. 테스트: `tests/presets.test.mjs` 추가
- [x] 3. 실행 — `gate commit` 객체 형식: 형태 검증 확장, 바뀐 파일 = `git diff --name-only --relative HEAD` + `ls-files --others --exclude-standard`,
      HEAD 없으면 전 키, 키 매칭은 상위 디렉터리 `matchesGlob`, `"."`는 안 걸린 변경에만, 같은 명령은 한 번. 테스트: `tests/gate-command.test.mjs` 추가(배열 기존 테스트 무변경)
- [x] 4. 확인 흐름 — 공용 `resolveShape`(workspace 없음 → 묻지 않음, 있음 → 목록·RN rules 표시 후 확인, 거절 → single, `--yes` → 감지 채택,
      기존 gates의 확정 shape가 있으면 재사용): init·`gate suggest`·migrate(`migrateGates`)가 사용. 테스트: `tests/init-gates.test.mjs`·`migrate-gates` 추가
- [x] 5. doctor drift — 확정 shape 기준 비교: `single` 확정이면 workspace 무시, workspace 집합 변화만 drift, 앱 수 변화 무시, shape 키 없는 기존 지문은
      workspace가 새로 생겼을 때만 알림. 테스트: `tests/doctor.test.mjs` 추가
- [x] 6. RN rules 프리셋 — `templates/presets/rules/react-native.json`(match stackIds, files), `planRuleInstalls`(single = 유효 stack id, workspace = 앱 workspace별
      stack id), `copyStaticAssets`의 rules 일괄 복사 단계·`excludesRnRules`·`RN_ONLY_RULE_FILES` 제거, 접두 설치(`paths:`만 치환, 파일명 `<dir slug>-<name>.md`),
      빈 `.claude/rules` 생성·`Copied N` 집계 유지, mirror 전에 설치. 테스트: `tests/stack-conditional-rules.test.mjs` 재작성, `migrate-templates` 전제 테스트 확인
- [x] 7. 문서 — `docs:generate`(overview), spec·artifact 갱신, 주석(`harness.mjs:211`·`init.mjs:27`·`settings-permissions.mjs:21,39`)
- [x] 8. 검증 — `npm run test`·`npm run docs:check` PASS, 픽스처 실측(npm·pnpm·turbo·nx 임시 디렉터리 init `--yes` 출력) artifact 기록
- [x] 9. 리뷰 — codex(`review --scope diff --base origin/main`) + 새 컨텍스트 리뷰, 결과 artifact `## Reviews`
- [ ] 10. 커밋·PR

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-10-06: 패키지 신호(`main`·`exports`)를 데이터로 두지 않는다 — kind는 "앱 조건 참 → 앱, 아니면 패키지"라 패키지 조건이 판정에 쓰이지 않는다(spec R2 갱신).
- 2026-10-06: 앱 = 프레임워크 런타임 의존성만(dev·start 스크립트 제외, 리뷰 P2-3). init 재실행 시 shape 없는 기존 gates.json은 확정 single로 본다.
- 2026-10-06: `--shape single`(init) — 감지된 workspace 모양의 비대화식 거절. 모양 자체를 지정하는 플래그가 아니다.
- 2026-10-06: 위임 도구(turbo·nx) 판정도 프리셋 데이터(`delegate`)다 — `repo-shape`는 도구를 모른다.

## 참고
- spec: `preset-repo-shape-spec.md` (G1–G4, 설계 4). 기준 task: `docs/hslee/preset-gates/`.
- 템플릿 훅은 바꾸지 않는다(gate.mjs만) — sha 완결성 테스트 영향 없음.
