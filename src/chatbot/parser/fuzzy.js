export function fuzzyIncludes(input = '', keywords = []) {
  const lower = input.toLowerCase();

  return keywords.some(keyword => {
    return lower.includes(keyword.toLowerCase());
  });
}