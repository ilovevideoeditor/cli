#!/usr/bin/env node
/**
 * Post-build script: adds .js extensions to relative ESM imports
 * that lack an extension. Required for Node.js ESM runtime.
 */
import fs from 'node:fs';
import path from 'node:path';

const EXTENSIONS = new Set(['.js', '.json', '.css', '.mjs', '.cjs']);

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Match relative imports: from './something' or from '../something'
  const regex = /from\s+(['"])(\.[./][^'"]*?)\1/g;
  content = content.replace(regex, (match, quote, importPath) => {
    const base = importPath.split('?')[0].split('#')[0];
    const ext = path.extname(base);
    if (ext && EXTENSIONS.has(ext)) return match;
    if (base.endsWith('/')) return match; // directory import
    changed = true;
    return `from ${quote}${importPath}.js${quote}`;
  });

  // Also handle dynamic imports: import('./something')
  const dynamicRegex = /import\s*\(\s*(['"])(\.[./][^'"]*?)\1\s*\)/g;
  content = content.replace(dynamicRegex, (match, quote, importPath) => {
    const base = importPath.split('?')[0].split('#')[0];
    const ext = path.extname(base);
    if (ext && EXTENSIONS.has(ext)) return match;
    if (base.endsWith('/')) return match;
    changed = true;
    return `import(${quote}${importPath}.js${quote})`;
  });

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`  fixed ${filePath}`);
  }
}

function walkDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.name.endsWith('.js')) {
      fixFile(fullPath);
    }
  }
}

const dirs = process.argv.slice(2);
if (dirs.length === 0) {
  console.log('Usage: node fix-esm-imports.mjs <dir1> <dir2> ...');
  process.exit(1);
}

for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  console.log(`Fixing imports in ${dir}...`);
  walkDir(dir);
}
