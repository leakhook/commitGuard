import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { runScan } from '../src/commands/scan.js';

function tmpRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'commitguard-scan-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 't@t.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 't'], { cwd: dir });
  return dir;
}
const add = (dir: string, f: string) => execFileSync('git', ['add', f], { cwd: dir });

test('staged .env 가 있으면 exit code 1', () => {
  const dir = tmpRepo();
  writeFileSync(join(dir, '.env'), 'API_KEY=secret');
  add(dir, '.env');
  assert.equal(runScan({ cwd: dir, staged: true }), 1);
  rmSync(dir, { recursive: true, force: true });
});

test('깨끗한 staged 파일은 exit code 0', () => {
  const dir = tmpRepo();
  writeFileSync(join(dir, 'index.ts'), 'export const x = 1;');
  add(dir, 'index.ts');
  assert.equal(runScan({ cwd: dir, staged: true }), 0);
  rmSync(dir, { recursive: true, force: true });
});

test('warn만 있으면 exit code 0', () => {
  const dir = tmpRepo();
  writeFileSync(join(dir, 'app.ts'), 'const u = "NEXT_PUBLIC_K=aB3xK9pQ7zR2mN5wT8uV1cD4";');
  add(dir, 'app.ts');
  assert.equal(runScan({ cwd: dir, staged: true }), 0);
  rmSync(dir, { recursive: true, force: true });
});

test('스테이지 blob 기준으로 읽는다 (스테이징 후 수정해도 staged 내용 검사)', () => {
  const dir = tmpRepo();
  writeFileSync(join(dir, 'a.ts'), 'const k="AKIAIOSFODNN7EXAMPLE";');
  add(dir, 'a.ts');
  writeFileSync(join(dir, 'a.ts'), 'const k="clean";');
  assert.equal(runScan({ cwd: dir, staged: true }), 1);
  rmSync(dir, { recursive: true, force: true });
});

test('git repo가 아니면 exit code 2', () => {
  assert.equal(runScan({ cwd: tmpdir(), staged: true }), 2);
});
