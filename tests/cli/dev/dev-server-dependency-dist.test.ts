import { expect, test } from "bun:test"
import { DevServer } from "cli/dev/DevServer"
import getPort from "get-port"
import { join } from "node:path"
import { mkdir, writeFile } from "node:fs/promises"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

/**
 * This test reproduces a bug where files from node_modules dependencies
 * (specifically dist/* files) are not uploaded to the dev server's file server.
 *
 * When a project has a dependency like @tscircuit/mm, and the circuit imports
 * from that dependency, the transpiled dist files from node_modules should be
 * available on the file server for the browser runtime to resolve imports.
 */
test("dev server should upload node_modules dependency dist files to file server", async () => {
  const fixture = await getCliTestFixture()

  // Create a project that uses a dependency with dist files
  const projectDir = fixture.tmpDir

  // Create the main component that imports from the dependency
  await writeFile(
    join(projectDir, "index.tsx"),
    `
import { mm } from "@tscircuit/mm"

export const MyCircuit = () => (
  <board width="10mm" height="10mm">
    <resistor
      name="R1"
      resistance="10k"
      pcbX={mm("10mm")}
      pcbY={mm("10mm")}
    />
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
          "@tscircuit/mm": "1.0.0",
        },
      },
      null,
      2,
    ),
  )

  // Simulate a node_modules structure with @tscircuit/mm
  const mmDir = join(projectDir, "node_modules", "@tscircuit", "mm")
  const mmDistDir = join(mmDir, "dist")
  await mkdir(mmDistDir, { recursive: true })

  // Create package.json for @tscircuit/mm
  await writeFile(
    join(mmDir, "package.json"),
    JSON.stringify(
      {
        name: "@tscircuit/mm",
        version: "1.0.0",
        main: "./dist/index.js",
        module: "./dist/index.js",
        exports: {
          ".": {
            import: "./dist/index.js",
            require: "./dist/index.cjs",
            types: "./dist/index.d.ts",
          },
        },
      },
      null,
      2,
    ),
  )

  // Create dist/index.js with exported content
  await writeFile(
    join(mmDistDir, "index.js"),
    `
export const resistorFootprint = "0402";
export const capacitorFootprint = "0603";
export const mm = (value) => \`\${value}mm\`;
`,
  )

  // Create dist/index.d.ts
  await writeFile(
    join(mmDistDir, "index.d.ts"),
    `
export declare const resistorFootprint: string;
export declare const capacitorFootprint: string;
export declare const mm: (value: number) => string;
`,
  )

  // Also create a nested file to test deep imports
  await mkdir(join(mmDistDir, "footprints"), { recursive: true })
  await writeFile(
    join(mmDistDir, "footprints", "resistor.js"),
    `
export const resistor0402 = "0402";
export const resistor0603 = "0603";
`,
  )

  // Start the dev server
  const devServerPort = await getPort()
  const devServer = new DevServer({
    port: devServerPort,
    componentFilePath: join(projectDir, "index.tsx"),
  })

  try {
    await devServer.start()

    // Get the file list from the dev server
    const { file_list } = (await devServer.fsKy
      .get("api/files/list")
      .json()) as { file_list: Array<{ file_path: string }> }

    const filePaths = file_list.map((f) => f.file_path)

    // The dev server should have uploaded the dependency dist files
    // These assertions will FAIL - this is the bug reproduction
    expect(filePaths).toContain("node_modules/@tscircuit/mm/dist/index.js")
  } finally {
    await devServer.stop()
  }
}, 30_000)
