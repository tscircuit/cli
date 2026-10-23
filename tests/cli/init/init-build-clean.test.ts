import { expect, test } from "bun:test"
import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

// Tracked separately in tscircuit/core
const TOLERATED_WARNING_TYPES = ["supplier_footprint_mismatch_warning"]

const stubSkills = async (projectDir: string) => {
  // Keep unrelated skill downloads out of this test.
  for (const skillPath of [
    ".claude/skills/tscircuit",
    ".agents/skills/tscircuit",
  ]) {
    const skillDir = join(projectDir, skillPath)
    await mkdir(skillDir, { recursive: true })
    await Bun.write(join(skillDir, "SKILL.md"), "# Test skill fixture\n")
  }
}

test("init template builds without warnings", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const projectDir = join(tmpDir, "clean-board")
  await stubSkills(projectDir)

  const init = await runCommand("tsci init -y --no-install clean-board")
  expect(init.exitCode).toBe(0)
  expect(init.stdout).toContain("cd clean-board && tsci dev")

  const build = await runCommand("tsci build clean-board/index.circuit.tsx")
  expect(build.exitCode).toBe(0)

  const circuitJson = await Bun.file(
    join(projectDir, "dist/index/circuit.json"),
  ).json()
  const warningTypes = circuitJson
    .filter((el: any) => el.type.endsWith("_warning"))
    .map((el: any) => el.warning_type ?? el.type)
    .filter((type: string) => !TOLERATED_WARNING_TYPES.includes(type))

  expect(warningTypes).toEqual([])
}, 60_000)

test("init in the current directory does not suggest cd", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await stubSkills(tmpDir)

  const { stdout } = await runCommand("tsci init . -y --no-install")
  expect(stdout).toContain("tsci dev")
  expect(stdout).not.toContain("cd .")
}, 30_000)
