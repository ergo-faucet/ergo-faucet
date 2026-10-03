import { describe, vi, afterEach, expect, it } from 'vitest';

import { chooseWeighted } from '../../lib';

describe('chooseWeighted', () => {
  // Mock Math.random for predictable results in random tests
  const mockMathRandom = (value: number) => {
    vi.spyOn(Math, 'random').mockReturnValue(value);
  };

  // Reset mocks after each test
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return undefined for an empty array', () => {
    const result = chooseWeighted([]);
    expect(result).toBeUndefined();
  });

  it('should return undefined when total weight is zero', () => {
    const items = [{ weight: 0 }, { weight: 0 }];
    const result = chooseWeighted(items);
    expect(result).toBeUndefined();
  });

  it('should select the only item when there is one item', () => {
    const items = [{ weight: 5, id: 'A' }];
    const result = chooseWeighted(items, 0.5);
    expect(result).toEqual({ weight: 5, id: 'A' });
  });

  it('should deterministically select an item based on seed', () => {
    const items = [
      { weight: 1, id: 'A' },
      { weight: 1, id: 'B' },
      { weight: 2, id: 'C' },
    ];
    // Total weight = 4
    // Seed = 0.25 * 4 = 1 -> should select second item (B)
    const result = chooseWeighted(items, 0.25);
    expect(result).toEqual({ weight: 1, id: 'B' });
  });

  it('should select first item when seed is 0', () => {
    const items = [
      { weight: 1, id: 'A' },
      { weight: 1, id: 'B' },
      { weight: 2, id: 'C' },
    ];
    const result = chooseWeighted(items, 0);
    expect(result).toEqual({ weight: 1, id: 'A' });
  });

  it('should select last item when seed is just below 1', () => {
    const items = [
      { weight: 1, id: 'A' },
      { weight: 1, id: 'B' },
      { weight: 2, id: 'C' },
    ];
    // Total weight = 4
    // Seed = 0.999 * 4 = 3.996 -> should select last item (C)
    const result = chooseWeighted(items, 0.999);
    expect(result).toEqual({ weight: 2, id: 'C' });
  });

  it('should use Math.random when seed is undefined', () => {
    const items = [
      { weight: 1, id: 'A' },
      { weight: 1, id: 'B' },
    ];
    mockMathRandom(0.4); // 0.4 * 2 = 0.8 -> should select first item
    const result = chooseWeighted(items);
    expect(result).toEqual({ weight: 1, id: 'A' });
  });

  it('should use Math.random when seed is negative', () => {
    const items = [
      { weight: 1, id: 'A' },
      { weight: 1, id: 'B' },
    ];
    mockMathRandom(0.6); // 0.6 * 2 = 1.2 -> should select second item
    const result = chooseWeighted(items, -0.5);
    expect(result).toEqual({ weight: 1, id: 'B' });
  });

  it('should use Math.random when seed is >= 1', () => {
    const items = [
      { weight: 1, id: 'A' },
      { weight: 1, id: 'B' },
    ];
    mockMathRandom(0.3); // 0.3 * 2 = 0.6 -> should select first item
    const result = chooseWeighted(items, 1.5);
    expect(result).toEqual({ weight: 1, id: 'A' });
  });

  it('should handle items with zero weight correctly', () => {
    const items = [
      { weight: 0, id: 'A' },
      { weight: 2, id: 'B' },
      { weight: 0, id: 'C' },
    ];
    // Total weight = 2
    // Seed = 0.5 * 2 = 1 -> should select B
    const result = chooseWeighted(items, 0.5);
    expect(result).toEqual({ weight: 2, id: 'B' });
  });

  it('should be proportional to weights in random selection', () => {
    const items = [
      { weight: 1, id: 'A' },
      { weight: 3, id: 'B' },
    ];
    const selections = new Map<string, number>();
    const trials = 1000;

    for (let i = 0; i < trials; i++) {
      const result = chooseWeighted(items);
      selections.set(result!.id!, (selections.get(result!.id!) || 0) + 1);
    }

    const countA = selections.get('A') || 0;
    const countB = selections.get('B') || 0;
    // Total weight = 4, so A should be ~25% and B ~75%
    expect(countA / trials).toBeCloseTo(0.25, 1);
    expect(countB / trials).toBeCloseTo(0.75, 1);
  });
});
