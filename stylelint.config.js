export default {
  extends: ['stylelint-config-standard'],
  ignoreFiles: [
    'dist/**',
    'node_modules/**',
    '**/*.html',
    '**/*.ts',
    '**/*.js',
    '**/*.mjs',
    '**/*.cjs',
    '**/*.json',
  ],
  rules: {
    'selector-class-pattern': null,
  },
};
