#!/usr/bin/env bash
# Seeds a React web app checkout with a login form component. The manifest declares Vitest,
# Testing Library, user-event and msw, but node_modules is absent and the sandbox is offline,
# so the new tests cannot run here: this case grades routing and test-file content only.
set -euo pipefail

# eval 샌드박스는 HOME을 바꾸고 운영자의 mise 설치 경로를 가려서, PATH의 mise shim이 node를 못 찾는다.
# 샌드박스 레이아웃($PWD = $HOME/cwd)에서만, 운영자 node의 실제 설치 경로를 샌드박스 HOME의 mise 설정에 고정한다.
if [ "$PWD" = "$HOME/cwd" ] && command -v mise >/dev/null 2>&1 && command -v node >/dev/null 2>&1; then
  node_bin="$(node -p 'require("fs").realpathSync(process.execPath)')"
  mkdir -p "$HOME/.config/mise"
  printf '[tools]\nnode = "path:%s"\n' "$(dirname "$(dirname "$node_bin")")" > "$HOME/.config/mise/config.toml"
fi

mkdir -p src/components src/test

cat > package.json <<'EOF'
{
  "name": "web-app",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@vitejs/plugin-react": "^4.6.0",
    "jsdom": "^26.1.0",
    "msw": "^2.10.2",
    "vite": "^7.0.0",
    "vitest": "^3.2.4"
  }
}
EOF

cat > AGENTS.md <<'EOF'
# web-app
- React 19 + Vite SPA. 테스트: Vitest(jsdom) + Testing Library. 설정은 `vitest.config.js`.
- 이 체크아웃은 오프라인이고 node_modules가 없다 — 패키지 설치 불가. 테스트 실행은 CI가 한다.
EOF

cat > vitest.config.js <<'EOF'
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
  },
});
EOF

cat > src/test/setup.js <<'EOF'
import '@testing-library/jest-dom/vitest';
EOF

cat > src/components/LoginForm.jsx <<'EOF'
import { useState } from 'react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);
  const [user, setUser] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email.trim()) {
      setError('이메일을 입력하세요');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setError(res.status === 401 ? '이메일 또는 비밀번호가 올바르지 않습니다' : '잠시 후 다시 시도해 주세요');
        return;
      }
      setUser(await res.json());
    } finally {
      setPending(false);
    }
  }

  if (user) {
    return <p>{user.name}님, 환영합니다</p>;
  }

  return (
    <form onSubmit={handleSubmit} aria-label="로그인">
      <label htmlFor="email">이메일</label>
      <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <label htmlFor="password">비밀번호</label>
      <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={pending}>
        {pending ? '로그인 중…' : '로그인'}
      </button>
    </form>
  );
}
EOF
