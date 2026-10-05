# Stack 선언 게이트 — 설계 (Design)

- 작성일: 2026-06-02
- 대상: `harness-aijient-team-plugin`
- 상태: 승인 대기 (브레인스토밍 산출물)

## 1. 배경 / 문제

`init`/`apply`(동일 코드 경로)는 `detectStack()`으로 런타임·패키지매니저를 **얕게 자동 감지**해 `CLAUDE.md`의 `<!-- harness:section="stack" -->` 블록에 **조용히 주입**한다. 확인 단계가 없고, 감지 깊이가 얕다(프레임워크·상태관리·스타일링·테스트·아키텍처 미반영). 사용자는 다음을 원한다:

1. `init`/`apply` 실행 시 **현재 기술 스택을 상세히 파악**하고, 하네스에 적용할지 **사용자에게 물어보는 단계** 추가.
2. 다른 커맨드/스킬(`sync`, `doctor`)에도 필요한지 반영.

## 2. 결정 사항 (확정)

| 항목 | 결정 |
|---|---|
| 적용 범위 | **상세 스택 선언** (얕은 자동감지 → 풍부한 감지+확인) |
| 확보 방식 | **하이브리드**: 코드가 deps에서 감지 → Claude가 확인/보강 → 적용 |
| 카테고리 | **프론트엔드 풀세트**: Framework, Language, PackageManager, State, Styling, DataFetching, Forms, HTTP, Testing, Architecture |
| 다른 커맨드 | **영속화 + sync/doctor 연동** |
| 영속화 위치 | **Option A — CLAUDE.md stack 섹션 내 숨김 JSON 주석으로 임베드** (커밋되는 SSOT) |

### 2.1 왜 Option A (임베드)인가 — gitignore 함정

`harness.mjs`의 `appendGitignore`가 `.harness/`를 무조건 `.gitignore`에 추가한다([src/harness.mjs](../../../src/harness.mjs) `harnessNeeded`). 따라서 `.harness/stack.json`은 **로컬 캐시일 뿐 팀 공유 SSOT가 될 수 없다**. 동료가 clone하면 stack.json이 없어, `sync` 재실행 시 보강 내용(예: architecture)을 detected-only로 **덮어써 잃는 데이터 손실**이 발생한다.

→ 확정 스택을 **커밋되는 `CLAUDE.md`의 stack 섹션 내부에 숨김 JSON 주석으로 임베드**한다. clone 후에도 살아있고, 재실행/`sync`/`doctor`가 주석에서 구조화 데이터를 **무손실로 복원**해 재렌더한다.

## 3. 아키텍처

### 3.1 데이터 모델 — StackProfile

`detectStackDetailed(dir)`가 반환하는 구조 (기존 `detectStack` 필드 + `detected` 카테고리):

```jsonc
{
  // 기존 필드 (하위호환 유지)
  "id": "react-native",
  "stackLabel": "React Native (Expo)",
  "language": "TypeScript",
  "packageManager": "pnpm",
  "cmdInstall": "pnpm install",
  "cmdDev": "pnpm dev",
  "cmdTest": "pnpm test",
  "cmdLint": "pnpm lint",
  "cmdTypecheck": "pnpm typecheck",
  // 신규 — 풀세트 카테고리 (감지된 것만 값, 없으면 빈 배열)
  "state": ["Recoil"],
  "styling": ["Tailwind CSS", "nativewind"],
  "dataFetching": ["React Query"],
  "forms": ["React Hook Form"],
  "http": ["Axios"],
  "testing": ["Jest", "Detox"],
  // 감지 불가 — 사용자 입력
  "architecture": "(미지정)"
}
```

- **감지 매핑**: package.json `dependencies`+`devDependencies` 키 → 카테고리. lib→category 맵 1개로 관리.
  - state: `recoil`, `@reduxjs/toolkit`/`redux`, `zustand`, `jotai`, `mobx`
  - styling: `tailwindcss`, `styled-components`, `@emotion/react`, `nativewind`
  - dataFetching: `@tanstack/react-query`/`react-query`, `swr`
  - forms: `react-hook-form`, `formik`
  - http: `axios`, `ky`
  - testing: `jest`, `vitest`, `detox`, `@testing-library/react`, `maestro`(별도 감지 불가 시 생략)
