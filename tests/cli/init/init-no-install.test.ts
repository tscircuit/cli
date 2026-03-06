import { expect, test } from "bun:test"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("init --no-install creates project without installing dependencies", async () => {
  const { runCommand } = await getCliTestFixture()

  const projectDir = "test-project"
  const { stdout } = await runCommand(`tsci init ${projectDir} -y --no-install`)
  expect(stdout).not.toContain("Installing dependencies")
}, 30_000)

test("init --no-install creates project installing dependencies", async () => {
  const { runCommand } = await getCliTestFixture()

  const projectDir = "test-project"
  const { stdout } = await runCommand(`tsci init ${projectDir} -y`)
  expect(stdout).toContain("Installing dependencies")
}, 30_000)

test("init output uses relative paths for created files", async () => {
  const { runCommand } = await getCliTestFixture()

  const projectDir = "relative-path-project"
  const { stdout } = await runCommand(`tsci init ${projectDir} -y --no-install`)

  expect(stdout).toContain(`Created: ${projectDir}/index.circuit.tsx`)
  expect(stdout).toContain(`Created: ${projectDir}/package.json`)
}, 30_000)

test("init installs tscircuit skills for both Claude and Codex", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const projectDir = "skills-project"
  await runCommand(`tsci init ${projectDir} -y --no-install`)

  const claudeSkillExists = await Bun.file(
    join(tmpDir, projectDir, ".claude/skills/tscircuit/SKILL.md"),
  ).exists()
  const codexSkillExists = await Bun.file(
    join(tmpDir, projectDir, ".codex/skills/tscircuit/SKILL.md"),
  ).exists()

  expect(claudeSkillExists).toBeTrue()
  expect(codexSkillExists).toBeTrue()
}, 30_000)
