/**
 * Extract package name from various npm/bun package specifier formats
 * Handles:
 * - GitHub URLs: https://github.com/owner/repo -> repo
 * - GitHub shorthand: owner/repo -> repo
 * - Scoped packages: @scope/package@version -> @scope/package
 * - Regular packages: package@version -> package
 * - File paths: file:./path -> path basename
 */
export function extractPackageName(packageSpec: string): string {
  // GitHub URL: https://github.com/owner/repo or https://github.com/owner/repo.git
  const githubUrlMatch = packageSpec.match(
    /^https?:\/\/github\.com\/[^\/]+\/([^\/]+?)(?:\.git)?$/,
  )
  if (githubUrlMatch) {
    return githubUrlMatch[1]
  }

  // GitHub shorthand: owner/repo
  const githubShorthandMatch = packageSpec.match(/^[^\/]+\/([^@#]+)/)
  if (githubShorthandMatch) {
    return githubShorthandMatch[1]
  }

  // Remove version specifier (@version, #tag, etc.)
  let name = packageSpec.split(/[@#]/)[0]

  // Handle file: protocol
  if (name.startsWith("file:")) {
    name = name.substring(5)
    // Get the last part of the path
    const parts = name.split(/[\/\\]/)
    return parts[parts.length - 1] || "package"
  }

  // Handle tar.gz URLs - extract filename without extension
  if (name.match(/^https?:\/\//)) {
    const urlParts = name.split("/")
    const filename = urlParts[urlParts.length - 1]
    return filename.replace(/\.(tar\.gz|tgz)$/, "")
  }

  return name || "package"
}
