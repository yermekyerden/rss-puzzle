import { execSync } from 'node:child_process';

function getCurrentBranchName() {
  return execSync('git symbolic-ref --short HEAD', { encoding: 'utf8' }).trim();
}

function validate(branchName) {
  const allowedExact = new Set([
    'main',
    'rss-puzzle',
    'gh-pages',
    'code-review',
    'news-api',
    'pair-em-up',
    'portfolio',
    'self-introduction',
    'virtual-music-kit',
  ]);

  if (allowedExact.has(branchName)) return;

  const allowedTypes = '(feat|fix|chore|refactor|docs|test|build|ci|perf|style|revert)';
  const storyId = 'RSS-PZ-\\d{2}';
  const slug = '[a-z0-9]+(?:-[a-z0-9]+)*';

  const pattern = new RegExp(`^${allowedTypes}\\/${storyId}_${slug}$`, 'u');

  if (!pattern.test(branchName)) {
    throw new Error(
      [
        `Invalid branch name: "${branchName}"`,
        'Expected: <type>/RSS-PZ-XX_<kebab-case>',
        'Examples:',
        '  feat/RSS-PZ-08_word-move',
        '  chore/RSS-PZ-00_tooling',
      ].join('\n'),
    );
  }
}

try {
  validate(getCurrentBranchName());
} catch (error) {
  // eslint-disable-next-line no-console
  console.error(String(error instanceof Error ? error.message : error));
  process.exit(1);
}
