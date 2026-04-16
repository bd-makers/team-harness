---
paths:
  - "app/**/*.tsx"
  - "src/**/*navigation*"
  - "src/**/*router*"
---
# 네비게이션 규칙 (Expo Router)

## 기본 원칙
- 파일 기반 라우팅 — `app/` 디렉토리 구조 = URL 구조
- 네비게이션 로직은 `app/` 내에서만, 비즈니스 로직은 `src/`에서 처리
- `router.push()` / `router.replace()` / `<Link>` 사용

## 라우트 구조 패턴
```
app/
  _layout.tsx              # Root layout (providers, global UI)
  index.tsx                # Entry redirect
  +not-found.tsx           # 404
  (tabs)/
    _layout.tsx            # Tab navigator
    home.tsx
    profile.tsx
  (auth)/
    _layout.tsx            # Auth flow layout (no tabs)
    login.tsx
    register.tsx
  [id].tsx                 # Dynamic route
  settings/
    index.tsx
    notifications.tsx
```

## Layout 파일 규칙
- `_layout.tsx`에서 `<Stack>`, `<Tabs>` 등 navigator 설정
- Provider(Context, QueryClient 등)는 root `_layout.tsx`에 배치
- 그룹 `(groupName)/`은 URL에 포함되지 않음 — 레이아웃 분리 목적

## 네비게이션 API
```typescript
// ✅ 타입 안전한 네비게이션
import { router } from 'expo-router';

router.push('/profile/123');           // 스택에 추가
router.replace('/home');               // 현재 화면 교체 (뒤로가기 불가)
router.back();                         // 이전 화면

// params 접근
import { useLocalSearchParams } from 'expo-router';
const { id } = useLocalSearchParams<{ id: string }>();
```

## 인증 플로우
- root `_layout.tsx`에서 인증 상태 확인 → 미인증 시 `(auth)` 그룹으로 redirect
- `router.replace()` 사용하여 back stack에 인증 화면 남지 않도록 처리
- 세션 만료 시 전역 interceptor에서 redirect

## Deep Linking
- Expo Router가 자동 처리 — 수동 linking config 불필요
- `app.config.ts`의 `scheme` 설정만 확인
- Universal Links / App Links는 `expo-router`의 가이드 참조

## 금지 패턴
- `app/` 외부에서 직접 `router.push()` 호출 (service/store 계층에서)
- 네비게이션 상태를 전역 store에 저장
- `useNavigation()` (React Navigation 직접 사용) — Expo Router API 사용할 것
- 하드코딩된 경로 문자열 반복 — 상수로 관리하거나 타입 활용
