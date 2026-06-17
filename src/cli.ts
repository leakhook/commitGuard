#!/usr/bin/env node
// Action: parse argv and route to a command.
// 액션: argv 파싱 후 명령으로 라우팅한다.
import { runScan } from './commands/scan.js';
import { runInit } from './commands/init.js';

function main(argv: string[]): void {
  const [command, ...rest] = argv;
  switch (command) {
    case 'init': {
      const code = runInit(process.cwd());
      process.exit(code);
    }
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
      console.error(`Unknown command: ${command}`);
      process.exit(2);
  }
}

function printHelp(): void {
  console.log(`commitguard - block secrets from being committed

Usage:
  commitguard init            install the husky hook and default config
  commitguard scan [--staged] scan for secrets (--staged: staged files only)
`);
}

main(process.argv.slice(2));
