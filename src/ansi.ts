// 계산: ANSI 색상 헬퍼. enabled=false면 원문 그대로 반환.
type Color = 'red' | 'yellow' | 'green' | 'gray' | 'bold';

const CODES: Record<Color, [number, number]> = {
  red: [31, 39],
  yellow: [33, 39],
  green: [32, 39],
  gray: [90, 39],
  bold: [1, 22],
};

export function color(text: string, c: Color, enabled: boolean): string {
  if (!enabled) return text;
  const [on, off] = CODES[c];
  return `\x1b[${on}m${text}\x1b[${off}m`;
}
