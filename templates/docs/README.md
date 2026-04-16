# docs/ — 팀원·task별 작업 문서

모든 작업(feature/fix) 문서는 아래 구조로 관리됩니다:

```
docs/
└── <member>/                      # git config user.name 또는 $USER
    ├── feature/
    │   └── <task-name>/
    │       ├── spec.md            # 요구사항 / 설계 (사람이 먼저 작성)
    │       ├── plan.md            # 단계별 체크리스트
    │       ├── handoff.md         # 세션 인수인계
    │       └── artifact.md        # 실행 결과 (flow/sequence/test)
    └── fix/
        └── <task-name>/
            └── (동일 4개 파일)
```

## 사용법

```bash
harness-team task new feature <name>     # 새 feature task 생성 + active 전환
harness-team task new fix <name>         # 새 fix task 생성 + active 전환
harness-team task switch <name>          # 기존 task로 전환
harness-team task list                   # 전체 task 목록
harness-team task done                   # 현재 task artifact.md에 git log/diff 자동 수집
```

활성 task의 정보는 `.harness/active.json`에 저장됩니다.

## 규약

- **spec.md**: 왜/무엇을. 사람이 작성 후 AI가 참고.
- **plan.md**: 어떻게. 세션 시작/종료마다 체크리스트 갱신.
- **handoff.md**: 세션 간 인수인계 메모.
- **artifact.md**: 완료 후 남는 증거 (`task done` 실행 시 자동으로 git diff/log/test 결과 append).
