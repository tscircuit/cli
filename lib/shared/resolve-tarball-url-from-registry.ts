export async function resolveTarballUrlFromRegistry(packageName: string) {
  const encodedName = encodeURIComponent(packageName)
  const response = await fetch(`https://npm.tscircuit.com/${encodedName}`)

  if (!response.ok) {
    throw new Error(
      `Failed to fetch package metadata for ${packageName}: HTTP ${response.status}`,
    )
  }

  const metadata = await response.json()
  const latestVersion = metadata?.["dist-tags"]?.latest
  let versionInfo = latestVersion
    ? metadata?.versions?.[latestVersion]
    : undefined

  if (!versionInfo && metadata?.versions) {
    const versionEntries = Object.entries(metadata.versions) as [
      string,
      { dist?: { tarball?: string } },
    ][]
    versionEntries.sort(([a], [b]) => {
      if (a === b) return 0
      return a < b ? -1 : 1
    })
    versionInfo = versionEntries.at(-1)?.[1]
  }

  const tarballUrl: string | undefined = versionInfo?.dist?.tarball

  if (!tarballUrl) {
    throw new Error(
      `Unable to determine tarball URL for ${packageName} from registry metadata.`,
    )
  }

  return tarballUrl
}
