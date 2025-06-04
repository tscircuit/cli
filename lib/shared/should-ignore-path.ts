export const DEFAULT_IGNORED_DIRECTORIES = ["node_modules", ".git", ".vscode"]

export const shouldIgnorePath = (
  relativePath: string,
  configIgnored: string[] = [],
): boolean => {
  const parts = relativePath.split(/[/\\]/)
  for (const part of parts) {
    if (!part) continue
    if (part.startsWith(".")) return true
    if (DEFAULT_IGNORED_DIRECTORIES.includes(part)) return true
    if (configIgnored.includes(part)) return true
  }
  return false
}
