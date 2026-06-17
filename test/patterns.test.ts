import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPatterns } from '../src/rules/patterns.js';
import { DEFAULT_CONFIG } from '../src/rules/types.js';

function run(content: string) {
  return checkPatterns({ file: 'x.ts', content, config: DEFAULT_CONFIG });
}

test('detects AWS Access Key — AWS Access Key 탐지', () => {
  const f = run('const k = "AKIAIOSFODNN7EXAMPLE";');
  assert.ok(f.some((x) => x.ruleId === 'pattern:aws-access-key' && x.severity === 'error'));
});

test('detects Google API Key — Google API Key 탐지', () => {
  const f = run('key=AIzaSyA1234567890abcdefghijklmnopqrstuv');
  assert.ok(f.some((x) => x.ruleId === 'pattern:google-api-key'));
});

test('detects Stripe live secret key — Stripe live secret key 탐지', () => {
  const f = run('sk_'+'live_0123456789abcdefghijklmnop');
  assert.ok(f.some((x) => x.ruleId === 'pattern:stripe-key'));
});

test('detects JWT — JWT 탐지', () => {
  const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  assert.ok(run(`token=${jwt}`).some((x) => x.ruleId === 'pattern:jwt'));
});

test('a JWT line reports exactly one finding (no segment entropy dupes) — JWT 한 줄은 정확히 1건만 보고 (세그먼트 entropy 중복 없음)', () => {
  const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  const f = run(`token=${jwt}`);
  assert.equal(f.length, 1);
  assert.equal(f[0].ruleId, 'pattern:jwt');
});

test('fills in the line number — 라인 번호가 채워진다', () => {
  const f = run('line1\nline2\nconst k = "AKIAIOSFODNN7EXAMPLE";');
  const hit = f.find((x) => x.ruleId === 'pattern:aws-access-key');
  assert.equal(hit?.line, 3);
});

test('keeps the raw match; masking happens at the caller — match는 보관, 출력은 호출측에서 마스킹', () => {
  const f = run('AKIAIOSFODNN7EXAMPLE');
  assert.ok(f[0].match && f[0].match.includes('AKIA'));
});

test('plain code yields no findings — 일반 코드는 finding 없음', () => {
  assert.equal(run('const greeting = "hello world";').length, 0);
});

test('high-entropy tokens are caught by the entropy rule — 고엔트로피 토큰은 entropy 룰로 잡힌다', () => {
  const f = run('const token = "aB3xK9pQ7zR2mN5wT8uV1cD4";');
  assert.ok(f.some((x) => x.ruleId === 'entropy'));
});

test('short ordinary values are not flagged by entropy — 짧은 평범한 변수는 entropy로 안 잡힘', () => {
  const f = run('const id = "abc123";');
  assert.equal(f.filter((x) => x.ruleId === 'entropy').length, 0);
});
