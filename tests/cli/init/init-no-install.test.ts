import { expect, test } from "bun:test"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("init --no-install creates project without installing dependencies", async () => {
  const { runCommand } = await getCliTestFixture({ skipSkillSetup: true })

  const projectDir = "test-project"
  const { stdout } = await runCommand(`tsci init ${projectDir} -y --no-install`)
  expect(stdout).not.toContain("Installing dependencies")
}, 30_000)

test("init installs dependencies by default", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    skipSkillSetup: true,
    preload: new URL(
      "../../fixtures/init-package-manager-preload.ts",
      import.meta.url,
    ).pathname,
  })

  const projectDir = "test-project"
  const { stdout } = await runCommand(`tsci init ${projectDir} -y`)
  expect(stdout).toContain("Installing dependencies")
  expect(
    await Bun.file(
      join(tmpDir, projectDir, ".test-installed-dependencies.json"),
    ).json(),
  ).toEqual({
    deps: ["@types/react", "tscircuit"],
    cwd: join(tmpDir, projectDir),
    dev: true,
  })
}, 30_000)

test("init output uses relative paths for created files", async () => {
  const { runCommand } = await getCliTestFixture({ skipSkillSetup: true })

  const projectDir = "relative-path-project"
  const { stdout } = await runCommand(`tsci init ${projectDir} -y --no-install`)

  expect(stdout).toContain(`Created: ${projectDir}/index.circuit.tsx`)
  expect(stdout).toContain(`Created: ${projectDir}/package.json`)
}, 30_000)

test("init installs tscircuit skills for both Claude and Codex", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    preload: new URL(
      "../../fixtures/skill-download-preload.ts",
      import.meta.url,
    ).pathname,
    env: { TSCI_SKIP_SKILL_SETUP: "false" },
  })

  const projectDir = "skills-project"
  const { exitCode, stderr } = await runCommand(
    `tsci init ${projectDir} -y --no-install`,
  )
  expect(exitCode).toBe(0)
  expect(stderr).not.toContain("Failed to set up tscircuit skill")

  const claudeSkillExists = await Bun.file(
    join(tmpDir, projectDir, ".claude/skills/tscircuit/SKILL.md"),
  ).exists()
  const codexSkillExists = await Bun.file(
    join(tmpDir, projectDir, ".agents/skills/tscircuit/SKILL.md"),
  ).exists()

  expect(claudeSkillExists).toBeTrue()
  expect(codexSkillExists).toBeTrue()
  const expectedSkill = await Bun.file(
    new URL("../../fixtures/assets/tscircuit-skill/SKILL.md", import.meta.url),
  ).text()
  for (const agent of [".claude", ".agents"]) {
    expect(
      await Bun.file(
        join(tmpDir, projectDir, agent, "skills/tscircuit/SKILL.md"),
      ).text(),
    ).toBe(expectedSkill)
  }
}, 30_000)
