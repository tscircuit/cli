import { describe, it, expect, afterEach } from "bun:test"
import {
  writeFileSync,
  mkdirSync,
  existsSync,
  statSync,
  readdirSync,
  rmSync,
} from "node:fs"
import { join } from "node:path"

// Path to the script we're testing
const SCRIPT_PATH = join(
  import.meta.dir,
  "../../../scripts/check-for-dependencies.ts",
)

// Test directory for creating test files
const TEST_DIR = join(import.meta.dir, "test-temp")

// Helper to run the script
async function runScript(
  packageJson: any,
  sourceFiles: Record<string, string>,
) {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true })
  }

  mkdirSync(TEST_DIR, { recursive: true })

  // Create package.json
  const packageJsonPath = join(TEST_DIR, "package.json")
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))

  // Create source files
  for (const [filename, content] of Object.entries(sourceFiles)) {
    const filePath = join(TEST_DIR, filename)
    const dir = join(filePath, "..")
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    writeFileSync(filePath, content)
  }

  try {
    // Log the test directory structure for debugging
    console.log("Test directory structure:")
    const walkDir = (dir: string, indent = "") => {
      const files = readdirSync(dir)
      for (const file of files) {
        const fullPath = join(dir, file)
        const stat = statSync(fullPath)
        console.log(`${indent}${file}${stat.isDirectory() ? "/" : ""}`)
        if (stat.isDirectory()) {
          walkDir(fullPath, indent + "  ")
        }
      }
    }
    walkDir(TEST_DIR)

    // Run the script directly with Bun
    const proc = Bun.spawn(["bun", "run", SCRIPT_PATH], {
      cwd: TEST_DIR,
      stderr: "pipe",
      stdout: "pipe",
      env: { ...process.env, FORCE_COLOR: "0" },
    })

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ])

    const exitCode = await proc.exited

    console.log("Script output:")
    console.log("STDOUT:", stdout)
    console.log("STDERR:", stderr)
    console.log("Exit code:", exitCode)

    return {
      status: exitCode,
      stdout,
      stderr,
    }
  } catch (error: any) {
    console.error("Error running script:", error)
    return {
      status: 1,
      stdout: error.stdout?.toString() || "",
      stderr: error.stderr?.toString() || error.message,
      message: error.message,
    }
  }
}

describe("Dependency Checker", () => {
  afterEach(() => {
    // Clean up test files
    try {
      if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true, force: true })
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  })

  it("should pass when all required packages are in dependencies", async () => {
    const packageJson = {
      name: "test-package",
      dependencies: {
        "some-package": "^1.0.0",
      },
    }

    const sourceFiles = {
      "index.js": 'require("some-package")',
    }

    const result = await runScript(packageJson, sourceFiles)
    expect(result.status).toBe(0)
  })

  it("should fail when a required package is in devDependencies", async () => {
    const packageJson = {
      name: "test-package",
      dependencies: {},
      devDependencies: {
        "some-package": "^1.0.0",
      },
    }

    const sourceFiles = {
      "index.js": 'require("some-package")',
    }

    const result = await runScript(packageJson, sourceFiles)

    // The script should exit with status code 1
    expect(result.status).toBe(1)

    // Verify the error message
    expect(result.stderr).toContain(
      '❌ Error: "some-package" is in devDependencies but is required at runtime',
    )
    expect(result.stderr).toContain(
      '👉 Move "some-package" from devDependencies to dependencies in package.json',
    )
  })

  it("should fail when a required package is missing entirely", async () => {
    const packageJson = {
      name: "test-package",
      dependencies: {},
      devDependencies: {},
    }

    const sourceFiles = {
      "index.js": 'import "missing-package"',
    }

    const result = await runScript(packageJson, sourceFiles)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      '❌ Error: "missing-package" is required in source code but is missing from package.json.',
    )
    expect(result.stderr).toContain('👉 Add "missing-package" to dependencies.')
  })

  it("should check files in subdirectories", async () => {
    const packageJson = {
      name: "test-package",
      dependencies: {},
      devDependencies: {
        "another-package": "^2.0.0",
      },
    }

    const sourceFiles = {
      "src/utils/helper.js": 'require("another-package")',
    }

    const result = await runScript(packageJson, sourceFiles)

    // The script should exit with status code 1
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      '❌ Error: "another-package" is in devDependencies but is required at runtime',
    )
  })
})
