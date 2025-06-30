import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  tseslint.configs.recommended,
  {
    // *** IMPORTANT: Add the paths you want ESLint to completely ignore ***
    ignores: [
      'dist/',
      'node_modules/',
      'src/cli/**/*',
      'tests/**/*',
      '**/*.test.ts',
      '**/*.spec.ts',
    ],
  },
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 2021,
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // Keep your existing rules
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      'no-undef': 'off',

      // *** Add this line to turn off the no-explicit-any rule ***
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]);
