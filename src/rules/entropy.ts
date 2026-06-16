// 계산: Shannon 엔트로피와 보수적 시크릿 판별. false positive 최소화 우선.

export function shannonEntropy(s: string): number {
  if (s.length === 0) return 0;
  const freq = new Map<string, number>();
  for (const ch of s) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / s.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

const MIN_SECRET_LEN = 20;

// 시크릿 후보 토큰: 영숫자/+/=/-/_/ 로 구성된 연속 문자열.
function charClassCount(s: string): number {
  let classes = 0;
  if (/[a-z]/.test(s)) classes++;
  if (/[A-Z]/.test(s)) classes++;
  if (/[0-9]/.test(s)) classes++;
  if (/[^a-zA-Z0-9]/.test(s)) classes++;
  return classes;
}

// 보수적 판별: 길이 >= 20, 엔트로피 임계값 초과,
// 최소 2개 이상의 문자 클래스(대/소/숫자/특수)가 섞여 있어야 한다.
// 경로 구분자(/, \)나 공백이 있으면 토큰이 아니므로 제외.
export function looksLikeSecret(token: string, threshold: number): boolean {
  if (token.length < MIN_SECRET_LEN) return false;
  if (/[\s\\/]/.test(token)) return false;
  if (charClassCount(token) < 2) return false; // 단일 클래스(소문자 단어 등) 제외
  return shannonEntropy(token) >= threshold;
}
