# doctor-eager-global — Spec

## 목적 / 요구사항

`doctor`의 eager 계층 크기 경고(`EAGER_TIER_MAX_BYTES` = 24 KiB)가 **프로젝트
`AGENTS.md` + `CLAUDE.md`만** 잰다. 그런데 사용자 전역 `~/.claude/CLAUDE.md`도 매 세션
무조건 로드되는 같은 계층인데 측정에서 빠져 있다. 결과적으로 **실제 상시 로드량이 임계를
넘어도 doctor가 green을 보고**할 수 있다 — 새 기능이 아니라 **측정 정확도 결함**이다.

요구사항:
- 전역 `CLAUDE.md`를 eager 계층 측정에 포함한다. **읽기 전용** — 쓰기·수정·삭제 없음.
- fail이 아니라 **warning** 유지 (0.23.0의 판단: 문서가 커지는 데 정당한 이유가 있을 수 있고
  판단은 사람 몫).
- 전역 파일 부재·읽기 불가 시 **조용히 건너뛰고** 기존 동작을 그대로 유지한다.
- 전역 설정 경로를 바꾸는 환경변수가 있으면 존중한다.
- 테스트: 전역 파일 있음/없음/읽기 불가, 임계 위/아래 경계.

### 측정 실측 (2026-08-31, 이 워크트리 + chadonpro 머신)

| 항목 | 바이트 |
|---|---|
| 프로젝트 `AGENTS.md` | 11,079 |
| 프로젝트 `CLAUDE.md` | 4,889 |
| 전역 `~/.claude/CLAUDE.md` | 5,620 |
| **실제 상시 로드 합계** | **21,588** (임계의 88%) |

> **브리프의 수치와 다르다.** 브리프는 전역 8,734 B → 합계 24,702 B로 "이미 임계 초과"라고
> 적었다. 그 값은 측정 시점에는 맞았다 — `~/.claude/CLAUDE.md.bak-20260831`(11:09, 7,147 B)이
> 남아 있고, 같은 날 전역 파일에서 낡은 워크플로우 절을 걷어내며 계속 줄었다(18:04 기준 5,620 B).
> **따라서 이 변경은 메인테이너 머신을 day-one에 노랗게 만들지 않는다.** 결함의 근거는
> "지금 임계를 넘었다"가 아니라 **"임계를 넘어도 doctor가 그것을 볼 수 없다"** 는 사각지대 자체다.
> 오케스트레이터가 이 정정과 프레이밍을 확인했다(2026-08-31) — day-one 경고 없음은 정상이며
> **성공의 증거로 삼지 않는다.** 증거는 `CLAUDE_CONFIG_DIR`로 fixture를 가리켜 임계 초과를
> 결정론적으로 구성하는 테스트가 만든다 — 실제 `~/.claude`는 건드리지 않는다.

## 설계 / 접근

### 결정 1 — 합산 (임계 하나) vs 별도 보고

**합산을 택한다.** 24 KiB 판정에 전역 `CLAUDE.md`를 더하고, **메시지에서 파일별로 분해**해
보여준다.

근거:
1. **별도 보고는 이 결함을 고치지 못한다.** 전역에 별도 임계를 두면 "프로젝트 15,968(통과) +
   전역 8,734(통과) = 24,702(초과)"가 여전히 두 줄 모두 green으로 빠져나간다. 신고된 결함은
   *부분*이 아니라 *합계*가 임계를 넘는 경우다.
2. **임계의 원래 의미가 합계다.** 24 KiB는 "매 세션 무조건 context에 들어가는 양"의 예산이다.
   context window는 바이트가 어느 파일에서 왔는지 구분하지 않는다.
3. **머신 의존성은 이 도구에서 새롭지 않다.** doctor는 이미 `checkCliDrift`,
   `checkHookCli` 등 머신 로컬 상태를 점검한다. 같은 레포라도 머신마다 결과가 다른 것은
   doctor의 성질이지 이 검사만의 흠이 아니다.

합산의 유일한 실질 비용은 "프로젝트는 멀쩡한데 내 전역 파일 때문에 경고가 뜬다"인데,
**메시지 분해로 해소한다** — 어느 계층이 주범인지 숫자로 보이면 사용자가 맞는 파일을 고른다.

### 결정 2 — 메시지는 파일별 분해 + 해결된 전역 경로를 출력한다

기존 메시지의 처방("절차는 lazy 정본으로 옮기세요")은 **프로젝트 파일**을 가리킨다. 전역
파일이 주범일 때 그 처방은 하네스가 건드려선 안 되는 파일을 향한 오조준이 된다. 그래서:

