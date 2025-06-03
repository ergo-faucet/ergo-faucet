import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      all: true,
      reporter: ['cobertura', 'lcov', 'text', 'text-summary'],
      provider: 'istanbul',
      include: ['src'],
    },
    passWithNoTests: true,
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});