- **architecture**: deps로 감지 불가 → 기본 `(미지정)`, 사용자 보강 항목.

### 3.2 임베드 형식

stack 섹션 렌더 결과 = 사람이 읽는 불릿 + 끝에 한 줄 숨김 주석:

```markdown
<!-- harness:section="stack" begin -->
## 기술 스택
- **Framework**: React Native (Expo)
- **Language**: TypeScript
- **Package Manager**: pnpm
- **State**: Recoil
- **Styling**: Tailwind CSS, nativewind
- **Data Fetching**: React Query
- **Forms**: React Hook Form
- **HTTP**: Axios
- **Testing**: Jest, Detox
- **Architecture**: Clean Architecture

## 명령
- install: `pnpm install`
- dev: `pnpm dev`
- test: `pnpm test`
- lint: `pnpm lint`
- typecheck: `pnpm typecheck`
<!-- harness:stack-data {"id":"react-native","architecture":"Clean Architecture",...} -->
<!-- harness:section="stack" end -->
```

- 빈 카테고리 줄은 **생략**(렌더 시 값 있는 것만).
- `extractStackData(claudeMd)` / 임베드 헬퍼로 round-trip.

### 3.3 렌더링 — `renderStackSection(stack)`

- `render.mjs`(단순 `{{var}}` 치환, 조건문 없음)는 **손대지 않는다**.
- `harness.mjs`에 `renderStackSection(stack)` 추가 — 상세 블록(불릿 + 임베드 주석)을 JS에서 완전히 문자열로 생성. `planChanges`와 `sync`가 **공용**으로 호출(분기 방지).
- `CLAUDE.md.hbs`의 stack 섹션은 `{{stackSection}}` 단일 변수로 대체하고, `planChanges`가 `renderStackSection` 결과를 주입.

### 3.4 감지 노출 — `harness-team detect`

- 신규 서브커맨드: `harness-team detect [dir] [--json]`.
- `--json`: StackProfile JSON 출력 (Claude가 파싱). 기본: 사람이 읽는 요약.
- 감지의 SSOT. apply **이전에** Claude가 결과를 받아 사용자에게 보여줄 수 있게 한다.

### 3.5 입력 채널 — `--stack-file`

- `init`/`apply`에 `--stack-file <path>` 플래그 추가. 확정된 StackProfile JSON 경로.
- 우선순위: `--stack-file` > 기존 CLAUDE.md 임베드 데이터 > `--stack <id>` > `detectStackDetailed` 자동.
- 슬래시 커맨드는 확정 JSON을 임시/로컬 파일(예: `.harness/stack.json`)에 쓰고 이 플래그로 넘긴다. 이 파일은 **authoritative 아님** — 커밋되는 CLAUDE.md 임베드가 SSOT.

## 4. 흐름 (Flow)

### 4.1 대화형 (슬래시 커맨드: harness-init.md / harness-apply.md)

1. `harness-team detect --json` 실행 → 감지된 상세 스택 수신.
2. 감지 결과를 사용자에게 표시.
3. `AskUserQuestion`:
   - **이대로 적용** — 감지값 그대로
   - **보강·교정** — 주로 architecture 입력 + 잘못 감지된 항목 수정
   - **스킵** — 자동값 유지(보강 없음)
4. 확정 StackProfile을 `.harness/stack.json`(입력 채널)에 기록.
5. `harness-team init|apply --stack-file .harness/stack.json $ARGUMENTS` 실행.

### 4.2 비대화형 (`--yes` / CI)

- AskUserQuestion 없음. `detectStackDetailed` 결과 그대로.
- architecture = `(미지정)`. detected-only 섹션을 렌더.
- 감지는 **코드에 존재**하므로 항상 유효한 섹션을 생성한다(슬래시 보강 레이어는 순수 추가분).

### 4.3 재실행 멱등성

