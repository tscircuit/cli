import { expect, test } from "bun:test"
import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

async function prepareProject(projectDir: string) {
  for (const skillPath of [
    ".claude/skills/tscircuit",
    ".agents/skills/tscircuit",
  ]) {
    const directory = join(projectDir, skillPath)
    await mkdir(directory, { recursive: true })
    await Bun.write(join(directory, "SKILL.md"), "# Test skill fixture\n")
  }
}

test("init points package main at the circuit file it creates", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const projectDir = join(tmpDir, "my-board")
  await prepareProject(projectDir)

  const { exitCode } = await runCommand("tsci init -y --no-install my-board")
  expect(exitCode).toBe(0)

  const pkg = await Bun.file(join(projectDir, "package.json")).json()
  expect(pkg.main).toBe("index.circuit.tsx")
  expect(await Bun.file(join(projectDir, pkg.main)).exists()).toBeTrue()
  expect(await Bun.file(join(projectDir, "index.tsx")).exists()).toBeFalse()
  expect(await Bun.file(join(projectDir, "node_modules")).exists()).toBeFalse()
}, 30_000)

test("init preserves an existing package's custom main", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const projectDir = join(tmpDir, "existing-board")
  await prepareProject(projectDir)
  const circuit = "export default () => <board />\n"
  await Bun.write(join(projectDir, "custom-entry.tsx"), circuit)
  await Bun.write(
    join(projectDir, "package.json"),
    JSON.stringify({ name: "existing-board", main: "custom-entry.tsx" }),
  )

  const { exitCode } = await runCommand(
    "tsci init -y --no-install existing-board",
  )
  expect(exitCode).toBe(0)

  const pkg = await Bun.file(join(projectDir, "package.json")).json()
  expect(pkg.main).toBe("custom-entry.tsx")
  expect(await Bun.file(join(projectDir, pkg.main)).text()).toBe(circuit)
}, 30_000)
