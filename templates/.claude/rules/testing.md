---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
  - "**/*.test.ts"
  - "**/*.test.tsx"
---
<!-- harness:rule origin=harness-aijient-team/templates since=2026-09-05 -->
# 테스트 규칙 (React Native + TypeScript)

## 테스트 도구
- Jest + React Native Testing Library (@testing-library/react-native)
- MSW (Mock Service Worker) for API mocking
- jest-expo preset 사용

## 필수 원칙
- 행위(behavior) 변경 시 반드시 테스트 추가 또는 수정
- 구현 세부사항이 아닌 사용자 관점에서 테스트 (getByText, getByRole 등)
- `testID`는 테스트 전용 — 프로덕션 로직에서 참조 금지

## 테스트 구조
```typescript
describe('ComponentName', () => {
  // 공통 setup
  const defaultProps: ComponentProps = { /* ... */ };
  const renderComponent = (overrides?: Partial<ComponentProps>) =>
    render(<Component {...defaultProps} {...overrides} />);

  it('should [expected behavior] when [condition]', () => {
    // Arrange → Act → Assert
  });
});
```

## 네이밍 컨벤션
- 테스트 파일: `ComponentName.test.tsx` 또는 `useHookName.test.ts`
- 컴포넌트와 같은 디렉토리에 co-locate (또는 `__tests__/` 하위)
- describe: 컴포넌트/훅 이름
- it: `should [동작] when [조건]` 형식

## Mocking 가이드라인
- native 모듈은 `jest.setup.ts`에서 전역 mock
- navigation mock: `jest.mock('expo-router')` 후 필요한 hook만 구현
- API mock은 MSW handler 우선, 불가능한 경우만 `jest.mock`
- 타이머 테스트: `jest.useFakeTimers()` 사용 후 반드시 `jest.useRealTimers()` 복원

## 금지 패턴
- `waitFor` 내부에서 side effect 실행
- snapshot 테스트 남용 (의미 있는 assertion 우선)
- `act()` 수동 래핑 — RNTL의 API가 자동 처리
- 테스트 간 공유 mutable state
