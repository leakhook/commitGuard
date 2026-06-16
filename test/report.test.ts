import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatReport, maskSecret } from '../src/report.js';
import { Finding } from '../src/rules/types.js';

const errFinding: Finding = {
  file: '.env', ruleId: 'env-file', severity: 'error',
  message: '환경변수 파일이 스테이지되었습니다.', hint: 'git rm --cached 하세요.',
};

test('maskSecret: 앞 4자만 남기고 마스킹', () => {
  assert.equal(maskSecret('AKIAIOSFODNN7EXAMPLE'), 'AKIA****************');
});

test('maskSecret: 짧은 값은 전부 마스킹', () => {
  assert.equal(maskSecret('abc'), '***');
});

test('formatReport: error 포함 시 4요소(파일/메시지/힌트) 출력', () => {
  const out = formatReport([errFinding], false);
  assert.ok(out.includes('.env'));
  assert.ok(out.includes('환경변수 파일'));
  assert.ok(out.includes('git rm --cached'));
});

test('formatReport: finding 없으면 통과 메시지', () => {
  assert.match(formatReport([], false), /통과|문제 없음|clean/i);
});

test('formatReport: match가 있으면 마스킹되어 출력', () => {
  const f: Finding = { ...errFinding, ruleId: 'pattern:aws-access-key', match: 'AKIAIOSFODNN7EXAMPLE' };
  const out = formatReport([f], false);
  assert.ok(out.includes('AKIA****************'));
  assert.ok(!out.includes('AKIAIOSFODNN7EXAMPLE'));
});

test('formatReport: 라인 번호가 있으면 file:line 형태', () => {
  const f: Finding = { ...errFinding, line: 12 };
  assert.ok(formatReport([f], false).includes('.env:12'));
});
