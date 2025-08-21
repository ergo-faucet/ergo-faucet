import fs from 'fs';
import path from 'path';

const perPackage = (resolver) => (files) => {
  return Array.from(
    files.reduce((packages, file) => {
      let directory = path.dirname(path.resolve(file));
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
  return `npx depcheck  ${path.relative(process.cwd(), directory)}`;
};

export default {
  ...(process.env.CI === 'true'
    ? {
        '**/*.{js,jsx,ts,tsx,mjs}': perPackage(getDepcheckCommand),
        '**/package.json': perPackage(getDepcheckCommand),
      }
    : {
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
      }),
};
