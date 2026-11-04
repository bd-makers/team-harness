# Plugin eval 스위트

`claude plugin eval`로 스킬 라우팅과 응답 품질을 잰다. 유지보수용이며 npm 패키지에는 들어가지 않는다.
실행마다 비용이 들고 `npm run test`에도 포함되지 않으므로, 필요할 때 사람이 판단해서 돌린다.

## 케이스

| 번호 | 대상 |
|---|---|
| 01–06 | harness-interview |
| 10–14 | 페르소나 라우팅(contrarian·simplifier·interview) |
| 20–23 | harness-spec |
| 30–33 | review 라우팅 |
| 40–43 | test-writer(unittest·inttest·comptest) |

케이스는 `prompt.md`와 `graders/*.md`로 이뤄지고, 프로젝트 상태가 필요하면 `case.yaml`의 `scaffold_script`로
`fixture.sh`를 지정한다. 이름에 `neg`가 붙은 케이스는 스킬이 발화하지 않아야 하는 경우를 잰다.

## 언제 돌리나

- skill description을 바꿀 때: 라우팅 케이스뿐 아니라 **무관한 케이스의 품질도** 함께 본다.
  앞머리 한 단어를 바꿨을 뿐인데 도구 호출 없는 1턴 답변이 나빠진 사례가 있다(`docs/hslee/eval-defect-triage/`).
- `commands/`의 행동 지시를 바꾸고 그 효과를 확인하고 싶을 때: 먼저 그 행동을 채점하는 grader가 있는지 본다.
  없으면 grader를 추가하거나 `--keep-temp`로 응답 원문을 읽어야 한다. 점수가 같다고 수정이 먹힌 것은 아니다.

## 실행

저장소 루트를 대상으로 돌리면 `.claude/worktrees/`까지 세어 "a plugin directory holds more than 20000 entries"로
거부될 수 있다. 플러그인은 런타임 의존성이 없으므로 detached 체크아웃을 대상으로 돌린다.

```bash
git worktree add --detach <임시경로>/eval-plugin <commit>
claude plugin eval <임시경로>/eval-plugin --case '1[0-4]-*' --scaffold --judge-model sonnet -j 4 --trust-plugin --no-publish --max-cost-usd 5
```

- `--scaffold`: 기본값이 꺼짐이다. 빼면 `fixture.sh`가 돌지 않아 픽스처 케이스가 빈 프로젝트에서 실행된다.
- `--case`: 접두어가 아니라 이름 glob이다. `--case 01-vague`는 "No eval cases found"로 끝나고 `'01-vague*'`로 써야 한다.
  `'1*'`처럼 넓은 glob은 케이스가 늘면 조용히 범위가 넓어지니 `'1[0-4]-*'`처럼 좁힌다.
- `--max-cost-usd`: 상한 초과 시 exit 2로 멈춘다. 진행 중인 run만큼은 넘을 수 있다.
- `--judge-model sonnet`: 기본값은 haiku다. 전후 비교는 같은 모델로 맞춘다.
- `--no-publish`: 빼면 HTML 리포트가 claude.ai로 게시될 수 있다.
- 파일을 쓰는 test-writer 케이스는 `--allow-tools Write Edit "Bash(node:*)"`로 돌렸다.
- 플래그는 명령에 직접 적는다. zsh는 `$flags` 변수를 단어로 나누지 않는다.

기본값은 케이스당 3회, WITH(플러그인)와 W/OUT(플러그인 없음) 두 갈래다. `--ablation none`은 WITH만 돈다.
참고로 2026-11-01에 7개 케이스 측정과 추가 확인 5회를 돌리는 데 $7.91이 들었다.

## 문서 수정 전후 비교

1. 같은 커밋으로 detached 체크아웃을 두 개 만든다.
2. 한쪽만 `git checkout <이전 커밋> -- commands/`로 되돌린다. 그러면 변수가 그 문서뿐이다.
3. 두 체크아웃에 같은 플래그로 실행한다. 차이가 나면 `--runs`를 늘려 재현되는지 확인한다.

## 결과

결과는 대상 경로의 `evals/results/<timestamp>/`에 `aggregate-result.json`과 `report.html`로 남고 git에는 들어가지 않는다.
체크아웃을 지우면 함께 사라지므로 먼저 복사한다. 응답 원문과 도구 호출이 든 trace는 실행이 끝나면 지워지니
필요하면 `--keep-temp`를 붙인다. 판단에 쓴 수치는 활성 task의 `artifact.md`에 남긴다.
