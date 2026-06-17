// 계산: Finding[]을 사람이 읽기 좋은 문자열로 포맷한다. (액션은 printReport)
import { Finding, Severity } from './rules/types.js';
import { color } from './ansi.js';

// 시크릿 토큰 마스킹: 앞 4자만 노출.
export function maskSecret(value: string): string {
  if (value.length <= 4) return '*'.repeat(value.length);
  return value.slice(0, 4) + '*'.repeat(value.length - 4);
}

function severityTag(sev: Severity, enabled: boolean): string {
  if (sev === 'error') return color('error', 'red', enabled);
  if (sev === 'warn') return color('warn', 'yellow', enabled);
  return color('info', 'gray', enabled);
}

function location(f: Finding): string {
  return f.line ? `${f.file}:${f.line}` : f.file;
}

export function formatReport(findings: Finding[], colorEnabled: boolean): string {
  if (findings.length === 0) {
    return color('✓ commitguard: no problems found (clean)', 'green', colorEnabled);
  }

  const lines: string[] = [];
  for (const f of findings) {
    const tag = severityTag(f.severity, colorEnabled);
    const loc = color(location(f), 'bold', colorEnabled);
    lines.push(`${tag}  ${loc}  [${f.ruleId}]`);
    lines.push(`   ${f.message}`);
    if (f.match) lines.push(color(`   value: ${maskSecret(f.match)}`, 'gray', colorEnabled));
    lines.push(color(`   → ${f.hint}`, 'gray', colorEnabled));
    lines.push('');
  }

  const errors = findings.filter((f) => f.severity === 'error').length;
  const warns = findings.filter((f) => f.severity === 'warn').length;
  lines.push(`commitguard: ${color(`error ${errors}`, 'red', colorEnabled)}, ${color(`warn ${warns}`, 'yellow', colorEnabled)}`);
  if (errors > 0) {
    lines.push(color('If a flagged secret is already in git history, rotate the key now and scrub it with git-filter-repo or BFG.', 'gray', colorEnabled));
  }
  return lines.join('\n');
}

// 액션: 콘솔에 리포트를 출력한다.
export function printReport(findings: Finding[], stream: NodeJS.WriteStream = process.stderr): void {
  const colorEnabled = stream.isTTY === true;
  stream.write(formatReport(findings, colorEnabled) + '\n');
}
