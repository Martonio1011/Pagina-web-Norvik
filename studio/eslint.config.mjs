import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'generated/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        AbortSignal: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        React: 'readonly',
      },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      ...tseslint.configs.recommended.rules,
      // `any` is allowed only with an explicit justification comment, which
      // this rule cannot check — so it stays an error and exceptions are
      // silenced one by one with an eslint-disable line that carries the why.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Empty catch blocks are the single easiest way to lose a real failure.
      // Every error path in this project either recovers or gets recorded.
      'no-empty': ['error', { allowEmptyCatch: false }],
      'no-undef': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // A Zod schema and the type inferred from it deliberately share a name
      // (`const Foo = z.enum(...)` plus `type Foo = z.infer<typeof Foo>`), so
      // one import brings both the validator and the type. TypeScript keeps
      // values and types in separate namespaces and accepts this; neither
      // no-redeclare rule can tell it apart from a genuine clash, and `tsc`
      // already catches those.
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'off',
    },
  },
  prettier,
];
