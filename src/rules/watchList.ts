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
      message: `감시 대상 파일(${filePath})이 스테이지되었습니다. .commitguardrc의 watch 목록에 등록되어 있습니다.`,
      hint: `git rm --cached "${filePath}" 로 스테이지에서 빼세요. 더 이상 감시가 필요 없으면 .commitguardrc의 watch에서 제거하세요.`,
    },
  ];
}
