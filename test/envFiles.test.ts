import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkEnvFile } from '../src/rules/envFiles.js';
import { DEFAULT_CONFIG } from '../src/rules/types.js';

test('.env 파일은 error finding을 만든다', () => {
  const findings = checkEnvFile('.env', DEFAULT_CONFIG);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'error');
  assert.equal(findings[0].ruleId, 'env-file');
});

test('.env.local 도 차단된다', () => {
  assert.equal(checkEnvFile('.env.local', DEFAULT_CONFIG).length, 1);
});

test('중첩 경로의 .env.production 도 차단된다', () => {
  assert.equal(checkEnvFile('apps/web/.env.production', DEFAULT_CONFIG).length, 1);
});

test('.env.example 은 허용된다 (ignore 기본값)', () => {
  assert.equal(checkEnvFile('.env.example', DEFAULT_CONFIG).length, 0);
});

test('.env.sample / .env.template 도 허용', () => {
  assert.equal(checkEnvFile('.env.sample', DEFAULT_CONFIG).length, 0);
  assert.equal(checkEnvFile('.env.template', DEFAULT_CONFIG).length, 0);
});

test('일반 .ts 파일은 아무 finding도 없다', () => {
  assert.equal(checkEnvFile('src/index.ts', DEFAULT_CONFIG).length, 0);
});

test('envrc 처럼 .env 로 시작만 하는 것은 차단 안 함', () => {
  assert.equal(checkEnvFile('.envguardrc', DEFAULT_CONFIG).length, 0);
});
