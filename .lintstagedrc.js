export default {
  'src/**/*.ts': ['eslint --fix', 'prettier --write'],
  'src/**/*.css': ['stylelint --fix', 'prettier --write'],
  '*.{html,json,md}': ['prettier --write'],
};
