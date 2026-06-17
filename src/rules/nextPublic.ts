// 계산: NEXT_PUBLIC_ 변수에 시크릿처럼 보이는 값이 할당되면 warn.
import { Finding, RuleInput } from './types.js';
import { looksLikeSecret } from './entropy.js';

// NEXT_PUBLIC_NAME=value 또는 NEXT_PUBLIC_NAME: value 형태.
const ASSIGN_REGEX = /NEXT_PUBLIC_[A-Z0-9_]+\s*[=:]\s*['"]?([^'"\s]+)['"]?/g;

export function checkNextPublic(input: RuleInput): Finding[] {
  if (input.config.allowNextPublic) return [];
  const findings: Finding[] = [];
  const lines = input.content.split('\n');

  lines.forEach((text, idx) => {
    ASSIGN_REGEX.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = ASSIGN_REGEX.exec(text)) !== null) {
      const value = m[1];
      if (looksLikeSecret(value, input.config.entropyThreshold)) {
        findings.push({
          file: input.file,
          line: idx + 1,
          ruleId: 'next-public',
          severity: 'warn',
          message: `A NEXT_PUBLIC_ variable is assigned a secret-looking value. This value is exposed in the browser bundle.`,
          hint: `Confirm this value is safe to expose to clients. If it's a server-only secret, drop the NEXT_PUBLIC_ prefix. If the exposure is intentional, set allowNextPublic: true in .commitguardrc.`,
          match: value,
        });
      }
    }
  });

  return findings;
}
