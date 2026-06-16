// 액션: git 명령으로 파일 목록과 스테이지 blob을 읽는다.
import { execFileSync } from 'node:child_process';

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
}

export function isGitRepo(cwd: string): boolean {
  try {
    const out = git(cwd, ['rev-parse', '--is-inside-work-tree']).trim();
    return out === 'true';
  } catch {
    return false;
  }
}

// 스테이지된(추가/수정/복사) 파일 경로. 삭제는 제외.
export function getStagedFiles(cwd: string): string[] {
  const out = git(cwd, ['diff', '--cached', '--name-only', '--diff-filter=ACM']);
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

export function getTrackedFiles(cwd: string): string[] {
  const out = git(cwd, ['ls-files']);
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

// 스테이지된 blob 내용(인덱스 기준). 작업트리 수정과 무관하게 커밋될 내용을 읽는다.
export function readStagedContent(cwd: string, file: string): string {
  return git(cwd, ['show', `:${file}`]);
}
