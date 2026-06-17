# commitGuard

> 다른 언어로 보기: [English](./README.md)

시크릿이 git에 커밋되는 것을 **pre-commit 단계에서**, 즉 history에 남기 전에 막는 가볍고 **제로 설정(zero-config)** CLI. husky를 1급으로 지원하며 프론트엔드/JS 프로젝트(특히 Next.js)를 주 타겟으로 합니다.

gitleaks·trufflehog는 강력하지만 설정이 번거롭고 husky를 1급으로 지원하지 않습니다. commitGuard는 명령 하나 — **`npx commitguard init`** — 로 husky 훅 등록 + 합리적 기본값 내장 + **설정 파일 작성 0개**를 목표로 합니다.

- 🔒 `.env*` 파일과 코드에 박힌 API 키를 커밋 전에 차단
- 🪝 **husky** 1급 통합 — 한 줄 명령으로 연결
- 📦 **런타임 의존성 0**, ESM, TypeScript
- 🎯 보수적 설계 — false positive 최소화에 우선순위
- ⚡️ **스테이지 blob**을 읽어, 스테이징 후 수정으로 시크릿이 빠져나가는 것을 차단

## 설치

```bash
npm install -D commitguard husky
npx commitguard init
```

`init`은 다음을 멱등(idempotent)하게 수행합니다(재실행 안전):

- `.husky/pre-commit` 에 `npx commitguard scan --staged` 등록
- `package.json` 에 `"prepare": "husky"` 추가 (clone 후 `npm install`만으로 훅 복원)
- 루트에 기본 `.commitguardrc` 생성 (이미 있으면 보존)

## 사용

```bash
commitguard scan --staged   # 스테이지된 파일만 (pre-commit 훅에서 자동 실행)
commitguard scan            # 트래킹되는 전체 파일 (CI / 수동)
```

- error 레벨 위반이 있으면 **exit code 1** 로 커밋/CI를 막습니다.
- warning만 있으면 통과합니다(exit code 0).
- git 저장소 밖에서 실행하면 **exit code 2**.

## 탐지 규칙

| 규칙 | 심각도 | 비고 |
|------|--------|------|
| `.env*` 파일 스테이지 | error | `.env.example` / `.sample` / `.template` 은 허용 |
| 알려진 키 패턴 | error | AWS, Google API, Stripe, JWT 등 |
| 범용 high-entropy 문자열 | error | false positive를 줄이는 보수적 임계값 |
| `NEXT_PUBLIC_` 에 시크릿처럼 보이는 값 | **warning** | 의도적 노출일 수 있어 커밋을 막지 않음 |
| 사용자 지정 `watch` 파일 | error | 절대 커밋되면 안 되는 파일 |

각 위반은 **무엇이 / 어디서 / 왜 위험 / 어떻게 고치나** 4요소로 출력되며, 시크릿 토큰은 마스킹됩니다.

## 설정

설정 없이도 동작합니다. 커스터마이즈하려면 `.commitguardrc`(순수 JSON) **또는** `package.json`의 `"commitguard"` 키를 사용합니다.

우선순위: **`.commitguardrc` > `package.json`의 `"commitguard"` 키 > 기본값.**

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
| `allowNextPublic` | `true`면 NEXT_PUBLIC_ 경고 끔 | `false` |
| `entropyThreshold` | high-entropy 민감도(높일수록 둔감) | `4.0` |

> `ignore` 참고: 슬래시 없는 단일 파일명(예: `secrets.ts`)은 레포 **전역**에서 해당 basename을 무시하고, 슬래시/글롭이 있는 항목(예: `src/vendor/*`)은 경로 기준으로 매칭합니다.

## CI 연동 (GitHub Actions)

```yaml
name: commitguard
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
      - run: npx commitguard scan
```

## 이미 history에 올라간 시크릿이라면?

commitGuard는 앞으로의 커밋을 막을 뿐 과거 기록은 지우지 않습니다. 이미 푸시됐다면:

1. 해당 키를 **즉시 폐기(rotate)** 하세요. 노출된 것으로 간주합니다.
2. [`git filter-repo`](https://github.com/newren/git-filter-repo) 또는 [BFG](https://rtyley.github.io/bfg-repo-cleaner/)로 history에서 제거하세요.

## 로컬 개발

```bash
npm install
npm run build
npm link          # 전역에 commitguard 연결
npm test          # 73개 테스트, tsx로 node:test 실행
```

코드는 계산/액션을 엄격히 분리합니다: 탐지 룰은 순수 함수(`src/rules/*`), git·파일시스템·콘솔 I/O는 액션 레이어(`src/git.ts`, `src/commands/*`, `src/report.ts`)로 격리됩니다. 덕분에 각 룰을 독립적으로 테스트하고 false positive 튜닝을 룰 단위로 격리할 수 있습니다.

## 라이선스

MIT
