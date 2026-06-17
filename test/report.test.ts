import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatReport, maskSecret } from '../src/report.js';
import { Finding } from '../src/rules/types.js';

const errFinding: Finding = {
  file: '.env', ruleId: 'env-file', severity: 'error',
  message: 'Env file is staged.', hint: 'Run git rm --cached.',
};

test('maskSecret: keeps first 4 chars, masks the rest — 앞 4자만 남기고 마스킹', () => {
  assert.equal(maskSecret('AKIAIOSFODNN7EXAMPLE'), 'AKIA****************');
});

test('maskSecret: fully masks short values — 짧은 값은 전부 마스킹', () => {
  assert.equal(maskSecret('abc'), '***');
});

test('formatReport: prints the 4 elements (file/message/hint) for an error — error 포함 시 4요소(파일/메시지/힌트) 출력', () => {
  const out = formatReport([errFinding], false);
  assert.ok(out.includes('.env'));
  assert.ok(out.includes('Env file is staged'));
  assert.ok(out.includes('git rm --cached'));
});

test('formatReport: clean message when there are no findings — finding 없으면 통과 메시지', () => {
  assert.match(formatReport([], false), /clean|no problems/i);
});

test('formatReport: a match is printed masked — match가 있으면 마스킹되어 출력', () => {
  const f: Finding = { ...errFinding, ruleId: 'pattern:aws-access-key', match: 'AKIAIOSFODNN7EXAMPLE' };
  const out = formatReport([f], false);
  assert.ok(out.includes('AKIA****************'));
  assert.ok(!out.includes('AKIAIOSFODNN7EXAMPLE'));
});

test('formatReport: file:line format when a line number is present — 라인 번호가 있으면 file:line 형태', () => {
  const f: Finding = { ...errFinding, line: 12 };
  assert.ok(formatReport([f], false).includes('.env:12'));
});
