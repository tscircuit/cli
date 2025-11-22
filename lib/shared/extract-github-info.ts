/**
 * Extracts owner and repo from a GitHub URL or identifier
 */
export function extractGitHubInfo(packageName: string): {
  owner: string
  repo: string
} | null {
  // github:owner/repo format
  if (packageName.startsWith("github:")) {
    const [owner, repo] = packageName.replace("github:", "").split("/")
    return { owner, repo }
  }

  // owner/repo format
  if (/^[\w-]+\/[\w-]+$/.test(packageName)) {
    const [owner, repo] = packageName.split("/")
    return { owner, repo }
  }

  // Full GitHub URL
  if (
    packageName.startsWith("https://github.com/") ||
    packageName.startsWith("http://github.com/")
  ) {
    const url = new URL(packageName)
    const [, owner, repo] = url.pathname.split("/")
    return { owner, repo: repo.replace(/\.git$/, "") }
  }

  return null
}
