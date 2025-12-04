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
  // Allow node_modules dist/index.js for hot-reloading linked packages
  "!node_modules/*/dist/index.js",
  "!node_modules/@*/*/dist/index.js",
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
  const extraPatterns = configIgnored.map(normalizeIgnorePattern)
  const patterns = [...DEFAULT_IGNORED_PATTERNS, ...extraPatterns]
  // Use micromatch() which properly handles negation patterns
  return micromatch([relativePath], patterns).length > 0
}
