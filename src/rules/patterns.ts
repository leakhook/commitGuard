// Calculation: scan file content line by line for regex + entropy violations.
// 계산: 파일 내용을 라인 단위로 보고 정규식 + 엔트로피 위반을 찾는다.
import { Finding, RuleInput } from './types.js';
import { looksLikeSecret } from './entropy.js';

interface PatternRule {
  ruleId: string;
  label: string;
  regex: RegExp;
}

// Common secret regexes. Each is applied per line (global flag).
// 흔한 시크릿 정규식. 각 정규식은 라인 단위로 적용한다(글로벌 플래그).
const PATTERN_RULES: PatternRule[] = [
  { ruleId: 'pattern:aws-access-key', label: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/g },
  { ruleId: 'pattern:aws-secret-key', label: 'AWS Secret Key', regex: /aws_secret_access_key\s*[=:]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/gi },
  { ruleId: 'pattern:google-api-key', label: 'Google API Key', regex: /AIza[0-9A-Za-z\-_]{35}/g },
  { ruleId: 'pattern:stripe-key', label: 'Stripe Key', regex: /[sprk]k_live_[0-9a-zA-Z]{20,}/g },
  { ruleId: 'pattern:jwt', label: 'JWT', regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
];

// Extracts long tokens for the entropy check (e.g. the right-hand side of an assignment).
// '=' is excluded: including it glues the `key=` of `key=value` onto the value as one token,
// which breaks dedup against already-matched patterns and makes the masked output messy.
// 엔트로피 검사 대상 토큰 추출용: 따옴표/할당 우변의 긴 토큰.
// '='는 제외한다 — 포함하면 `key=value`의 `key=`가 값에 붙어 한 토큰이 되어
// 이미 패턴으로 잡힌 시크릿과 dedup이 어긋나고 마스킹 출력도 지저분해진다.
const TOKEN_REGEX = /[A-Za-z0-9+/_\-]{20,}/g;

function pattern(file: string, line: number, label: string, ruleId: string, match: string): Finding {
  return {
    file,
    line,
    ruleId,
    severity: 'error',
    message: `Possible ${label} found in the code.`,
    hint: `Move the value to an environment variable and remove it from the code. If it was exposed, rotate the key immediately.`,
    match,
  };
}

export function checkPatterns(input: RuleInput): Finding[] {
  const findings: Finding[] = [];
  const lines = input.content.split('\n');

  lines.forEach((text, idx) => {
    const lineNo = idx + 1;

    for (const rule of PATTERN_RULES) {
      rule.regex.lastIndex = 0; // reset global-regex state to prevent leakage across calls (호출 간 누수 방지)
      let m: RegExpExecArray | null;
      while ((m = rule.regex.exec(text)) !== null) {
        findings.push(pattern(input.file, lineNo, rule.label, rule.ruleId, m[1] ?? m[0]));
      }
    }

    // Entropy: only check long tokens that the regexes didn't already catch.
    // 엔트로피: 정규식에 안 걸린 긴 토큰만 검사한다.
    TOKEN_REGEX.lastIndex = 0;
    let t: RegExpExecArray | null;
    while ((t = TOKEN_REGEX.exec(text)) !== null) {
      const token = t[0];
      // Treat as a duplicate if this token is contained in an existing finding's match on the same line.
      // (Prevents segments of a dot-separated secret like a JWT from being flagged separately.)
      // 같은 줄에서 이미 잡힌 finding의 match에 이 토큰이 포함되면 중복으로 본다.
      // (JWT처럼 점으로 나뉜 시크릿의 세그먼트가 따로 잡히는 것을 막는다.)
      const alreadyFlagged = findings.some(
        (f) => f.line === lineNo && f.match !== undefined && f.match.includes(token),
      );
      if (alreadyFlagged) continue;
      if (looksLikeSecret(token, input.config.entropyThreshold)) {
        findings.push({
          file: input.file,
          line: lineNo,
          ruleId: 'entropy',
          severity: 'error',
          message: `A high-entropy string was found. It may be a secret.`,
          hint: `If it isn't intentional, move it to an environment variable. If it's a false positive, raise entropyThreshold in .commitguardrc or add the path to ignore.`,
          match: token,
        });
      }
    }
  });

  return findings;
}