- 파일별 바이트를 나열해 주범을 사용자가 직접 보게 한다.
- 전역은 **해결된 실제 경로**를 출력한다 — `CLAUDE_CONFIG_DIR`이 설정되면 `~/.claude/CLAUDE.md`가
  아니므로, 라벨만으로는 사용자가 조치할 대상을 찾을 수 없다.
- 전역이 포함된 경우 그 파일이 **프로젝트 밖(사용자 소유)** 이고 하네스가 고치지 않는다는
  사실을 문구로 남긴다.

### 결정 3 — 전역 경로 해석: `CLAUDE_CONFIG_DIR`을 존중한다 (1차 출처로 확인함)

브리프 항목 4는 "추측하지 말고 실제로 확인할 것"을 요구했다. Claude Code 바이너리
(`~/.local/share/claude/versions/2.1.251`, 2.1.251)에서 추출한 실제 해석 코드:

```js
function s(){ return process.env.CLAUDE_CONFIG_DIR }
var be = si(() => (s() ?? i(g(), ".claude")).normalize("NFC"), s);   // g = os.homedir
// ...
function hAe(e){ let t = Se(); switch(e){
  case "User":    return He(be(), "CLAUDE.md");        // ← 전역(user) 메모리
  case "Local":   return He(t, "CLAUDE.local.md");
  case "Project": return He(t, "CLAUDE.md");
  case "Managed": return He(ib(), "CLAUDE.md");
}}
```

같은 바이너리의 네임스페이스 표에도 `["user-memory","CLAUDE.md"]`가 있다.
→ 전역 메모리 = `join(process.env.CLAUDE_CONFIG_DIR ?? homedir()/.claude, 'CLAUDE.md')`.
이는 이 레포가 이미 쓰는 `env.CLAUDE_PLUGINS_ROOT ?? join(homedir(), '.claude/plugins')`
패턴(`doctor.mjs:200,205,221`)과 정확히 같은 모양이라 그대로 따른다.

### 결정 4 — `env`를 파라미터로 주입한다 (테스트 격리 필수)

`homedir()` 폴백이 생기는 순간 기존 `checkEagerTierSize(dir)` 호출 4곳
(`tests/doctor.test.mjs:304,312,319,331`)과 runDoctor 배선 테스트가 **실행 머신의 진짜
`~/.claude/CLAUDE.md`를 읽게 되어 머신 의존적으로 깨진다.** 따라서 `checkEagerTierSize(targetDir,
env = process.env)`로 서명을 넓히고, 테스트는 격리된 빈 `CLAUDE_CONFIG_DIR`을 주입한다.
runDoctor 배선 테스트는 이미 `doctorJson(targetDir, env)`가 subprocess env를 받으므로
그 경로로 주입한다.

### 결정 5 — "읽기 불가"는 chmod이 아니라 디렉터리로 만든다

`chmod 000`은 root에서 무력하고 CI 컨테이너는 root로 도는 경우가 흔하다. `CLAUDE.md`라는
이름의 **디렉터리**를 만들면 `readFile`이 `EISDIR`로 실패해 결정론적으로 재현된다.

### 결정 6 — 프로젝트 `.claude/CLAUDE.md`도 이번 범위에 포함 (증거 조건 충족)

오케스트레이터는 "User 스코프에 대해 한 것과 **같은 수준의 1차 출처 증거**를 확보하면 포함,
아니면 후속으로 내려라" 는 조건을 걸었다. 같은 바이너리에서 확보했다:

```js
import{ join as Em, parse as h6n, relative as uMt }from"path"     // ← Em = path.join
// ...
if(d){ let _=Em(e,"CLAUDE.md");            u.push(...await Hg(_,"Project",r,!1));
       let C=Em(e,".claude","CLAUDE.md");  u.push(...await Hg(C,"Project",r,!1)) }
```

`.claude/CLAUDE.md`가 루트 `CLAUDE.md`와 **같은 함수·같은 루프·같은 "Project" 스코프 라벨**로
로드된다. 조상 디렉터리를 훑는 다른 호출 지점에서도 같은 쌍이 나타나 호출 지점이 둘이다 —
User 스코프 증거와 동등하거나 그 이상이다. → **조건 충족, 포함.**

포함해야 하는 이유도 있다: 전역만 넣고 이걸 빼면 "실제 로드량을 잰다" 는 주장이 여전히
거짓이라 같은 결함이 절반 남는다. 게다가 이 파일은 **하네스 소유 경계 안**이라 homedir 제약과
무관하다.

## Ontology
*이 task가 다루는 핵심 개념의 정의.*

