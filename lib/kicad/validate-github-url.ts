/**
 * Validate and parse a GitHub repository URL
 * @returns [owner, repo] tuple
 */
export function validateGithubUrl(githubUrl: string): [string, string] {
  const githubPattern =
    /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/
  const match = githubUrl.match(githubPattern)

  if (!match) {
    throw new Error(
      "Invalid GitHub URL. Expected format: https://github.com/owner/repo",
    )
  }

  const [, owner, repo] = match
  return [owner, repo]
}
