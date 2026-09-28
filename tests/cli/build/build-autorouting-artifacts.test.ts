import { expect, test } from "bun:test"
import fs from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuit = `export default () => (
  <board width={20} height={10} autorouter={{local: true}}>
    <resistor name="R1" resistance="1k" footprint="0402" pcbX={-4} />
    <resistor name="R2" resistance="1k" footprint="0402" pcbX={4} />
    <trace from="R1.1" to="R2.1" routingPhaseIndex={19} />
    <autoroutingphase phaseIndex={19} />
  </board>
)`

test("parallel builds automatically save separate importable artifacts for same-named entrypoints", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await fs.writeFile(path.join(tmpDir, "package.json"), "{}")
  await fs.mkdir(path.join(tmpDir, "node_modules"))
  await fs.symlink(
    path.resolve("node_modules/react"),
    path.join(tmpDir, "node_modules/react"),
    "dir",
  )
  for (const directory of ["first", "second"]) {
    await fs.mkdir(path.join(tmpDir, directory))
    await fs.writeFile(
      path.join(tmpDir, directory, "board.circuit.tsx"),
      circuit,
    )
  }
  const result = await runCommand("tsci build --concurrency 2")
  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain(
    "Saved autorouting paths to .tscircuit/autorouting-artifacts/",
  )
  const artifactDir = path.join(tmpDir, ".tscircuit/autorouting-artifacts")
  const entries = await fs.readdir(artifactDir)
  expect(entries).toHaveLength(2)
  for (const entry of entries) {
    const files = await fs.readdir(path.join(artifactDir, entry))
    expect(files).toHaveLength(1)
    expect(files[0]).toContain("phase-19-order-0")
    const paths = JSON.parse(
      await fs.readFile(path.join(artifactDir, entry, files[0]!), "utf8"),
    )
    expect(paths).toHaveLength(1)
    expect(Object.keys(paths[0]).sort()).toEqual(["connection", "route"])
    expect(paths[0].route[0].route_type).toBe("wire")
  }
  const firstFiles = await fs.readdir(path.join(artifactDir, entries[0]!))
  const savedFile = path
    .relative(tmpDir, path.join(artifactDir, entries[0]!, firstFiles[0]!))
    .split(path.sep)
    .join("/")
  await fs.writeFile(
    path.join(tmpDir, "replay.circuit.tsx"),
    `import savedPaths from "./${savedFile}"\n` +
      circuit.replace(
        "<autoroutingphase phaseIndex={19} />",
        "<autoroutingphase phaseIndex={19} pcbTracePaths={savedPaths} />",
      ),
  )
  const replay = await runCommand("tsci build replay.circuit.tsx")
  expect(replay.exitCode).toBe(0)
  expect(replay.stdout).toContain("Saved autorouting paths")
  expect(replay.stderr).not.toContain("Could not save autorouting paths")
}, 60_000)
