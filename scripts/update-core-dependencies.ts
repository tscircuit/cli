import { join } from "node:path"

const root = join(import.meta.dirname, "..")
function run(...args: string[]) {
  const result = Bun.spawnSync([process.execPath, ...args], {
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
  })
  if (result.exitCode !== 0)
    throw new Error(`Dependency update failed: bun ${args.join(" ")}`)
}

// Select once, then record the installed version exactly for downstream consumers.
run("update", "--latest", "@tscircuit/core")
const core = await Bun.file(
  join(root, "node_modules/@tscircuit/core/package.json"),
).json()
const manifestPath = join(root, "package.json")
const current = await Bun.file(manifestPath).json()
current.dependencies["@tscircuit/core"] = core.version
await Bun.write(manifestPath, `${JSON.stringify(current, null, 2)}\n`)
run("run", "scripts/copy-core-versions.ts")
const owned = await Bun.file(manifestPath).json()
const coreSpecs = { ...core.devDependencies, ...core.dependencies }
const shared = Object.keys(coreSpecs).filter(
  (name) => name in owned.dependencies || name in owned.devDependencies,
)
// Refresh locked versions inside core's copied ranges, without selecting newer specs.
// This also drops obsolete required peers after upstream package releases.
if (shared.length > 0) run("update", ...shared)
run("install", "--ignore-scripts")
