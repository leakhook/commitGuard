// Data: the input/output and configuration types for rules.
// 데이터: 룰의 입출력과 설정 타입.

export type Severity = 'error' | 'warn' | 'info';

export interface Finding {
  file: string;
  line?: number;
  ruleId: string;
  severity: Severity;
  message: string;
  hint: string;
  match?: string; // masked on output (출력 시 마스킹됨)
}

export interface Config {
  watch: string[];
  ignore: string[];
  allowNextPublic: boolean;
  entropyThreshold: number;
}

// Input passed to content-based rules.
// 내용 기반 룰에 전달되는 입력.
export interface RuleInput {
  file: string;
  content: string;
  config: Config;
}

export const DEFAULT_CONFIG: Config = {
  watch: [],
  ignore: ['.env.example', '.env.sample', '.env.template'],
  allowNextPublic: false,
  entropyThreshold: 4.0,
};
