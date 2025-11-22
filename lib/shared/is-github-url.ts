/**
 * Checks if a package name is a GitHub URL
 */
export function isGitHubUrl(packageName: string): boolean {
  return (
    packageName.startsWith("https://github.com/") ||
    packageName.startsWith("http://github.com/") ||
    packageName.startsWith("github:") ||
    /^[\w-]+\/[\w-]+$/.test(packageName)
  )
}
