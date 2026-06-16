#!/usr/bin/env node
// 액션: argv 파싱 후 명령으로 라우팅한다.
import { runScan } from './commands/scan.js';

function main(argv: string[]): void {
  const [command, ...rest] = argv;
  switch (command) {
    case 'init':
      console.log('init: 아직 구현되지 않음');
      break;
    case 'scan': {
      const staged = rest.includes('--staged');
      const code = runScan({ cwd: process.cwd(), staged });
      process.exit(code);
    }
    case undefined:
    case '-h':
    case '--help':
      printHelp();
      break;
    default:
      console.error(`알 수 없는 명령: ${command}`);
      process.exit(2);
  }
}

function printHelp(): void {
  console.log(`envguard - 시크릿 커밋 방지 도구

사용법:
  envguard init            husky 훅과 기본 설정을 등록한다
  envguard scan [--staged] 시크릿을 검사한다 (--staged: 스테이지된 파일만)
`);
}

main(process.argv.slice(2));
