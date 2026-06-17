// Calculation: Shannon entropy + a conservative secret check. Minimizing false positives comes first.
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

// Count how many character classes (lower/upper/digit/other) appear in the string.
// 문자 클래스(소/대/숫자/기타)가 몇 가지 섞였는지 센다.
function charClassCount(s: string): number {
  let classes = 0;
  if (/[a-z]/.test(s)) classes++;
  if (/[A-Z]/.test(s)) classes++;
  if (/[0-9]/.test(s)) classes++;
  if (/[^a-zA-Z0-9]/.test(s)) classes++;
  return classes;
}

// Conservative check: length >= 20, entropy above the threshold, and at least
// two character classes (upper/lower/digit/special) mixed in.
// Strings with path separators (/, \) or whitespace aren't tokens, so they're excluded.
// 보수적 판별: 길이 >= 20, 엔트로피 임계값 초과, 최소 2개 이상의 문자 클래스
// (대/소/숫자/특수)가 섞여야 한다. 경로 구분자(/, \)나 공백이 있으면 토큰이 아니므로 제외.
export function looksLikeSecret(token: string, threshold: number): boolean {
  if (token.length < MIN_SECRET_LEN) return false;
  if (/[\s\\/]/.test(token)) return false;
  if (charClassCount(token) < 2) return false; // exclude single-class strings like lowercase words (단일 클래스 제외)
  return shannonEntropy(token) >= threshold;
}
