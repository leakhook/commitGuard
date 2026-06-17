// 액션: husky 훅/설정을 멱등하게 생성한다. 각 함수는 수행 여부를 반환해 호출측이 요약 출력.
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { join } from 'node:path';

const SCAN_LINE = 'npx commitguard scan --staged';
const RC_DEFAULT = `{
  "watch": [],
  "ignore": [".env.example", ".env.sample", ".env.template"],
  "allowNextPublic": false,
  "entropyThreshold": 4.0
}
`;

// .commitguardrc 생성. 이미 있으면 false 반환(보존).
export function ensureRc(cwd: string): boolean {
  const rc = join(cwd, '.commitguardrc');
  if (existsSync(rc)) return false;
  writeFileSync(rc, RC_DEFAULT);
  return true;
}

// .husky/pre-commit 에 scan 줄을 멱등하게 추가.
export function ensurePreCommitHook(cwd: string): void {
  const huskyDir = join(cwd, '.husky');
  if (!existsSync(huskyDir)) mkdirSync(huskyDir, { recursive: true });
  const hookPath = join(huskyDir, 'pre-commit');

  let content = existsSync(hookPath) ? readFileSync(hookPath, 'utf8') : '';
  if (content.includes(SCAN_LINE)) return; // 멱등

  if (content.trim() === '') {
    content = `${SCAN_LINE}\n`;
  } else {
    if (!content.endsWith('\n')) content += '\n';
    content += `${SCAN_LINE}\n`;
  }
  writeFileSync(hookPath, content);
  try {
    chmodSync(hookPath, 0o755);
  } catch {
    // 윈도우 등 chmod 미지원 환경은 무시
  }
}

// package.json scripts.prepare 가 없으면 "husky" 추가.
export function ensurePrepareScript(cwd: string): void {
  const pkgPath = join(cwd, 'package.json');
  if (!existsSync(pkgPath)) return;
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.scripts = pkg.scripts ?? {};
  if (!pkg.scripts.prepare) {
    pkg.scripts.prepare = 'husky';
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }
}

// 액션: init 전체 실행. husky 설치는 안내만(사용자 환경 의존).
export function runInit(cwd: string): number {
  const rcCreated = ensureRc(cwd);
  ensurePrepareScript(cwd);
  ensurePreCommitHook(cwd);

  process.stdout.write('commitguard init 완료:\n');
  process.stdout.write(`  - .husky/pre-commit 에 "${SCAN_LINE}" 등록\n`);
  process.stdout.write(`  - package.json prepare 스크립트 확인/추가\n`);
  process.stdout.write(`  - .commitguardrc ${rcCreated ? '생성' : '이미 존재(보존)'}\n`);
  process.stdout.write('\nhusky가 아직 설치되지 않았다면: npm install -D husky\n');
  return 0;
}
