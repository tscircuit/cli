import { expect, test } from "bun:test"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../fixtures/get-cli-test-fixture"

/**
 * This test ensures GLB file imports are transpiled to relative paths,
 * not absolute paths. This prevents the error:
 *
 * "Node module imported but not in package.json C:\Users\...\model.glb"
 *
 * which occurs when absolute paths from the original developer's machine
 * are baked into the transpiled output.
 */
test("GLB imports should not contain absolute paths after transpilation", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const projectDir = path.join(tmpDir, "glb-project")

  await mkdir(path.join(projectDir, "src"), { recursive: true })
  await mkdir(path.join(projectDir, "assets"), { recursive: true })

  const tsconfig = {
    compilerOptions: {
      baseUrl: ".",
      jsx: "react-jsx",
      module: "esnext",
      target: "esnext",
      moduleResolution: "bundler",
      paths: {
        "@assets/*": ["assets/*"],
      },
    },
  }

  const packageJson = {
    name: "glb-test-project",
    version: "1.0.0",
    main: "./dist/index.js",
    dependencies: {
      react: "19.0.0",
    },
  }

  // Fake GLB file (minimal valid GLB header)
  const glbBytes = Buffer.from([0x67, 0x6c, 0x54, 0x46, 0x01, 0x00, 0x00, 0x00])

  await writeFile(
    path.join(projectDir, "tsconfig.json"),
    JSON.stringify(tsconfig, null, 2),
  )
  await writeFile(
    path.join(projectDir, "package.json"),
    JSON.stringify(packageJson, null, 2),
  )
  await writeFile(
    path.join(projectDir, "glb.d.ts"),
    `declare module "*.glb" {
  const url: string
  export default url
}
`,
  )
  await writeFile(path.join(projectDir, "assets", "model.glb"), glbBytes)
  await writeFile(
    path.join(projectDir, "src", "index.tsx"),
    `import modelUrl from "@assets/model.glb"

export const Board = () => (
  <board width="10mm" height="10mm">
    <chip
      name="U1"
      footprint="soic8"
      cadModel={<cadmodel modelUrl={modelUrl} />}
    />
  </board>
)

export default Board
`,
  )

  // Install dependencies
  const install = Bun.spawnSync(["bun", "install"], {
    cwd: projectDir,
    stdout: "pipe",
    stderr: "pipe",
  })
  expect(install.exitCode).toBe(0)

  // Transpile the project
  const entryPath = path.join(projectDir, "src", "index.tsx")
  const { stderr } = await runCommand(`tsci transpile ${entryPath}`)

  expect(stderr).not.toContain("Transpilation failed")

  // Read the transpiled output
  const esmPath = path.join(projectDir, "dist", "index.js")
  const esmContent = await readFile(esmPath, "utf-8")

  // Assert: GLB import should be relative, not absolute
  expect(esmContent).toContain("./assets/model-")
  expect(esmContent).toContain(".glb")

  // Assert: No Windows absolute paths (C:\, D:\, etc.)
  expect(esmContent).not.toMatch(/['"][A-Z]:\\/i)
  expect(esmContent).not.toMatch(/['"][A-Z]:\//i)

  // Assert: No Unix absolute paths from user directories
  expect(esmContent).not.toMatch(/['"]\/Users\//i)
  expect(esmContent).not.toMatch(/['"]\/home\//i)
  expect(esmContent).not.toMatch(/['"]\/tmp\//i)

  // Assert: The import statement specifically uses relative path
  const importMatch = esmContent.match(
    /import\s+\w+\s+from\s+['"]([^'"]+\.glb)['"]/i,
  )
  expect(importMatch).not.toBeNull()
  expect(importMatch![1]).toStartWith("./assets/")
}, 60_000)
