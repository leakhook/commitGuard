// 계산: 사용자가 지정한 watch 목록에 해당 파일이 들어가면 error.
import { Config, Finding } from './types.js';

function normalize(p: string): string {
  return p.replace(/\\/g, '/');
}

export function checkWatchList(filePath: string, config: Config): Finding[] {
  const target = normalize(filePath);
  const watched = config.watch.map(normalize);
  if (!watched.includes(target)) return [];
  return [
    {
      file: filePath,
      ruleId: 'watch',
      severity: 'error',
      message: `Watched file (${filePath}) is staged. It is listed in the watch array of .commitguardrc.`,
      hint: `Unstage it with git rm --cached "${filePath}". If it no longer needs watching, remove it from watch in .commitguardrc.`,
    },
  ];
}
