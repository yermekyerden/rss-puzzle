import js from '@eslint/js';
import globals from 'globals';
import { FlatCompat } from '@eslint/eslintrc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const compat = new FlatCompat({ baseDirectory: dirname });

export default [
  { ignores: ['dist/**'] },

  js.configs.recommended,
  ...compat.extends('airbnb-base', 'prettier'),

  {
    files: ['eslint.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      // eslint-plugin-import cant resolve dynamic imports used in flat config
      'import/no-unresolved': 'off',
    },
  },

  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: (await import('@typescript-eslint/parser')).default,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: dirname,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: { ...globals.browser },
    },
    plugins: { '@typescript-eslint': (await import('@typescript-eslint/eslint-plugin')).default },
    settings: { 'import/resolver': { typescript: { project: './tsconfig.json' } } },
    linterOptions: { noInlineConfig: true },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'import/extensions': ['error', 'ignorePackages', { ts: 'never' }],
      'no-console': 'off',
    },
  },

  {
    files: ['vite.config.ts'],
    rules: {
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    },
  },
];
