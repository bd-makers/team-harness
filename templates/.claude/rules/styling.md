---
paths:
  - "src/components/**/*.tsx"
  - "src/features/**/components/**/*.tsx"
  - "app/**/*.tsx"
---
# 스타일링 규칙 (React Native)

## 기본 원칙
- `StyleSheet.create()` 사용 — 컴포넌트 파일 하단에 배치
- inline style은 동적 값(애니메이션, 조건부)에만 허용
- 디자인 토큰(색상, 간격, 폰트)은 `src/constants/theme.ts`에서 중앙 관리

## 디자인 토큰 사용
```typescript
// ✅ Good
import { colors, spacing, typography } from '@/constants/theme';
const styles = StyleSheet.create({
  container: { padding: spacing.md, backgroundColor: colors.background },
  title: { ...typography.heading, color: colors.text },
});

// ❌ Bad — 매직 넘버 직접 사용
const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' },
});
```

## 반응형 레이아웃
- `useWindowDimensions()` 또는 `Dimensions` API 활용
- 절대 px 보다 flex 비율 우선
- Safe Area: `react-native-safe-area-context`의 `useSafeAreaInsets()` 사용
- 노치/Dynamic Island 대응 필수

## 다크 모드
- `useColorScheme()` 기반으로 테마 분기
- 색상은 시맨틱 네이밍 사용 (`colors.text`, `colors.surface` 등)
- 하드코딩된 색상값 금지

## 애니메이션
- 단순 전환: `LayoutAnimation` 또는 Expo의 `Animated` API
- 복잡한 인터랙션: `react-native-reanimated` (worklet 기반)
- JS thread 블로킹 애니메이션 금지 — `useNativeDriver: true` 또는 reanimated 사용

## 금지 패턴
- 전역 스타일 객체를 여러 컴포넌트에서 공유 (컴포넌트 자체를 공유할 것)
- `!important` 개념 없음 — style 배열 순서로 우선순위 관리
- web-only CSS 속성 사용 (`box-shadow` → `shadow*` props 또는 `elevation`)
