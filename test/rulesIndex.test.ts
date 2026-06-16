import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanFile, isProbablyBinary } from '../src/rules/index.js';
import { DEFAULT_CONFIG } from '../src/rules/types.js';

test('.env 파일은 경로 룰만으로 error', () => {
  const f = scanFile('.env', 'API_KEY=secret', DEFAULT_CONFIG);
  assert.ok(f.some((x) => x.ruleId === 'env-file'));
});

test('코드 파일의 AWS 키는 패턴 룰로 잡힌다', () => {
  const f = scanFile('src/a.ts', 'const k="AKIAIOSFODNN7EXAMPLE";', DEFAULT_CONFIG);
  assert.ok(f.some((x) => x.ruleId === 'pattern:aws-access-key'));
});

test('ignore 글롭에 걸린 파일은 내용 스캔 안 함', () => {
  const cfg = { ...DEFAULT_CONFIG, ignore: [...DEFAULT_CONFIG.ignore, 'src/vendor/*'] };
  const f = scanFile('src/vendor/lib.js', 'AKIAIOSFODNN7EXAMPLE', cfg);
  assert.equal(f.length, 0);
});

test('바이너리 내용은 내용 룰 스킵 (null 바이트)', () => {
  const f = scanFile('img.png', 'AKIAIOSFODNN7EXAMPLE\x00 ', DEFAULT_CONFIG);
  assert.equal(f.filter((x) => x.ruleId.startsWith('pattern')).length, 0);
});

test('isProbablyBinary: null 바이트 감지', () => {
  assert.equal(isProbablyBinary('abc\x00def'), true);
  assert.equal(isProbablyBinary('plain text'), false);
});

test('watch 파일은 합성 결과에 포함', () => {
  const cfg = { ...DEFAULT_CONFIG, watch: ['secrets.ts'] };
  const f = scanFile('secrets.ts', 'x', cfg);
  assert.ok(f.some((x) => x.ruleId === 'watch'));
});
