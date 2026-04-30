export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Allow scopes like RSS-PZ-00 (uppercase + dashes).
    'scope-case': [0],
    // Enforce imperative verb style implicitly via conventional commits,
    // Keep subjects as verbs: "add", "setup", "implement", etc.
  },
};
