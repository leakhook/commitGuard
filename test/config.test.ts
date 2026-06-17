import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mergeConfig, parseConfigJson, loadConfig } from '../src/config.js';
import { DEFAULT_CONFIG } from '../src/rules/types.js';

function tmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'commitguard-config-'));
}

test('빈 입력이면 기본값', () => {
  assert.deepEqual(mergeConfig({}), DEFAULT_CONFIG);
});

test('일부 키만 덮어쓴다', () => {
  const c = mergeConfig({ allowNextPublic: true });
  assert.equal(c.allowNextPublic, true);
  assert.equal(c.entropyThreshold, 4.0);
});

test('watch/ignore는 제공되면 교체된다', () => {
  const c = mergeConfig({ watch: ['a.ts'], ignore: ['b/*'] });
  assert.deepEqual(c.watch, ['a.ts']);
  assert.deepEqual(c.ignore, ['b/*']);
});

test('parseConfigJson: 올바른 JSON 파싱', () => {
  assert.deepEqual(parseConfigJson('{"allowNextPublic":true}'), { allowNextPublic: true });
});

test('parseConfigJson: 잘못된 JSON이면 명확한 에러', () => {
  assert.throws(() => parseConfigJson('{not json}'), /\.commitguardrc/);
});

test('잘못된 타입은 무시하고 기본값 유지', () => {
  const c = mergeConfig({ entropyThreshold: 'high' as unknown as number });
  assert.equal(c.entropyThreshold, 4.0);
});

test('0 이하의 entropyThreshold는 거부하고 기본값 유지', () => {
  assert.equal(mergeConfig({ entropyThreshold: 0 }).entropyThreshold, 4.0);
  assert.equal(mergeConfig({ entropyThreshold: -5 }).entropyThreshold, 4.0);
});

test('loadConfig: .commitguardrc가 package.json보다 우선한다', () => {
  const dir = tmpDir();
  writeFileSync(join(dir, '.commitguardrc'), '{"entropyThreshold": 5.5}');
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ commitguard: { entropyThreshold: 9.9 } }));
  assert.equal(loadConfig(dir).entropyThreshold, 5.5);
  rmSync(dir, { recursive: true, force: true });
});

test('loadConfig: .commitguardrc가 없으면 package.json의 commitguard 키를 읽는다', () => {
  const dir = tmpDir();
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ commitguard: { allowNextPublic: true } }));
  assert.equal(loadConfig(dir).allowNextPublic, true);
  rmSync(dir, { recursive: true, force: true });
});

test('loadConfig: 설정이 전혀 없으면 기본값', () => {
  const dir = tmpDir();
  assert.deepEqual(loadConfig(dir), DEFAULT_CONFIG);
  rmSync(dir, { recursive: true, force: true });
});

test('loadConfig: package.json이 깨졌어도 기본값으로 진행(스택트레이스 없음)', () => {
  const dir = tmpDir();
  writeFileSync(join(dir, 'package.json'), '{ broken json');
  assert.deepEqual(loadConfig(dir), DEFAULT_CONFIG);
  rmSync(dir, { recursive: true, force: true });
});
