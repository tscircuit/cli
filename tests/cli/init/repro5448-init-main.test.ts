import { expect, test } from "bun:test"
import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("repro5448: init declares a main file that does not exist", async () => {
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

  // Characterize #5448 on main. A fix should update this to
  // { main: "index.circuit.tsx", mainExists: true }.
  expect({
    main: packageJson.main,
    mainExists: await Bun.file(join(projectDir, packageJson.main)).exists(),
  }).toEqual({ main: "index.tsx", mainExists: false })
}, 30_000)
