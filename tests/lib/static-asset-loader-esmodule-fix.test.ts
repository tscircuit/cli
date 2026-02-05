import { test, expect, describe } from "bun:test"
import { mkdir, rm, cp } from "node:fs/promises"
import path from "node:path"
import { temporaryDirectory } from "tempy"

// Path to our bundled test fixture library (mimics rollup output)
const bundledFixturePath = path.resolve(
  process.cwd(),
  "tests/fixtures/step-import-library-bundled",
)

describe("static asset loader __esModule fix", () => {
  /**
   * This test verifies the actual register-static-asset-loaders.ts implementation
   * works correctly with the bundled fixture library.
   */
  test("actual implementation returns string with bundled fixture", async () => {
    const tmpDir = temporaryDirectory()

    try {
      // Copy the bundled fixture library to node_modules in temp dir
      const nodeModulesDir = path.join(tmpDir, "node_modules", "@test")
      await mkdir(nodeModulesDir, { recursive: true })
      await cp(
        bundledFixturePath,
        path.join(nodeModulesDir, "step-import-library-bundled"),
        { recursive: true },
      )

      const loaderPath = path.resolve(
        process.cwd(),
        "lib/shared/register-static-asset-loaders.ts",
      )

      const testCode = `
        const { registerStaticAssetLoaders } = await import('${loaderPath}');
        registerStaticAssetLoaders();

        const lib = await import('@test/step-import-library-bundled');
        const stepPath = lib.PartConfig.TestPart.stepPath;
        const directStepUrl = lib.directStepUrl;

        console.log(JSON.stringify({
          stepPathType: typeof stepPath,
          stepPathIsString: typeof stepPath === 'string',
          directStepUrlType: typeof directStepUrl,
          directStepUrlIsString: typeof directStepUrl === 'string',
          allStrings: typeof stepPath === 'string' && typeof directStepUrl === 'string',
        }));
      `

      const proc = Bun.spawn(["bun", "-e", testCode], {
        cwd: tmpDir,
        stdout: "pipe",
        stderr: "pipe",
      })

      const stdout = await new Response(proc.stdout).text()
      const stderr = await new Response(proc.stderr).text()
      const exitCode = await proc.exited

      if (exitCode !== 0) {
        console.log("stdout:", stdout)
        console.log("stderr:", stderr)
      }

      expect(exitCode).toBe(0)

      const result = JSON.parse(stdout.trim())
      console.log("Actual implementation result (bundled fixture):", result)

      // The implementation must return strings
      expect(result.stepPathType).toBe("string")
      expect(result.stepPathIsString).toBe(true)
      expect(result.directStepUrlType).toBe("string")
      expect(result.directStepUrlIsString).toBe(true)
      expect(result.allStrings).toBe(true)
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  })
})
