# envguard

시크릿이 git에 커밋되는 것을 **pre-commit 단계에서** 막는 가벼운 제로 설정 CLI. Next.js 등 프론트엔드/JS 프로젝트가 주 타겟.

## 설치

```bash
npm install -D envguard husky
npx envguard init
```

`init`은 다음을 자동으로 수행합니다(멱등):
- `.husky/pre-commit` 에 `npx envguard scan --staged` 등록
- `package.json` 에 `"prepare": "husky"` 추가 (clone 후 `npm install`만으로 훅 복원)
- 루트에 기본 `.envguardrc` 생성

## 사용

```bash
envguard scan --staged   # 스테이지된 파일만 (pre-commit 훅에서 자동 실행)
envguard scan            # 트래킹되는 전체 파일 (CI/수동)
```

위반이 있으면 exit code 1로 커밋/CI를 막습니다. warning만 있으면 통과합니다.

## 탐지 규칙

- `.env*` 파일 차단 (`.env.example` / `.sample` / `.template` 은 허용)
- 코드 내 키 패턴: AWS, Google API, Stripe, JWT 등
- 범용 high-entropy 문자열 (보수적)
- `NEXT_PUBLIC_` 에 시크릿처럼 보이는 값 → **경고**(exit code 영향 없음)
- 사용자 지정 `watch` 파일 차단

## 설정 (`.envguardrc` 또는 package.json "envguard")

우선순위: `.envguardrc` > `package.json`의 `"envguard"` 키 > 기본값.

```json
{
  "watch": ["config/secrets.ts", "src/firebase.config.js"],
  "ignore": [".env.example"],
  "allowNextPublic": false,
  "entropyThreshold": 4.0
}
```

| 키 | 설명 | 기본값 |
|----|------|--------|
| `watch` | 커밋 금지할 사용자 지정 파일 | `[]` |
| `ignore` | 스캔 제외 경로/글롭 | `[".env.example", ".env.sample", ".env.template"]` |
| `allowNextPublic` | true면 NEXT_PUBLIC_ 경고 끔 | `false` |
| `entropyThreshold` | high-entropy 민감도(높일수록 둔감) | `4.0` |

## CI 연동 (GitHub Actions)

```yaml
name: envguard
on: [push, pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx envguard scan
```

## 이미 history에 올라간 시크릿

`envguard`는 앞으로의 커밋을 막을 뿐 과거 기록은 지우지 않습니다. 이미 노출됐다면:
1. 해당 키를 **즉시 폐기(rotate)** 하세요.
2. `git filter-repo` 또는 BFG로 history에서 제거하세요.

## 로컬 개발

```bash
npm install
npm run build
npm link          # 전역에 envguard 연결
npm test
```
