import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkWatchList } from '../src/rules/watchList.js';
import { DEFAULT_CONFIG } from '../src/rules/types.js';

const cfg = { ...DEFAULT_CONFIG, watch: ['config/secrets.ts', 'src/firebase.config.js'] };

test('watch 목록의 파일은 error', () => {
  const f = checkWatchList('config/secrets.ts', cfg);
  assert.equal(f.length, 1);
  assert.equal(f[0].severity, 'error');
  assert.equal(f[0].ruleId, 'watch');
});

test('경로 구분자 차이를 정규화 (윈도우 백슬래시)', () => {
  assert.equal(checkWatchList('config\\secrets.ts', cfg).length, 1);
});

test('watch에 없는 파일은 finding 없음', () => {
  assert.equal(checkWatchList('src/index.ts', cfg).length, 0);
});

test('watch 빈 배열이면 항상 0', () => {
  assert.equal(checkWatchList('config/secrets.ts', DEFAULT_CONFIG).length, 0);
});
