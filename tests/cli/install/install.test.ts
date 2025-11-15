import { expect, test } from "bun:test"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test(
  "tsci install creates package.json and npmrc file",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    const circuitDir = join(tmpDir, "circuits")

    await mkdir(circuitDir, { recursive: true })
    await writeFile(
      join(circuitDir, "index.circuit.tsx"),
      'import { PICO } from "@tsci/seveibar.PICO"\nexport default () => <board width={30} height={30}><PICO /> </board>\n',
    )

    const { stdout } = await runCommand("tsci install")

    expect(stdout).toContain("No package.json found. Generating a new one.")
    expect(stdout).toContain("Added 1 @tsci dependencies to package.json.")

    const packageJsonRaw = await Bun.file(join(tmpDir, "package.json")).text()
    const packageJson = JSON.parse(packageJsonRaw) as {
      dependencies?: Record<string, string>
    }

    expect(packageJson.dependencies?.["@tsci/seveibar.PICO"]).toBe("latest")

    const npmrcContent = await Bun.file(join(tmpDir, ".npmrc")).text()
    expect(npmrcContent).toContain("@tsci:registry=https://npm.tscircuit.com")
  },
  { timeout: 25_000 },
)
