#!/usr/bin/env tsx
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { IGNORE_PACKAGES, IGNORE_PATHS } from './depcheck-config';

export const getDepcheckCommand = (directory: string): string => {
  return `npx depcheck --ignores="${IGNORE_PACKAGES.join(
    ',',
  )}" --ignore-patterns="${IGNORE_PATHS.join(',')}" ${path.relative(
    process.cwd(),
    directory,
  )}`;
};

export const perPackage =
  (resolver: (directory: string, file: string) => string) =>
  (files: string[]) => {
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
      }, new Set<string>()),
    );
  };

const findAllPackages = (): string[] => {
  const packages: string[] = [];
  const rootDir = process.cwd();

  function scanDirectory(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
            continue;
          }
          scanDirectory(fullPath);
        } else if (entry.name === 'package.json' && dir !== rootDir) {
          packages.push(dir);
        }
      }
    } catch (error) {
      console.warn(`Could not scan directory ${dir}:`, error.message);
    }
  }

  scanDirectory(rootDir);
  return [...new Set(packages)];
};

const runCIDepcheck = () => {
  console.log('Running depcheck for all packages...\n');

  const packages = findAllPackages();

  for (const dir of packages) {
    console.log(`Running depcheck in ${dir}`);
    const command = getDepcheckCommand(dir);
    try {
      execSync(command, { stdio: 'inherit' });
    } catch {}
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  runCIDepcheck();
}
