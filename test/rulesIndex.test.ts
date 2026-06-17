import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanFile, isProbablyBinary } from '../src/rules/index.js';
import { DEFAULT_CONFIG } from '../src/rules/types.js';

test('.env errors via the path rule alone — .env 파일은 경로 룰만으로 error', () => {
  const f = scanFile('.env', 'API_KEY=secret', DEFAULT_CONFIG);
  assert.ok(f.some((x) => x.ruleId === 'env-file'));
});

test('an AWS key in a code file is caught by the pattern rule — 코드 파일의 AWS 키는 패턴 룰로 잡힌다', () => {
  const f = scanFile('src/a.ts', 'const k="AKIAIOSFODNN7EXAMPLE";', DEFAULT_CONFIG);
  assert.ok(f.some((x) => x.ruleId === 'pattern:aws-access-key'));
});

test('a file matched by an ignore glob is not content-scanned — ignore 글롭에 걸린 파일은 내용 스캔 안 함', () => {
  const cfg = { ...DEFAULT_CONFIG, ignore: [...DEFAULT_CONFIG.ignore, 'src/vendor/*'] };
  const f = scanFile('src/vendor/lib.js', 'AKIAIOSFODNN7EXAMPLE', cfg);
  assert.equal(f.length, 0);
});

test('binary content skips content rules (NUL byte) — 바이너리 내용은 내용 룰 스킵 (null 바이트)', () => {
  const f = scanFile('img.png', 'AKIAIOSFODNN7EXAMPLE\x00 ', DEFAULT_CONFIG);
  assert.equal(f.filter((x) => x.ruleId.startsWith('pattern')).length, 0);
});

test('isProbablyBinary: detects a NUL byte — null 바이트 감지', () => {
  assert.equal(isProbablyBinary('abc\x00def'), true);
  assert.equal(isProbablyBinary('plain text'), false);
});

test('a watch file appears in the composed result — watch 파일은 합성 결과에 포함', () => {
  const cfg = { ...DEFAULT_CONFIG, watch: ['secrets.ts'] };
  const f = scanFile('secrets.ts', 'x', cfg);
  assert.ok(f.some((x) => x.ruleId === 'watch'));
});

test('a NEXT_PUBLIC_ value is not duplicated as a generic entropy error (warn only) — 범용 entropy 에러로 중복 보고 안 됨 (warn만 유지)', () => {
  const content = 'NEXT_PUBLIC_K=aB3xK9pQ7zR2mN5wT8uV1cD4';
  const f = scanFile('app.ts', content, DEFAULT_CONFIG);
  assert.equal(f.filter((x) => x.ruleId === 'entropy').length, 0);
  assert.equal(f.filter((x) => x.ruleId === 'next-public' && x.severity === 'warn').length, 1);
  assert.equal(f.filter((x) => x.severity === 'error').length, 0);
});

test('a known pattern (AWS key) inside NEXT_PUBLIC_ is still an error — 알려진 패턴(AWS 키)은 여전히 error', () => {
  const content = 'NEXT_PUBLIC_AWS=AKIAIOSFODNN7EXAMPLE';
  const f = scanFile('app.ts', content, DEFAULT_CONFIG);
  assert.ok(f.some((x) => x.ruleId === 'pattern:aws-access-key' && x.severity === 'error'));
});
