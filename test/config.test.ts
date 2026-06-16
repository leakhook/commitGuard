import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeConfig, parseConfigJson } from '../src/config.js';
import { DEFAULT_CONFIG } from '../src/rules/types.js';

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
  assert.throws(() => parseConfigJson('{not json}'), /\.envguardrc/);
});

test('잘못된 타입은 무시하고 기본값 유지', () => {
  const c = mergeConfig({ entropyThreshold: 'high' as unknown as number });
  assert.equal(c.entropyThreshold, 4.0);
});
