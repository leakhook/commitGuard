// Action: gather the file list, apply rules, print the report, and decide the exit code.
// 액션: 파일 목록을 모으고 룰을 적용한 뒤 리포트를 출력하고 exit code를 결정한다.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../config.js';
import { isGitRepo, getStagedFiles, getTrackedFiles, readStagedContent } from '../git.js';
import { scanFile } from '../rules/index.js';
import { Finding } from '../rules/types.js';
import { printReport } from '../report.js';

export interface ScanOptions {
  cwd: string;
  staged: boolean;
}

function collectFindings(
  files: string[],
  readContent: (file: string) => string,
  cwd: string,
): Finding[] {
  const config = loadConfig(cwd);
  const findings: Finding[] = [];
  for (const file of files) {
    let content = '';
    try {
      content = readContent(file);
    } catch {
      content = '';
    }
    findings.push(...scanFile(file, content, config));
  }
  return findings;
}

export function runScan(opts: ScanOptions): number {
  if (!isGitRepo(opts.cwd)) {
    process.stderr.write('commitguard: not a git repository. Run git init and try again.\n');
    return 2;
  }

  const files = opts.staged ? getStagedFiles(opts.cwd) : getTrackedFiles(opts.cwd);
  const readContent = opts.staged
    ? (file: string) => readStagedContent(opts.cwd, file)
    : (file: string) => readFileSync(join(opts.cwd, file), 'utf8');

  const findings = collectFindings(files, readContent, opts.cwd);
  printReport(findings);

  return findings.some((f) => f.severity === 'error') ? 1 : 0;
}
