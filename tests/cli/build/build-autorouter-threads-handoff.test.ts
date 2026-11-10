import { expect, test } from "bun:test"
import { mkdir, readFile, symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("parallel build forwards the solver worker override to each circuit", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const projectRuntime = path.join(tmpDir, "node_modules", "tscircuit")
  await mkdir(projectRuntime, { recursive: true })
  await symlink(
    path.dirname(require.resolve("react/package.json")),
    path.join(tmpDir, "node_modules", "react"),
    "dir",
  )
  await writeFile(
    path.join(projectRuntime, "package.json"),
    JSON.stringify({
      name: "tscircuit",
      type: "module",
      exports: "./index.mjs",
    }),
  )
  // Observe the platform received by the project's real RootCircuit in each build worker.
  await writeFile(
    path.join(projectRuntime, "index.mjs"),
    `
    import {appendFileSync} from "node:fs"
    import {RootCircuit as RuntimeCircuit} from ${JSON.stringify(import.meta.resolve("tscircuit"))}
    export class RootCircuit extends RuntimeCircuit {
      constructor(options) {
        super(options)
        appendFileSync(${JSON.stringify(path.join(tmpDir, "worker-counts.txt"))}, String(this.platform.autorouterThreads) + "\\n")
      }
    }`,
  )
  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({ platformConfig: { autorouterThreads: 1 } }),
  )
  for (const name of ["first", "second", "third"]) {
    await writeFile(
      path.join(tmpDir, name + ".circuit.tsx"),
      "export default () => <board width={8} height={8} routingDisabled />",
    )
  }
  const result = await runCommand(
    "tsci build --autorouter-threads 2 --concurrency 3",
  )
  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain("Building 3 file(s) with concurrency 3")
  expect(
    (await readFile(path.join(tmpDir, "worker-counts.txt"), "utf8"))
      .trim()
      .split("\n"),
  ).toEqual(["2", "2", "2"])
}, 120_000)
