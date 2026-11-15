type Manifest = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

export function getPackageUpdatePlan(manifest: Manifest, input: string) {
  const owned = { ...manifest.dependencies, ...manifest.devDependencies }
  const requested = input
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
  for (const name of requested) {
    if (!(name in owned))
      throw new Error(`CLI does not own dependency: ${name}`)
  }
  // Core is selected and pinned separately, never left as a --latest range.
  return [
    ...new Set([
      "@tscircuit/runframe",
      "@tscircuit/eval",
      ...requested.filter((name) => name !== "@tscircuit/core"),
    ]),
  ]
}
