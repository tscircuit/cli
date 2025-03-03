import { expect, test } from "bun:test"
import { execSync } from "node:child_process"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("init command installs @types/react and passes type-checking", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const { stdout } = await runCommand("tsci init")
  console.log(stdout)

  const pkgJsonPath = join(tmpDir, "package.json")
  const pkgJson = await Bun.file(pkgJsonPath).json()

  expect(pkgJson).toMatchInlineSnapshot(
    {
      name: expect.any(String),
      devDependencies: {
        "@tscircuit/core": expect.any(String),
        "@types/react": expect.any(String),
      },
    },
    `
{
  "description": "A TSCircuit project",
  "devDependencies": {
    "@tscircuit/core": Any<String>,
    "@types/react": Any<String>,
  },
  "keywords": [
    "tscircuit",
    "electronics",
  ],
  "main": "index.tsx",
  "name": Any<String>,
  "scripts": {
    "build": "tsci build",
    "dev": "tsci dev",
  },
  "version": "1.0.0",
}
`,
  )

  const npmrcPath = join(tmpDir, ".npmrc")
  const npmrcContent = await Bun.file(npmrcPath).text()
  expect(npmrcContent).toContain("@tsci:registry=https://npm.tscircuit.com")

  const tsconfigPath = join(tmpDir, "tsconfig.json")
  const tsconfigExists = await Bun.file(tsconfigPath).exists()
  expect(tsconfigExists).toBeTrue()

  try {
    const typeCheckResult = execSync("npx --yes tsc --noEmit", {
      cwd: tmpDir,
      stdio: "pipe",
    })
    console.log(typeCheckResult.toString())
  } catch (error) {
    throw new Error("Type-checking failed")
  }
}, 10_000)
