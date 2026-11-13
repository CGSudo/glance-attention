export function clarityVerdict(delta: number): string {
  if (delta === 0) return 'Both variants have equal clarity';
  return `Variant ${delta > 0 ? 'B' : 'A'} has more concentrated attention`;
}
