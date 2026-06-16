import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkNextPublic } from '../src/rules/nextPublic.js';
import { DEFAULT_CONFIG } from '../src/rules/types.js';

function run(content: string, allow = false) {
  return checkNextPublic({ file: '.env.local', content, config: { ...DEFAULT_CONFIG, allowNextPublic: allow } });
}

test('NEXT_PUBLIC_ 에 시크릿처럼 보이는 값은 warn', () => {
  const f = run('NEXT_PUBLIC_API_KEY=aB3xK9pQ7zR2mN5wT8uV1cD4');
  assert.equal(f.length, 1);
  assert.equal(f[0].severity, 'warn');
  assert.equal(f[0].ruleId, 'next-public');
});

test('NEXT_PUBLIC_ 에 평범한 값은 finding 없음', () => {
  assert.equal(run('NEXT_PUBLIC_SITE_NAME=My Blog').length, 0);
});

test('allowNextPublic=true 면 경고 끔', () => {
  assert.equal(run('NEXT_PUBLIC_API_KEY=aB3xK9pQ7zR2mN5wT8uV1cD4', true).length, 0);
});

test('NEXT_PUBLIC_ 아닌 변수는 이 룰이 무시', () => {
  assert.equal(run('SECRET_KEY=aB3xK9pQ7zR2mN5wT8uV1cD4').length, 0);
});

test('라인 번호가 채워진다', () => {
  const f = run('a=1\nNEXT_PUBLIC_TOKEN=aB3xK9pQ7zR2mN5wT8uV1cD4');
  assert.equal(f[0].line, 2);
});
