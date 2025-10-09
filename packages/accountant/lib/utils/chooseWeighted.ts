interface Weighted {
  weight: number;
}

/**
 * Selects one item using weight-proportional (roulette-wheel) selection.
 *
 * - If `seed` is provided and in [0, 1) the selection is deterministic for that seed.
 * - If `seed` is omitted or out of range, Math.random() is used.
 * - Returns undefined if `items` is empty or total weight is zero.
 *
 * @param items - Array of objects; each must have a numeric `weight` property.
 * @param seed - Optional deterministic value in [0,1). Values outside this range are ignored.
 * @returns {T | undefined} The selected item or undefined when no selection is possible.
 */
export const chooseWeighted = <T extends Weighted>(
  items: T[],
  seed?: number,
): T | undefined => {
  if (!items.length) return undefined;
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  if (total === 0) return undefined;
  if (seed === undefined || seed >= 1 || seed < 0) seed = Math.random();
  let r = seed * total;
  for (const item of items) {
    if (r < item.weight) return item;
    r -= item.weight;
  }
  return undefined;
};
