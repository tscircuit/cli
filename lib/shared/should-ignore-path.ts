import micromatch from "micromatch"

/** Default directories and patterns ignored by the CLI */
export const DEFAULT_IGNORED_PATTERNS = [
  "**/node_modules/**",
  "**/.git/**",
  "**/.vscode/**",
  // Ignore any directory that starts with a dot
  "**/.*/*",
  // Ignore dotfiles at the project root such as .env
  "**/.*",
]

/**
 * Patterns that should NOT be ignored even if they match DEFAULT_IGNORED_PATTERNS.
 * This allows hot-reloading of linked packages (e.g., via yalc or npm link).
 */
export const WHITELISTED_PATTERNS = [
  // node_modules/pkg/dist/index.js
  "node_modules/*/dist/index.js",
  // node_modules/@scope/pkg/dist/index.js
  "node_modules/@*/*/dist/index.js",
]

export const normalizeIgnorePattern = (pattern: string) => {
  // If the pattern already contains glob characters assume it's complete
  if (/[\*\?\[\]\{\}]/.test(pattern)) return pattern
  // Otherwise treat it as a directory name
  return `**/${pattern}/**`
}

export const shouldIgnorePath = (
  relativePath: string,
  configIgnored: string[] = [],
): boolean => {
  // Check if the path is whitelisted (e.g., node_modules dist files for hot-reloading)
  if (micromatch.isMatch(relativePath, WHITELISTED_PATTERNS)) {
    return false
  }

  const extraPatterns = configIgnored.map(normalizeIgnorePattern)
  return micromatch.isMatch(relativePath, [
    ...DEFAULT_IGNORED_PATTERNS,
    ...extraPatterns,
  ])
}
