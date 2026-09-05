---
paths:
  - "src/stores/**/*.ts"
  - "src/hooks/**/*.ts"
  - "src/features/**/hooks/**/*.ts"
  - "src/services/**/*.ts"
---
<!-- harness:rule origin=harness-aijient-team/templates since=2026-09-05 -->
# 상태 관리 규칙

## 상태 분류 및 도구 선택

| 상태 종류 | 도구 | 위치 |
|-----------|------|------|
| 서버/비동기 데이터 | TanStack Query (React Query) | `src/services/` + hooks |
| 전역 클라이언트 상태 | Zustand | `src/stores/` |
| 로컬 UI 상태 | `useState` / `useReducer` | 컴포넌트 내부 |
| 폼 상태 | React Hook Form + Zod | 컴포넌트 / feature hooks |
| URL 상태 | Expo Router params | `app/` 라우트 |

## TanStack Query (서버 상태)
```typescript
// src/services/user.ts — API 함수
export const userApi = {
  getProfile: (id: string) => httpClient.get<UserProfile>(`/users/${id}`),
  updateProfile: (data: UpdateProfileInput) => httpClient.patch<UserProfile>('/users/me', data),
};

// src/features/profile/hooks/useUserProfile.ts
export const useUserProfile = (id: string) =>
  useQuery({
    queryKey: ['user', 'profile', id],
    queryFn: () => userApi.getProfile(id),
  });
```
- queryKey는 계층적 배열 형태: `['domain', 'action', ...params]`
- mutation 후 관련 query invalidation 필수
- `staleTime`, `gcTime` 적절히 설정 (무한 캐시 금지)

## Zustand (전역 클라이언트 상태)
```typescript
// src/stores/authStore.ts
interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),
    }),
    { name: 'auth-storage', storage: createJSONStorage(() => AsyncStorage) }
  )
);
```
- store는 기능 단위로 분리 (하나의 거대 store 금지)
- selector로 필요한 값만 구독: `useAuthStore((s) => s.token)`
- 비동기 로직은 store 밖에서 처리 (action에서 async 최소화)

## 필수 원칙
- 서버 데이터를 Zustand/useState에 복제 금지 → TanStack Query가 캐시 관리
- prop drilling 3단계 이상이면 Context 또는 store 도입 검토
- 상태 끌어올리기(lift state up)를 먼저 시도, 전역화는 최후 수단
- 파생 상태는 `useMemo` 또는 Zustand의 derived selector로 처리

## 금지 패턴
- `useEffect`로 상태 동기화 체인 만들기
- 같은 데이터를 여러 store에 중복 저장
- 컴포넌트 내부에서 직접 `fetch` 호출 (서비스 계층 우회)
- `any` 타입의 store state
