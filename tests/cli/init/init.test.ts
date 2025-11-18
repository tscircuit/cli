import { expect, test } from "bun:test"
import { execSync } from "node:child_process"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("init command installs @types/react and passes type-checking", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const projectDir = "project-dir"
  const { stdout } = await runCommand(`tsci init ${projectDir}`)

  const pkgJsonPath = join(tmpDir, projectDir, "package.json")
  const pkgJson = await Bun.file(pkgJsonPath).json()

  expect(pkgJson).toMatchObject({
    name: expect.any(String),
    devDependencies: {
      tscircuit: expect.any(String),
      "@types/react": expect.any(String),
    },
  })

  const npmrcPath = join(tmpDir, projectDir, ".npmrc")
  const npmrcContent = await Bun.file(npmrcPath).text()
  expect(npmrcContent).toContain("@tsci:registry=https://npm.tscircuit.com")

  const tsconfigPath = join(tmpDir, projectDir, "tsconfig.json")
  const tsconfigExists = await Bun.file(tsconfigPath).exists()
  expect(tsconfigExists).toBeTrue()

  const tsconfig = await Bun.file(tsconfigPath).json()
  expect(tsconfig?.compilerOptions?.types).toEqual(
    expect.arrayContaining(["tscircuit"]),
  )

  try {
    const typeCheckResult = execSync("bunx tsc --noEmit", {
      cwd: join(tmpDir, projectDir),
      stdio: "inherit",
    })
  } catch (error) {
    console.log(` ${tmpDir}/${projectDir}`)
    throw new Error(
      `Type-checking failed for init'd project. ${tmpDir}/${projectDir} ${(error as any).toString()}`,
    )
  }
}, 30_000)
