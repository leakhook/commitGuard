# envguard 설계 문서

작성일: 2026-06-16

## 1. 목적

시크릿(`.env` 파일, 코드에 박힌 API 키)이 git에 커밋/푸시되는 보안 사고를 **커밋 단계에서** 막는 가볍고 제로 설정(zero-config) npm CLI 도구. 프론트엔드/JS 프로젝트, 특히 Next.js를 주 타겟으로 한다.

차별점: `npx envguard init` 한 번으로 husky 훅 자동 등록 + 합리적 기본 룰 내장 + 설정 파일 작성 0개. gitleaks/trufflehog 대비 husky 1급 지원과 제로 설정에 집중한다.

## 2. 기술 스택 / 결정 사항

| 항목 | 결정 | 근거 |
|------|------|------|
| 런타임 | Node.js LTS, ESM | 요구사항 |
| 언어 | TypeScript | 요구사항 |
| CLI 파서 | **의존성 0, `process.argv` 직접 파싱** | 명령 표면이 작음(init/scan + 소수 플래그). "의존성 최소화" 원칙 |
| 테스트 | **`node:test` + `node:assert`** | 제로 의존성. `tsx`로 TS 실행 (devDependency만) |
| 빌드 | **`tsc` → `dist/`, `bin`은 `dist/cli.js`** | 표준. publish 시 컴파일된 JS만 배포. shebang 포함 |
| 런타임 의존성 | **없음(0)** | 핵심 가치 |

## 3. 아키텍처 — A/C/D 분류

핵심 설계 원칙: **탐지 룰은 전부 순수 함수(계산)**, **git·파일·콘솔·husky는 액션**으로 격리한다. 룰은 "파일 경로 + 내용 문자열"을 받아 `Finding[]`만 반환하며, 직접 출력하거나 git을 호출하지 않는다. → 테스트가 입출력 검증으로 단순해지고, false positive 튜닝이 룰 단위로 격리된다.

```
envguard/
  src/
    cli.ts            # [액션] argv 파싱 → 명령 라우팅 → process.exit
    commands/
      init.ts         # [액션] husky 설치/초기화, .husky/pre-commit, package.json prepare, .envguardrc 생성 (멱등)
      scan.ts         # [액션] 파일 수집 → 룰 실행(계산) → 리포트 출력 → exit code 결정
    rules/
      types.ts        # [데이터] Finding, Severity, RuleContext 타입
      envFiles.ts     # [계산] 경로 → .env* 위반 여부
      patterns.ts     # [계산] 내용 → 정규식 매치 Finding[]
      entropy.ts      # [계산] 문자열 → Shannon 엔트로피 점수 / high-entropy Finding[]
      nextPublic.ts   # [계산] 내용 → NEXT_PUBLIC_ 경고 Finding[]
      watchList.ts    # [계산] 경로 + watch[] → 위반 여부
      index.ts        # [계산] 모든 룰 합성: (파일 1개) → Finding[]
    git.ts            # [액션] staged/tracked 파일 목록, 스테이지 blob 읽기 (child_process)
    config.ts         # [액션] 로드 + [계산] 검증/기본값 병합
    report.ts         # [계산] Finding[] → 포맷 문자열 / [액션] 출력
    ansi.ts           # [계산] 의존성 없는 ANSI 색상 헬퍼
  test/               # 룰별 positive/negative + git/init 통합 테스트 (node:test)
  package.json
  tsconfig.json
  README.md
```

함수는 자신의 계층 또는 바로 아래 계층만 호출한다(계층형 설계). `scan.ts`(상위 액션) → `rules/index.ts`(계산) → 개별 룰(계산) → `entropy.ts`(유틸 계산).

## 4. 데이터 구조

```ts
type Severity = 'error' | 'warn' | 'info'; // 타입은 3단계로 열어둠

// MVP에서는 'info'를 실제로 발행하지 않음 (error/warn만). 향후 타입 변경 없이 확장.

interface Finding {
  file: string;
  line?: number;       // 내용 기반 룰만 채움
  ruleId: string;      // 'env-file' | 'pattern:aws-access-key' | 'entropy' | 'next-public' | 'watch'
  severity: Severity;
  message: string;     // "무엇이 / 왜 위험" 요약
  hint: string;        // "어떻게 고치나" 가이드
  match?: string;      // 매치된 토큰 (마스킹하여 출력)
}

interface Config {
  watch: string[];
  ignore: string[];           // 글롭/경로
  allowNextPublic: boolean;   // true면 NEXT_PUBLIC_ 경고 끔
  entropyThreshold: number;   // 기본 4.0
}
```

기본 Config:
```json
{ "watch": [], "ignore": [".env.example", ".env.sample", ".env.template"], "allowNextPublic": false, "entropyThreshold": 4.0 }
```

## 5. 설정 로드 (config.ts)

우선순위: **`.envguardrc`(JSON) > `package.json`의 `"envguard"` 키 > 내장 기본값**.

