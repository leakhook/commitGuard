import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { getStagedFiles, getTrackedFiles, readStagedContent, isGitRepo } from '../src/git.js';

function tmpRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'envguard-git-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 't@t.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 't'], { cwd: dir });
  return dir;
}

test('isGitRepo: repo 안에서 true, 밖에서 false', () => {
  const dir = tmpRepo();
  assert.equal(isGitRepo(dir), true);
  assert.equal(isGitRepo(tmpdir()), false);
  rmSync(dir, { recursive: true, force: true });
});

test('getStagedFiles: 스테이지된 파일만 반환', () => {
  const dir = tmpRepo();
  writeFileSync(join(dir, 'a.txt'), 'hello');
  writeFileSync(join(dir, 'b.txt'), 'world');
  execFileSync('git', ['add', 'a.txt'], { cwd: dir });
  const staged = getStagedFiles(dir);
  assert.deepEqual(staged, ['a.txt']);
  rmSync(dir, { recursive: true, force: true });
});

test('readStagedContent: 스테이지된 blob 내용을 읽는다 (작업트리 수정과 무관)', () => {
  const dir = tmpRepo();
  writeFileSync(join(dir, 'a.txt'), 'staged-version');
  execFileSync('git', ['add', 'a.txt'], { cwd: dir });
  writeFileSync(join(dir, 'a.txt'), 'modified-after-staging');
  assert.equal(readStagedContent(dir, 'a.txt'), 'staged-version');
  rmSync(dir, { recursive: true, force: true });
});

test('getTrackedFiles: 커밋된 파일 목록', () => {
  const dir = tmpRepo();
  writeFileSync(join(dir, 'a.txt'), 'x');
  execFileSync('git', ['add', 'a.txt'], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: dir });
  assert.deepEqual(getTrackedFiles(dir), ['a.txt']);
  rmSync(dir, { recursive: true, force: true });
});
