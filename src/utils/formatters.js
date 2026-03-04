export function formatCompactNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '0';
  }

  if (Math.abs(number) < 1000) {
    return number.toString();
  }

  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(number);
}