- **eager 계층**: 매 세션 시작 시 **무조건** context에 로드되는 지시 파일 집합. lazy 계층
  (커맨드 문서·스킬·rules)과 대비된다. 이 task 이후의 정의 = 프로젝트 `AGENTS.md` +
  프로젝트 `CLAUDE.md` + **프로젝트 `.claude/CLAUDE.md`** + **전역(user) `CLAUDE.md`**.
- **전역(user) `CLAUDE.md`**: `CLAUDE_CONFIG_DIR ?? ~/.claude` 아래의 `CLAUDE.md`.
  Claude Code가 "User" 스코프 메모리로 로드한다. **프로젝트 경계 밖**이라 하네스는 읽기만 한다.
- **경계(하드 제약)**: 하네스는 프로젝트 디렉터리 밖에 쓰지 않는다. 현재 `homedir()`을 만지는
  곳은 `~/.claude/plugins`(플러그인 설치 채널)와 backup-dir뿐이며, 이 task는 **읽기 1건**만
  추가한다.
- **warning vs fail**: warning은 exit code에 영향을 주지 않고 사람의 판단을 요청한다.
  이 검사는 크기만 재고 자동 요약·삭제를 하지 않으므로 warning이 맞다.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — "eager 계층 측정에 전역 `CLAUDE.md`를 읽기 전용으로 합산하고,
      메시지를 파일별로 분해한다." 한 문장으로 확정.
- [x] **Constraint 명확도** (30%) — 읽기 전용 / 프로젝트 밖 쓰기 금지 / warning 유지 /
      부재·읽기 불가 시 무음 / `CLAUDE_CONFIG_DIR` 존중 / `@import` 재귀는 범위 밖. 전부 명시.
- [x] **Success 기준** (30%) — 전역 유/무/읽기 불가 × 임계 위/아래 경계 테스트 통과,
      기존 doctor 테스트 무회귀(머신 독립), CI green.
- [x] **Context 명확도** (brownfield) — `src/commands/doctor.mjs:329-346`(검사),
      `:549`(runDoctor 배선), `tests/doctor.test.mjs:297-336`(단위), `:548-570`(배선).
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0.

게이트 통과 근거는 위 Ontology에 반영했다 — 특히 "eager 계층"의 정의가 이 task로
확장된다는 점이 이 변경의 전부다.

## Done evidence
```json
{ "version": 1, "review": "required", "tests": "required" }
```

## 범위 밖 (후속 후보 — 이번에 구현하지 않는다)

브리프 §5가 `@import` 재귀 계산을 명시적으로 제외했다. 바이너리를 읽는 과정에서 **같은
계층에 속하는 다른 eager 소스**를 추가로 확인했다. 그중 프로젝트 `.claude/CLAUDE.md`는
오케스트레이터 승인으로 **이번 범위에 포함**했고(아래 "결정 6"), 나머지는 재발견 비용을
없애기 위해 기록만 남긴다:

- **`CLAUDE.local.md`** — "Local" 스코프로 로드된다. gitignore 대상이라 팀 공유 문서는 아니다.
- **전역 rules 디렉터리** (`~/.claude/rules`, User 스코프) — 조건부 rule 여부에 따라 항상
  eager라고 단정할 수 없어 확인이 더 필요하다.
- **`CLAUDE_CODE_DISABLE_CLAUDE_MDS`** — 설정되면 모든 `CLAUDE.md` 로드가 꺼져 이 검사 전체가
  무의미해진다. 존중할지는 별도 판단(현재 검사도 프로젝트 파일에 대해 이를 보지 않는다).
- **`@import`로 끌려오는 파일 재귀 계산** — 브리프가 명시적으로 범위 밖으로 지정.
- **symlink로 같은 파일을 가리키는 경우의 중복 제거** — dedupe는 `resolve()`(문자열 정규화)
  기준이라 심볼릭 링크로 이어진 동일 파일은 두 번 세진다. 실제로 발생하려면 config home의
  `CLAUDE.md`가 프로젝트 파일을 가리키는 링크여야 해 현실성이 낮다. `realpath`는 I/O를 늘리므로
  이번에는 넣지 않는다.

## 참고

- `src/commands/doctor.mjs:329` — `EAGER_TIER_MAX_BYTES`, `checkEagerTierSize`
- `src/commands/doctor.mjs:200,205,221` — 따라야 할 `env.<VAR> ?? join(homedir(), …)` 패턴
- `tests/doctor.test.mjs:297-336, 548-570` — 회귀 위험이 있는 기존 테스트
- 1차 출처: Claude Code 2.1.251 바이너리 문자열 (위 "결정 3"에 인용)
