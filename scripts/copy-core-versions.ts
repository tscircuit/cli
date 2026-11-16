import { join } from "node:path"

type Manifest = {
  version?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

/** Copy only packages CLI already owns. Preserve URL, Git and exact specs. */
export function copyCoreVersions(current: Manifest, core: Manifest): Manifest {
  const coreSpecs = { ...core.devDependencies, ...core.dependencies }
  const updated = structuredClone(current)
  for (const section of ["dependencies", "devDependencies"] as const) {
    for (const name of Object.keys(updated[section] ?? {})) {
      if (name !== "@tscircuit/core" && name in coreSpecs) {
        updated[section]![name] = coreSpecs[name]!
      }
    }
  }
  return updated
}

if (import.meta.main) {
  const root = join(import.meta.dirname, "..")
  const current = await Bun.file(join(root, "package.json")).json()
  const core = await Bun.file(
    join(root, "node_modules/@tscircuit/core/package.json"),
  ).json()
  if (current.dependencies["@tscircuit/core"] !== core.version) {
    throw new Error(
      "Install CLI's exact recorded core before copying dependency versions",
    )
  }
  const updated = copyCoreVersions(current, core)
  if (JSON.stringify(updated) !== JSON.stringify(current)) {
    await Bun.write(
      join(root, "package.json"),
      `${JSON.stringify(updated, null, 2)}\n`,
    )
  }
}
