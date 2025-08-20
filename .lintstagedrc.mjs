import fs from 'fs';
import path from 'path';

const perPackage = (resolver) => (files) => {
  return Array.from(
    files.reduce((packages, file) => {
      let directory = path.dirname(file);
      while (directory && directory !== process.cwd()) {
        if (fs.existsSync(path.join(directory, 'package.json'))) {
          packages.add(resolver(directory, file));
          break;
        }
        const parent = path.dirname(directory);
        if (parent === directory) break;
        directory = parent;
      }
      return packages;
    }, new Set()),
  );
};

const getDepcheckCommand = (directory) => {
  const packages = [
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

  const paths = ['vite.config.ts'];

  return `npx depcheck --ignores="${packages.join(
    ', ',
  )}" --ignore-patterns="${paths.join(
    ', ',
  )}" ${path.relative(process.cwd(), directory)}`;
};

export default {
  '*': 'prettier --ignore-unknown --write',

  '**/{packages,services}/**/*.{js,jsx,ts,tsx}': 'eslint --fix',

  '**/*.{ts,tsx}': perPackage((directory) => {
    return `npm run type-check --workspace ${path.relative(
      process.cwd(),
      directory,
    )}`;
  }),

  '**/*.{js,jsx,ts,tsx,mjs}': perPackage(getDepcheckCommand),
  '**/package.json': perPackage(getDepcheckCommand),

  '*.{js,jsx,ts,tsx}': 'npm run test:related',
};
