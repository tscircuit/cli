import micromatch from "micromatch"

/** Default directories and patterns ignored by the CLI */
export const DEFAULT_IGNORED_PATTERNS = [
  "**/node_modules/**",
  // Allow watching top-level node_modules dist/index.js files and their parent directories
  "!node_modules{,/*,/*/dist,/*/dist/index.js,/@*,/@*/*,/@*/*/dist,/@*/*/dist/index.js}",
  // Re-ignore loose files directly in node_modules
  "node_modules/*.{js,ts,json}",
  "**/.git/**",
  "**/.vscode/**",
  // Ignore any directory that starts with a dot
  "**/.*/*",
  // Ignore dotfiles at the project root such as .env
  "**/.*",
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
  return (
    micromatch([relativePath], [...DEFAULT_IGNORED_PATTERNS, ...extraPatterns])
      .length > 0
  )
}
