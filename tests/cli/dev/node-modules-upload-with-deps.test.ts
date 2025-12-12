import { test, expect } from "bun:test"
import { DevServer } from "../../../cli/dev/DevServer"
import * as path from "node:path"
import * as fs from "node:fs"
import * as os from "node:os"
import ky from "ky"

test(
  "DevServer uploads dependencies of yalc/bun link packages",
  async () => {
    // Create a temporary directory for testing
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tsci-test-deps-"))

    try {
      // Create package.json with a yalc package that has npm dependencies
      fs.writeFileSync(
        path.join(tmpDir, "package.json"),
        JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          dependencies: {
            "my-local-lib": "file:.yalc/my-local-lib",
          },
        }),
      )

      // Create node_modules structure
      const nodeModulesDir = path.join(tmpDir, "node_modules")

      // Create the yalc-linked local package (my-local-lib)
      const localLibDir = path.join(nodeModulesDir, "my-local-lib")
      fs.mkdirSync(localLibDir, { recursive: true })

      fs.writeFileSync(
        path.join(localLibDir, "package.json"),
        JSON.stringify({
          name: "my-local-lib",
          version: "0.0.1-local",
          main: "index.js",
        }),
      )

      // my-local-lib imports is-even
      fs.writeFileSync(
        path.join(localLibDir, "index.js"),
        `const isEven = require('is-even');
module.exports = { checkEven: isEven };`,
      )

      // Create is-even package (dependency of my-local-lib)
      const isEvenDir = path.join(nodeModulesDir, "is-even")
      fs.mkdirSync(isEvenDir, { recursive: true })

      fs.writeFileSync(
        path.join(isEvenDir, "package.json"),
        JSON.stringify({
          name: "is-even",
          version: "1.0.0",
          main: "index.js",
        }),
      )

      fs.writeFileSync(
        path.join(isEvenDir, "index.js"),
        `module.exports = function isEven(n) { return n % 2 === 0; };`,
      )

      // Create a component that imports from the local package
      const componentPath = path.join(tmpDir, "component.tsx")
      fs.writeFileSync(
        componentPath,
        `import { checkEven } from "my-local-lib"

export default () => {
  console.log("Is 4 even?", checkEven(4));
  return <board width={10} height={10} />;
}`,
      )

      // Start the dev server
      const port = 8767 // Use a different port for testing
      const devServer = new DevServer({
        port,
        componentFilePath: componentPath,
        projectDir: tmpDir,
      })

      await devServer.start()

      // Wait a bit for files to upload
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Check if node_modules files were uploaded
      const fsKy = ky.create({ prefixUrl: `http://localhost:${port}` }) as any

      const fileListResponse = await fsKy.get("api/files/list").json()
      const fileList = fileListResponse.file_list as Array<{
        file_id: string
        file_path: string
      }>

      // Check that my-local-lib was uploaded (it's a local package)
      const localLibPackageJson = fileList.find((f) =>
        f.file_path.includes("node_modules/my-local-lib/package.json"),
      )
      expect(localLibPackageJson).toBeDefined()

      const localLibIndex = fileList.find((f) =>
        f.file_path.includes("node_modules/my-local-lib/index.js"),
      )
      expect(localLibIndex).toBeDefined()

      // Check that is-even was also uploaded (dependency of my-local-lib)
      const isEvenPackageJson = fileList.find((f) =>
        f.file_path.includes("node_modules/is-even/package.json"),
      )
      expect(isEvenPackageJson).toBeDefined()

      const isEvenIndex = fileList.find((f) =>
        f.file_path.includes("node_modules/is-even/index.js"),
      )
      expect(isEvenIndex).toBeDefined()

      // Check that React was NOT uploaded (runtime-provided package)
      const reactFiles = fileList.filter((f) =>
        f.file_path.includes("node_modules/react/"),
      )
      expect(reactFiles.length).toBe(0)

      await devServer.stop()
    } finally {
      // Cleanup
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  },
  { timeout: 10_000 },
)

test(
  "DevServer uploads npm dependencies even when they are not imported",
  async () => {
    // Create a temporary directory for testing
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "tsci-test-direct-deps-"),
    )

    try {
      // Create package.json with a regular npm dependency
      fs.writeFileSync(
        path.join(tmpDir, "package.json"),
        JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          dependencies: {
            "@tscircuit/mm": "^0.0.1",
          },
        }),
      )

      // Create node_modules with @tscircuit/mm
      const nodeModulesDir = path.join(tmpDir, "node_modules")
      const mmDir = path.join(nodeModulesDir, "@tscircuit", "mm")
      fs.mkdirSync(path.join(mmDir, "dist"), { recursive: true })

      fs.writeFileSync(
        path.join(mmDir, "package.json"),
        JSON.stringify({
          name: "@tscircuit/mm",
          version: "0.0.1",
          main: "dist/index.js",
        }),
      )

      fs.writeFileSync(
        path.join(mmDir, "dist", "index.js"),
        "module.exports = { demo: true }",
      )

      // Create a component that does NOT import @tscircuit/mm
      const componentPath = path.join(tmpDir, "component.tsx")
      fs.writeFileSync(
        componentPath,
        `export default () => <board width={10} height={10} />`,
      )

      // Start the dev server
      const port = 8768 // Use a different port for testing
      const devServer = new DevServer({
        port,
        componentFilePath: componentPath,
        projectDir: tmpDir,
      })

      await devServer.start()

      // Wait a bit for files to upload
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Check if node_modules files were uploaded
      const fsKy = ky.create({ prefixUrl: `http://localhost:${port}` }) as any

      const fileListResponse = await fsKy.get("api/files/list").json()
      const fileList = fileListResponse.file_list as Array<{
        file_id: string
        file_path: string
      }>

      // @tscircuit/mm should be uploaded even though it's not imported
      const mmPackageJson = fileList.find((f) =>
        f.file_path.includes("node_modules/@tscircuit/mm/package.json"),
      )
      expect(mmPackageJson).toBeDefined()

      const mmIndex = fileList.find((f) =>
        f.file_path.includes("node_modules/@tscircuit/mm/dist/index.js"),
      )
      expect(mmIndex).toBeDefined()

      await devServer.stop()
    } finally {
      // Cleanup
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  },
  { timeout: 10_000 },
)
