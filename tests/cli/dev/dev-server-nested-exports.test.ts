import { expect, test } from "bun:test"
import { DevServer } from "cli/dev/DevServer"
import getPort from "get-port"
import { join } from "node:path"
import { mkdir, writeFile } from "node:fs/promises"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

/**
 * This test reproduces a bug where packages with nested conditional exports
 * in their package.json would cause a TypeError when resolving dependencies.
 *
 * Many modern packages use nested exports like:
 * "exports": {
 *   ".": {
 *     "import": {
 *       "types": "./dist/esm/index.d.ts",
 *       "default": "./dist/esm/index.js"
 *     }
 *   }
 * }
 *
 * The old code would pass this object directly to path.join(), causing:
 * TypeError: The "paths[1]" property must be of type string, got object
 */
test("dev server should handle packages with nested conditional exports", async () => {
  const fixture = await getCliTestFixture()

  const projectDir = fixture.tmpDir

  // Create the main component
  await writeFile(
    join(projectDir, "index.tsx"),
    `
import { something } from "nested-exports-pkg"

export const MyCircuit = () => (
  <board width="10mm" height="10mm">
    <resistor name="R1" resistance="10k" />
  </board>
)
`,
  )

  // Create package.json with the dependency
  await writeFile(
    join(projectDir, "package.json"),
    JSON.stringify(
      {
        name: "test-project",
        version: "1.0.0",
        dependencies: {
          "nested-exports-pkg": "1.0.0",
        },
      },
      null,
      2,
    ),
  )

  // Simulate a node_modules structure with nested conditional exports
  // This mimics packages like lru-cache, signal-exit, glob, minimatch, etc.
  const pkgDir = join(projectDir, "node_modules", "nested-exports-pkg")
  const pkgDistDir = join(pkgDir, "dist", "esm")
  await mkdir(pkgDistDir, { recursive: true })

  // Create package.json with nested conditional exports (like lru-cache, glob, etc.)
  await writeFile(
    join(pkgDir, "package.json"),
    JSON.stringify(
      {
        name: "nested-exports-pkg",
        version: "1.0.0",
        // This structure is common in modern packages
        // exports["."].import is an OBJECT, not a string
        exports: {
          ".": {
            import: {
              types: "./dist/esm/index.d.ts",
              default: "./dist/esm/index.js",
            },
            require: {
              types: "./dist/cjs/index.d.ts",
              default: "./dist/cjs/index.js",
            },
          },
        },
      },
      null,
      2,
    ),
  )

  // Create the actual files
  await writeFile(
    join(pkgDistDir, "index.js"),
    `
export const something = "value";
`,
  )

  await writeFile(
    join(pkgDistDir, "index.d.ts"),
    `
export declare const something: string;
`,
  )

  // Start the dev server - this should NOT throw an error
  const devServerPort = await getPort()
  const devServer = new DevServer({
    port: devServerPort,
    componentFilePath: join(projectDir, "index.tsx"),
  })

  try {
    // The bug would cause this to throw:
    // TypeError: The "paths[1]" property must be of type string, got object
    await devServer.start()

    // Get the file list from the dev server
    const { file_list } = (await devServer.fsKy
      .get("api/files/list")
      .json()) as { file_list: Array<{ file_path: string }> }

    const filePaths = file_list.map((f) => f.file_path)

    // The dev server should have successfully resolved the nested exports
    // and uploaded the dependency files
    expect(filePaths).toContain(
      "node_modules/nested-exports-pkg/dist/esm/index.js",
    )
  } finally {
    await devServer.stop()
  }
}, 30_000)

/**
 * Test for double-nested exports like tslib has:
 * "exports": {
 *   ".": {
 *     "import": {
 *       "node": "./modules/index.js",
 *       "default": {
 *         "types": "./modules/index.d.ts",
 *         "default": "./tslib.es6.mjs"
 *       }
 *     }
 *   }
 * }
 */
test("dev server should handle double-nested conditional exports", async () => {
  const fixture = await getCliTestFixture()

  const projectDir = fixture.tmpDir

  // Create the main component
  await writeFile(
    join(projectDir, "index.tsx"),
    `
import { helper } from "double-nested-pkg"

export const MyCircuit = () => (
  <board width="10mm" height="10mm">
    <resistor name="R1" resistance="10k" />
  </board>
)
`,
  )

  // Create package.json with the dependency
  await writeFile(
    join(projectDir, "package.json"),
    JSON.stringify(
      {
        name: "test-project",
        version: "1.0.0",
        dependencies: {
          "double-nested-pkg": "1.0.0",
        },
      },
      null,
      2,
    ),
  )

  // Simulate a node_modules structure with double-nested exports (like tslib)
  const pkgDir = join(projectDir, "node_modules", "double-nested-pkg")
  await mkdir(pkgDir, { recursive: true })

  // Create package.json with double-nested conditional exports
  await writeFile(
    join(pkgDir, "package.json"),
    JSON.stringify(
      {
        name: "double-nested-pkg",
        version: "1.0.0",
        // This structure is used by tslib
        exports: {
          ".": {
            import: {
              node: "./modules/index.js",
              default: {
                types: "./modules/index.d.ts",
                default: "./lib.es6.mjs",
              },
            },
          },
        },
      },
      null,
      2,
    ),
  )

  // Create the actual file
  await writeFile(
    join(pkgDir, "lib.es6.mjs"),
    `
export const helper = () => "help";
`,
  )

  // Start the dev server - this should NOT throw an error
  const devServerPort = await getPort()
  const devServer = new DevServer({
    port: devServerPort,
    componentFilePath: join(projectDir, "index.tsx"),
  })

  try {
    // Should not throw even with double-nested exports
    await devServer.start()

    // Get the file list from the dev server
    const { file_list } = (await devServer.fsKy
      .get("api/files/list")
      .json()) as { file_list: Array<{ file_path: string }> }

    const filePaths = file_list.map((f) => f.file_path)

    // The dev server should have successfully resolved the double-nested exports
    expect(filePaths).toContain("node_modules/double-nested-pkg/lib.es6.mjs")
  } finally {
    await devServer.stop()
  }
}, 30_000)