- `init`/`apply` 재실행 시 `--stack-file` 없으면 기존 CLAUDE.md의 `harness:stack-data` 주석을 읽어 동일 렌더 → **diff 없음**(보강 내용 보존).
- 임베드 데이터가 없는 레거시 CLAUDE.md: detectStackDetailed로 채우되, **기존 섹션이 이미 채워져 있으면 downgrade하지 않는다**.

## 5. 연동 커맨드

### 5.1 sync
- CLAUDE.md 임베드 데이터에서 `renderStackSection`으로 stack 섹션 재렌더(멱등).
- 임베드 데이터 **없으면 stack 섹션을 건드리지 않는다**(downgrade 금지 — fresh clone 데이터 손실 방지).

### 5.2 doctor
- **렌더된 섹션 내용**을 검사(파일 존재 여부 아님 — clone 오탐 방지):
  - 명령이 전부 `(configure)`이거나 architecture가 `(미지정)`이면 ⚠️ 경고 + `/harness-apply`로 보강 권유.
  - 정상 채워짐이면 ✅.

## 6. 오류 처리

- package.json 없음/파싱 실패: 기존 generic 폴백 유지. detected 카테고리는 빈 배열.
- `--stack-file` 경로 없음/JSON 깨짐: stderr에 경고 1줄 출력 후 `detectStackDetailed` 자동 감지로 폴백(대화·비대화 동일). abort하지 않는다.
- 임베드 주석 파싱 실패: 자동 감지로 폴백, 기존 섹션 보존.

## 7. 비범위 (Out of scope)

- `.cursor/rules`, `.opencode` 등으로의 스택 **전파 확대**(Option B)는 하지 않는다. 스택은 CLAUDE.md에 머무르고 symlink로 AGENTS/GEMINI/.cursorrules에 도달.
- CI/CD·에러트래킹·메트릭 등 풀세트 외 카테고리는 이번 범위 아님.
- 전용 재선언 커맨드(`harness-team stack`) 신설하지 않음 — 재선언은 `apply` 재실행.

## 8. 테스트 전략

- `detect-stack.test.mjs`(신규): fixture deps → 카테고리 매핑 정확성, generic 폴백.
- `renderStackSection`: 값 있는 카테고리만 렌더 / 임베드 주석 형식 / `extractStackData` round-trip.
- merge 멱등성: 임베드 데이터 기반 재실행 시 diff 없음.
- sync no-downgrade: 임베드 데이터 없을 때 섹션 불변.
- doctor: 플레이스홀더 섹션 → 경고, 정상 → 통과.
- 비대화(`--yes`): architecture `(미지정)` 섹션 생성.

## 9. 빌드 순서 (결합도 존중)

1. `detectStackDetailed` + StackProfile 스키마 (detect-stack.mjs)
2. `harness-team detect [--json]` 서브커맨드 + bin 등록
3. `renderStackSection` + `extractStackData` (harness.mjs) + CLAUDE.md.hbs `{{stackSection}}`
4. `--stack-file` 입력 채널 + 우선순위 (init.mjs)
5. 대화형 플로우 (harness-init.md / harness-apply.md)
6. sync no-downgrade 재렌더 + doctor 경고

## 10. 영향 파일

| 파일 | 변경 |
|---|---|
| `src/detect-stack.mjs` | `detectStackDetailed` + lib→category 맵 |
| `src/harness.mjs` | `renderStackSection`, `extractStackData`, planChanges 연동, sync용 export |
| `src/commands/init.mjs` | `--stack-file` 처리, 임베드 데이터 우선순위, no-downgrade |
| `src/commands/sync.mjs` | 임베드 데이터 기반 stack 섹션 재렌더(없으면 skip) |
| `src/commands/doctor.mjs` | stack 섹션 플레이스홀더 경고 |
| `bin/harness-team.mjs` | `detect` 커맨드 + `--stack-file` 파싱 + HELP |
| `templates/CLAUDE.md.hbs` | stack 섹션 → `{{stackSection}}` |
| `commands/harness-init.md` | detect → AskUserQuestion → --stack-file 플로우 |
| `commands/harness-apply.md` | 동일 플로우 |
| `tests/*` | 위 테스트 전략 |
