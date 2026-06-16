// 액션(로드: 파일 읽기) + 계산(병합/검증).
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Config, DEFAULT_CONFIG } from './rules/types.js';

// 계산: 부분 설정을 기본값과 병합하고 타입을 검증한다.
export function mergeConfig(partial: Partial<Config>): Config {
  const out: Config = { ...DEFAULT_CONFIG };
  if (Array.isArray(partial.watch)) out.watch = partial.watch.filter((x) => typeof x === 'string');
  if (Array.isArray(partial.ignore)) out.ignore = partial.ignore.filter((x) => typeof x === 'string');
  if (typeof partial.allowNextPublic === 'boolean') out.allowNextPublic = partial.allowNextPublic;
  if (typeof partial.entropyThreshold === 'number') out.entropyThreshold = partial.entropyThreshold;
  return out;
}

// 계산: JSON 문자열 파싱. 실패 시 출처를 알려주는 에러.
export function parseConfigJson(raw: string): Partial<Config> {
  try {
    return JSON.parse(raw) as Partial<Config>;
  } catch (e) {
    throw new Error(`.envguardrc 파싱 실패: 올바른 JSON이 아닙니다. (${(e as Error).message})`);
  }
}

// 액션: 디스크에서 설정을 로드한다. 우선순위 .envguardrc > package.json "envguard" > 기본값.
export function loadConfig(cwd: string): Config {
  const rcPath = join(cwd, '.envguardrc');
  if (existsSync(rcPath)) {
    return mergeConfig(parseConfigJson(readFileSync(rcPath, 'utf8')));
  }
  const pkgPath = join(cwd, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (pkg.envguard && typeof pkg.envguard === 'object') {
      return mergeConfig(pkg.envguard as Partial<Config>);
    }
  }
  return { ...DEFAULT_CONFIG };
}
