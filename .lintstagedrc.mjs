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

const runDepcheck = {
  '**/*.{js,ts,mjs}': perPackage(getDepcheckCommand),
  '**/package.json': perPackage(getDepcheckCommand),
};

export default {
  ...(process.env.CI === 'true'
    ? runDepcheck
    : {
        '*': 'prettier --ignore-unknown --write',

        '*.{js,ts}': ['eslint --fix', 'npm run test -- related -- --run'],

        '**/*.{ts,js}': perPackage((directory) => {
          return `npm run type-check --workspace ${path.relative(
            process.cwd(),
            directory,
          )}`;
        }),

        ...runDepcheck,
      }),
};
