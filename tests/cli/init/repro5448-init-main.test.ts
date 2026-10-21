import { expect, test } from "bun:test"
import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("repro5448: init declares the circuit file it creates", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const projectDir = join(tmpDir, "my-board")

  // Keep unrelated skill downloads out of this entrypoint reproduction.
  for (const skillPath of [
    ".claude/skills/tscircuit",
    ".agents/skills/tscircuit",
  ]) {
    const skillDir = join(projectDir, skillPath)
    await mkdir(skillDir, { recursive: true })
    await Bun.write(join(skillDir, "SKILL.md"), "# Test skill fixture\n")
  }

  const { exitCode } = await runCommand("tsci init -y --no-install my-board")
  expect(exitCode).toBe(0)

  const packageJson = await Bun.file(join(projectDir, "package.json")).json()
  expect(typeof packageJson.main).toBe("string")
  expect(await Bun.file(join(projectDir, "index.circuit.tsx")).exists()).toBe(
    true,
  )

  expect({
    main: packageJson.main,
    mainExists: await Bun.file(join(projectDir, packageJson.main)).exists(),
  }).toEqual({ main: "index.circuit.tsx", mainExists: true })

  // Reinitializing an existing project must preserve its custom entrypoint.
  const customCircuit = "export default () => <board />\n"
  await Bun.write(join(projectDir, "custom.circuit.tsx"), customCircuit)
  await Bun.write(
    join(projectDir, "package.json"),
    JSON.stringify({ ...packageJson, main: "custom.circuit.tsx" }),
  )
  const reinit = await runCommand("tsci init -y --no-install my-board")
  expect(reinit.exitCode).toBe(0)
  const existingPackage = await Bun.file(
    join(projectDir, "package.json"),
  ).json()
  expect(existingPackage.main).toBe("custom.circuit.tsx")
  expect(await Bun.file(join(projectDir, existingPackage.main)).text()).toBe(
    customCircuit,
  )
}, 30_000)
