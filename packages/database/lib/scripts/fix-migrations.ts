#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';

const MIGRATIONS_DIR = path.join(process.cwd(), 'lib', 'migrations');

function fixMigrations(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      fixMigrations(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const updated = content.replace(
        /from ['"]typeorm['"]/g,
        "from '@rosen-bridge/extended-typeorm'",
      );

      if (updated !== content) {
        fs.writeFileSync(fullPath, updated, 'utf-8');
        console.log(`Updated imports in: ${fullPath}`);
      }
    }
  }
}

fixMigrations(MIGRATIONS_DIR);
console.log('All migration files processed.');
