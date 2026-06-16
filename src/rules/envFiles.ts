// 계산: 파일 경로만 보고 .env* 위반 여부를 판단한다.
import { Config, Finding } from './types.js';

// .env, .env.local, .env.production 등. 단 .env.example류는 별도 허용.
// basename이 정확히 .env 이거나 .env. 로 시작하는 경우.
function isEnvFile(basename: string): boolean {
  return basename === '.env' || basename.startsWith('.env.');
}

function basenameOf(filePath: string): string {
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1];
}

export function checkEnvFile(filePath: string, config: Config): Finding[] {
  const basename = basenameOf(filePath);
  if (!isEnvFile(basename)) return [];
  if (config.ignore.includes(basename)) return [];
  return [
    {
      file: filePath,
      ruleId: 'env-file',
      severity: 'error',
      message: `환경변수 파일(${basename})이 스테이지되었습니다. 시크릿이 포함될 수 있습니다.`,
      hint: `git rm --cached "${filePath}" 로 스테이지에서 빼고 .gitignore에 ${basename} 을 추가하세요.`,
    },
  ];
}
