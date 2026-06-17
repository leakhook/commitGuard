import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkEnvFile } from '../src/rules/envFiles.js';
import { DEFAULT_CONFIG } from '../src/rules/types.js';

test('.env produces an error finding — .env 파일은 error finding을 만든다', () => {
  const findings = checkEnvFile('.env', DEFAULT_CONFIG);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'error');
  assert.equal(findings[0].ruleId, 'env-file');
});

test('.env.local is blocked too — .env.local 도 차단된다', () => {
  assert.equal(checkEnvFile('.env.local', DEFAULT_CONFIG).length, 1);
});

test('.env.production in a nested path is blocked — 중첩 경로의 .env.production 도 차단된다', () => {
  assert.equal(checkEnvFile('apps/web/.env.production', DEFAULT_CONFIG).length, 1);
});

test('.env.example is allowed via default ignore — .env.example 은 허용된다 (ignore 기본값)', () => {
  assert.equal(checkEnvFile('.env.example', DEFAULT_CONFIG).length, 0);
});

test('.env.sample / .env.template are allowed too — .env.sample / .env.template 도 허용', () => {
  assert.equal(checkEnvFile('.env.sample', DEFAULT_CONFIG).length, 0);
  assert.equal(checkEnvFile('.env.template', DEFAULT_CONFIG).length, 0);
});

test('a regular .ts file yields no findings — 일반 .ts 파일은 아무 finding도 없다', () => {
  assert.equal(checkEnvFile('src/index.ts', DEFAULT_CONFIG).length, 0);
});

test('names that merely start with .env (e.g. .commitguardrc) are not blocked — .env 로 시작만 하는 것은 차단 안 함', () => {
  assert.equal(checkEnvFile('.commitguardrc', DEFAULT_CONFIG).length, 0);
});
