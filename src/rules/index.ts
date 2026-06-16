// 계산: 한 파일(경로 + 내용)에 모든 룰을 적용해 Finding[]을 합성한다.
import { Config, Finding, RuleInput } from './types.js';
import { checkEnvFile } from './envFiles.js';
import { checkPatterns } from './patterns.js';
import { checkNextPublic } from './nextPublic.js';
import { checkWatchList } from './watchList.js';

const MAX_SCAN_BYTES = 1_000_000; // 1MB 초과 파일은 내용 스캔 스킵

// 단순 글롭: * 는 슬래시 제외 임의 문자, ** 는 슬래시 포함.
function globToRegex(glob: string): RegExp {
  const norm = glob.replace(/\\/g, '/');
  const escaped = norm
    .replace(/[.+^${}()|[\]]/g, '\\$&')
    .replace(/\*\*/g, '\x00')
    .replace(/\*/g, '[^/]*')
    .replace(/\x00/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function isIgnored(filePath: string, ignore: string[]): boolean {
  const norm = filePath.replace(/\\/g, '/');
  return ignore.some((g) => {
    const gn = g.replace(/\\/g, '/');
    if (gn === norm) return true;
    // basename 일치도 허용 (.env.example 같은 항목)
    if (!gn.includes('/') && norm.split('/').pop() === gn) return true;
    return globToRegex(gn).test(norm);
  });
}

export function isProbablyBinary(content: string): boolean {
  return content.includes('\x00');
}

export function scanFile(filePath: string, content: string, config: Config): Finding[] {
  const findings: Finding[] = [];

  // ignore 글롭 우선 체크.
  if (isIgnored(filePath, config.ignore)) return findings;

  // 경로 기반 룰은 항상 적용.
  findings.push(...checkEnvFile(filePath, config));
  findings.push(...checkWatchList(filePath, config));

  // 내용 기반 룰: 바이너리/대용량 스킵.
  if (content.length <= MAX_SCAN_BYTES && !isProbablyBinary(content)) {
    const input: RuleInput = { file: filePath, content, config };
    findings.push(...checkPatterns(input));
    findings.push(...checkNextPublic(input));
  }

  return findings;
}
