import { join } from "node:path"
import { getPackageUpdatePlan } from "./update-package-plan"

const root = join(import.meta.dirname, "..")
const current = await Bun.file(join(root, "package.json")).json()
function run(...args: string[]) {
  const result = Bun.spawnSync([process.execPath, ...args], {
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
  })
  if (result.exitCode !== 0)
    throw new Error(`Dependency update failed: bun ${args.join(" ")}`)
}

const packages = getPackageUpdatePlan(
  current,
  process.argv[2] ?? "@tscircuit/runframe",
)
run("update", "--latest", ...packages)
// Copying core's specs runs last, so old converter dispatches cannot override them.
run("run", "update-core-dependencies")
