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
          message: `NEXT_PUBLIC_ 변수에 시크릿처럼 보이는 값이 할당되었습니다. 이 값은 브라우저 번들에 노출됩니다.`,
          hint: `클라이언트에 노출돼도 되는 값인지 확인하세요. 서버 전용 시크릿이라면 NEXT_PUBLIC_ 접두사를 제거하세요. 의도된 노출이면 .envguardrc에서 allowNextPublic: true 로 끄세요.`,
          match: value,
        });
      }
    }
  });

  return findings;
}
