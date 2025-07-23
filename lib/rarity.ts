export const rarityLabels = [
  '',
  'Common',
  'Uncommon',
  'Rare',
  'Epic',
  'Legendary',
  'Mythic',
] as const;

export const rarityColors = [
  '', // 0 unused
  'bg-gray-500', // 1 Common
  'bg-green-500', // 2 Uncommon
  'bg-blue-500', // 3 Rare
  'bg-purple-500', // 4 Epic
  'bg-orange-500', // 5 Legendary
  'bg-red-500', // 6 Mythic
] as const;

export function getRarityLabel(starsOrCode: number) {
  const idx = Math.max(1, Math.min(6, starsOrCode));
  return rarityLabels[idx];
}

export function getRarityColor(starsOrCode: number) {
  const idx = Math.max(1, Math.min(6, starsOrCode));
  return rarityColors[idx];
}

export function labelToIndex(label: string) {
  const idx = rarityLabels.findIndex(
    l => l.toLowerCase() === label.toLowerCase()
  );
  return idx > 0 ? idx : 1;
}

// Overloads to accept string label or number
export function getColor(value: number | string) {
  const idx = typeof value === 'number' ? value : labelToIndex(value);
  return getRarityColor(idx);
}

export function getLabel(value: number | string) {
  return typeof value === 'number'
    ? getRarityLabel(value)
    : getRarityLabel(labelToIndex(value));
}
