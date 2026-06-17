import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { ensurePreCommitHook, ensurePrepareScript, ensureRc } from '../src/commands/init.js';

function tmpRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'commitguard-init-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  return dir;
}

test('ensureRc: 없으면 기본 .commitguardrc 생성', () => {
  const dir = tmpRepo();
  const created = ensureRc(dir);
  assert.equal(created, true);
  assert.ok(existsSync(join(dir, '.commitguardrc')));
  const cfg = JSON.parse(readFileSync(join(dir, '.commitguardrc'), 'utf8'));
  assert.equal(cfg.allowNextPublic, false);
  rmSync(dir, { recursive: true, force: true });
});

test('ensureRc: 이미 있으면 보존(덮어쓰지 않음)', () => {
  const dir = tmpRepo();
  writeFileSync(join(dir, '.commitguardrc'), '{"watch":["keep.ts"]}');
  const created = ensureRc(dir);
  assert.equal(created, false);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, '.commitguardrc'), 'utf8')).watch, ['keep.ts']);
  rmSync(dir, { recursive: true, force: true });
});

test('ensurePreCommitHook: 훅 파일에 scan 줄 추가', () => {
  const dir = tmpRepo();
  ensurePreCommitHook(dir);
  const hook = readFileSync(join(dir, '.husky', 'pre-commit'), 'utf8');
  assert.ok(hook.includes('npx commitguard scan --staged'));
  rmSync(dir, { recursive: true, force: true });
});

test('ensurePreCommitHook: 멱등 — 두 번 실행해도 줄 1개', () => {
  const dir = tmpRepo();
  ensurePreCommitHook(dir);
  ensurePreCommitHook(dir);
  const hook = readFileSync(join(dir, '.husky', 'pre-commit'), 'utf8');
  const count = hook.split('\n').filter((l) => l.includes('npx commitguard scan --staged')).length;
  assert.equal(count, 1);
  rmSync(dir, { recursive: true, force: true });
});

test('ensurePrepareScript: package.json에 prepare 추가', () => {
  const dir = tmpRepo();
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x', scripts: {} }));
  ensurePrepareScript(dir);
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.prepare, 'husky');
  rmSync(dir, { recursive: true, force: true });
});

test('ensurePrepareScript: 기존 prepare 보존', () => {
  const dir = tmpRepo();
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x', scripts: { prepare: 'echo hi' } }));
  ensurePrepareScript(dir);
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.prepare, 'echo hi');
  rmSync(dir, { recursive: true, force: true });
});
