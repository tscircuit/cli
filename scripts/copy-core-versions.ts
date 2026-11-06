import { join } from "node:path"

// Shared runtime converters remain owned by tscircuit. Only existing CLI
// devDependencies are copied, so synchronization cannot introduce duplicates.
const CONVERTERS = [
  "@tscircuit/circuit-json-to-drawing",
  "circuit-json-to-3d-png",
  "circuit-json-to-altium",
  "circuit-json-to-bom-csv",
  "circuit-json-to-connectivity-map",
  "circuit-json-to-fdm-component-box",
  "circuit-json-to-footprinter",
  "circuit-json-to-gerber",
  "circuit-json-to-gltf",
  "circuit-json-to-kicad",
  "circuit-json-to-pnp-csv",
  "circuit-json-to-readable-netlist",
  "circuit-json-to-spice",
  "circuit-json-to-step",
  "circuit-json-to-tscircuit",
  "circuit-to-svg",
  "dsn-converter",
  "easyeda",
  "kicad-to-circuit-json",
] as const

type PackageManifest = {
  devDependencies?: Record<string, string>
  dependencies?: Record<string, string>
}

type CoreManifest = PackageManifest & { name: string; version: string }

export function copyCoreVersions(
  current: PackageManifest,
  core: PackageManifest,
): Record<string, string> {
  const coreDeps = { ...core.devDependencies, ...core.dependencies }
  const updated = { ...current.devDependencies }
  for (const name of CONVERTERS) {
    // Older published core versions may not yet track every CLI converter.
    if (name in updated && name in coreDeps) {
      updated[name] = coreDeps[name]!
    }
  }
  return updated
}

export async function fetchCoreManifest(
  version: string,
  fetchManifest: (url: string, init: RequestInit) => Promise<Response> = fetch,
): Promise<CoreManifest> {
  if (!/^(latest|\d+\.\d+\.\d+)$/.test(version)) {
    throw new Error("CORE_VERSION must be a stable core version or latest")
  }
  // Read the published manifest without installing core beside tscircuit's
  // dependency graph. Core's devDependencies are version metadata here.
  const response = await fetchManifest(
    `https://registry.npmjs.org/@tscircuit%2fcore/${version}`,
    { signal: AbortSignal.timeout(30_000) },
  )
  if (!response.ok) {
    throw new Error(`Unable to read core ${version}: HTTP ${response.status}`)
  }
  const core = (await response.json()) as CoreManifest
  if (
    core.name !== "@tscircuit/core" ||
    !core.version ||
    !core.devDependencies ||
    (version !== "latest" && core.version !== version)
  ) {
    throw new Error("Registry response is missing the core dependency manifest")
  }
  return core
}

export async function updatePackageJson(
  packagePath: string,
  core: CoreManifest,
): Promise<number> {
  const current = await Bun.file(packagePath).json()
  const updated = copyCoreVersions(current, core)
  const changed = Object.entries(updated).filter(
    ([name, value]) => current.devDependencies[name] !== value,
  )
  for (const [name, value] of changed) {
    console.log(`${name}: ${current.devDependencies[name]} -> ${value}`)
  }
  console.log(
    `Copied ${changed.length} converter versions from core ${core.version}`,
  )
  if (changed.length > 0) {
    current.devDependencies = updated
    await Bun.write(packagePath, `${JSON.stringify(current, null, 2)}\n`)
  }
  return changed.length
}

if (import.meta.main) {
  const core = await fetchCoreManifest(process.env.CORE_VERSION || "latest")
  await updatePackageJson(join(import.meta.dir, "../package.json"), core)
}