- 둘 다 없으면 기본값으로 동작(제로 설정).
- `.envguardrc`는 **순수 JSON** (JSONC/주석 미지원 — 의존성 최소화). 파싱 실패 시 명확한 에러.
- 로드(파일 읽기)는 액션, 검증·기본값 병합은 순수 함수로 분리.

## 6. 명령어

### `envguard init` (액션, 멱등)
1. husky 설치/초기화 (`husky` devDependency, `npx husky` 초기화).
2. `.husky/pre-commit`에 `npx envguard scan --staged` 한 줄 추가. **이미 있으면 추가 안 함.**
3. `package.json`에 `"prepare": "husky"`가 없으면 추가 (clone 후 `npm install`만으로 훅 복원).
4. 루트에 기본 `.envguardrc` 생성. **이미 있으면 보존.**
5. 모든 단계 멱등 — 재실행해도 중복/덮어쓰기 없음. 수행한 작업 요약 출력.

### `envguard scan [--staged]` (액션)
- `--staged`: pre-commit용. 대상 = `git diff --cached --name-only --diff-filter=ACM`.
- 플래그 없음: CI/수동용. 대상 = `git ls-files`.
- **내용 스캔은 스테이지 blob에서 읽는다**: `--staged`일 때 각 파일 내용을 `git show :<path>`로 읽어 작업트리 현재 내용과의 불일치를 제거(스테이징 후 수정 케이스). 경로 기반 룰(envFiles/watch)은 파일명만 사용.
- 플래그 없을 때 내용은 작업트리에서 읽음.
- error severity가 하나라도 있으면 **exit 1**, warn만 있으면 exit 0.
- git repo가 아니면 명확한 에러 메시지로 안내.

## 7. 탐지 룰 (MVP)

1. **`.env*` 파일 차단** (envFiles, error): `.env`, `.env.local`, `.env.production` 등 staged 시 에러. 화이트리스트(ignore 기본값): `.env.example`, `.env.sample`, `.env.template`. → hint: `git rm --cached`로 빼고 `.gitignore`에 추가.
2. **코드 내 키 패턴** (patterns, error): AWS Access Key(`AKIA...`), AWS Secret, Google API Key(`AIza...`), Firebase config 키, Stripe(`sk_live_...`, `pk_live_...`), JWT(`eyJ...`). 각 매치는 라인 번호 + 마스킹된 토큰 출력.
3. **범용 high-entropy** (entropy, error 또는 warn): Shannon 엔트로피 + 길이(≥20자) + 임계값(기본 4.0). false positive 최소화 위해 단어/경로/해시처럼 보이는 것은 제외. 애매하면 warn.
4. **`NEXT_PUBLIC_` 노출 경고** (nextPublic, **warn**): `NEXT_PUBLIC_`로 시작하는 환경변수에 시크릿처럼 보이는 값이 할당되면 경고. exit code 영향 없음. `allowNextPublic: true`면 끔.
5. **사용자 지정 파일 감시** (watch, error): `.envguardrc`의 `watch[]`에 등록된 파일이 staged되면 에러.

바이너리/대용량 파일은 내용 스캔에서 스킵 (null 바이트 감지 + 크기 상한). `ignore` 글롭에 걸리면 전체 스킵.

## 8. 출력 / DX (report.ts)

위반 메시지는 **무엇이 / 어디서 / 왜 위험 / 어떻게 고치나** 4요소를 담는다. 색상은 외부 의존성 없이 ANSI 직접 사용(`ansi.ts`), TTY 아닐 때 비활성화. 시크릿 토큰은 마스킹 출력. history에 이미 올라간 경우를 위한 짧은 안내 문구/링크 포함. 한국어 메시지.

## 9. 테스트 전략 (node:test)

- **룰(순수 함수)**: 룰별 positive/negative 케이스 — 입출력만 검증. entropy는 경계값 테스트.
- **config.ts**: `.envguardrc` 우선, `package.json` 폴백, 기본값 병합, 잘못된 JSON 에러.
- **git.ts / init.ts**: 임시 디렉터리 + 실제 `git`으로 통합 테스트(staged 목록, 스테이지 blob 읽기, init 멱등성). 이 프로젝트 폴더 자체는 임시 repo를 만들어 검증.

## 10. 배포 / DX

- `tsc` 빌드 → `dist/`. `bin.envguard` = `dist/cli.js` (shebang `#!/usr/bin/env node`).
- `npm link`로 로컬 테스트 가능.
- README: 설치/사용법/설정 옵션/CI 연동(GitHub Actions 예시).

## 11. 진행 순서

1. 뼈대: `package.json`, `tsconfig.json`, 폴더 구조, `cli.ts` 라우팅.
2. 룰을 하나씩 구현하며 각 룰마다 테스트 동반 (envFiles → patterns → entropy → nextPublic → watchList).
3. `config.ts`, `git.ts`, `report.ts`.
4. `scan` 명령 통합.
5. `init` 명령 + 통합 테스트.
6. README.

## 12. 비목표 (YAGNI)

- JSONC/주석 설정, 커스텀 정규식 사용자 룰, git history 전체 스캔, `--fix` 자동 수정, 다국어. (MVP 이후 고려)
