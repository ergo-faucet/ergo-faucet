export const IGNORE_PACKAGES: string[] = [
  '@changesets/cli',
  '@rosen-bridge/changeset-formatter',
  '@typescript-eslint/eslint-plugin',
  '@typescript-eslint/parser',
  'eslint',
  'eslint-config-prettier',
  'vitest',
  '@vitest/coverage-istanbul',
  'husky',
  'lint-staged',
  '@types/node',
  'prettier',
  'pg',
  'typescript',
  'tsx',
  'extensionless',
];

export const IGNORE_PATHS: string[] = [
  'node_modules',
  'dist',
  'coverage',
  '*.tsbuildinfo',
  '.vite',
  '.turbo',
];
