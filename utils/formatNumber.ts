/**
 * Formats numbers with thousands separators
 */
export function formatWithCommas(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(num)) return '0'
  
  // Simple formatting with thousands separators
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4
  }).format(num)
}

/**
 * Formats CRA tokens with thousands separators
 */
export function formatCRA(value: string | number, showUnit = true): string {
  const formatted = formatWithCommas(value)
  return showUnit ? `${formatted} CRA` : formatted
} 