import { expect, test } from "bun:test"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const cases = [
  { name: "standalone default", standalone: "1", flags: "", install: false },
  {
    name: "standalone explicit install",
    standalone: "1",
    flags: "--install",
    install: true,
  },
  {
    name: "standalone explicit no-install",
    standalone: "1",
    flags: "--no-install",
    install: false,
  },
  { name: "standard default", standalone: "0", flags: "", install: true },
  {
    name: "standard explicit install",
    standalone: "0",
    flags: "--install",
    install: true,
  },
  {
    name: "standard explicit no-install",
    standalone: "0",
    flags: "--no-install",
    install: false,
  },
]

for (const { name, standalone, flags, install } of cases) {
  test(`init ${name}`, async () => {
    const { tmpDir, runCommand } = await getCliTestFixture({
      preload: new URL(
        "../../fixtures/init-package-manager-preload.ts",
        import.meta.url,
      ).pathname,
      skipSkillSetup: true,
      env: { TSCIRCUIT_STANDALONE: standalone },
    })
    const { stdout, stderr, exitCode } = await runCommand(
      `tsci init board --yes ${flags}`.trim(),
    )

    expect(exitCode).toBe(0)
    expect(stdout).toContain("Initialization complete!")
    expect(stderr).not.toContain("Failed to automatically install")
    const projectDir = join(tmpDir, "board")
    expect(await Bun.file(join(projectDir, "index.circuit.tsx")).exists()).toBe(
      true,
    )
    expect(await Bun.file(join(projectDir, "package.json")).exists()).toBe(true)
    const recordedInstall = Bun.file(
      join(projectDir, ".test-installed-dependencies.json"),
    )
    expect(await recordedInstall.exists()).toBe(install)
    if (install) {
      expect(await recordedInstall.json()).toEqual({
        deps: ["@types/react", "tscircuit"],
        cwd: projectDir,
        dev: true,
      })
      expect(stdout).toContain("Installing dependencies...")
    } else {
      expect(stdout).not.toContain("Installing dependencies...")
      expect(await Bun.file(join(projectDir, "bun.lock")).exists()).toBe(false)
    }
  }, 30_000)
}
