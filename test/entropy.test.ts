import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shannonEntropy, looksLikeSecret } from '../src/rules/entropy.js';

test('low entropy for repeated chars — 반복 문자열은 낮은 엔트로피', () => {
  assert.ok(shannonEntropy('aaaaaaaa') < 1);
});

test('high entropy for random mixed strings — 무작위 혼합 문자열은 높은 엔트로피', () => {
  assert.ok(shannonEntropy('aB3xK9pQ7zR2mN5w') > 3.5);
});

test('empty string is 0 — 빈 문자열은 0', () => {
  assert.equal(shannonEntropy(''), 0);
});

test('short strings are not treated as secrets, below min length — 짧은 문자열은 시크릿으로 보지 않음 (길이 미달)', () => {
  assert.equal(looksLikeSecret('aB3xK9', 4.0), false);
});

test('dictionary-like words are not secrets — 영어 단어처럼 보이면 시크릿 아님', () => {
  assert.equal(looksLikeSecret('thisisalongdictionaryword', 4.0), false);
});

test('path-like strings are not secrets — 경로처럼 보이면 시크릿 아님', () => {
  assert.equal(looksLikeSecret('src/components/Button/index.ts', 4.0), false);
});

test('high-entropy mixed tokens count as secrets — 고엔트로피 혼합 토큰은 시크릿으로 본다', () => {
  assert.equal(looksLikeSecret('aB3xK9pQ7zR2mN5wT8uV1cD4', 4.0), true);
});
