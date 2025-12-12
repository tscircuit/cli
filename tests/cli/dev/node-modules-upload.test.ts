import { test, expect } from "bun:test"
import { DevServer } from "../../../cli/dev/DevServer"
import * as path from "node:path"
import * as fs from "node:fs"
import * as os from "node:os"
import ky from "ky"

test(
  "DevServer does NOT upload regular npm packages from node_modules",
  async () => {
    // Create a temporary directory for testing
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tsci-test-"))

    try {
      // Create a simple package.json with a regular npm package (no file: or .yalc)
      fs.writeFileSync(
        path.join(tmpDir, "package.json"),
        JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          dependencies: {
            react: "^18.0.0",
          },
        }),
      )

      // Create node_modules with a minimal react package
      const nodeModulesDir = path.join(tmpDir, "node_modules")
      const reactDir = path.join(nodeModulesDir, "react")
      fs.mkdirSync(reactDir, { recursive: true })

      fs.writeFileSync(
        path.join(reactDir, "package.json"),
        JSON.stringify({
          name: "react",
          version: "18.0.0",
          main: "index.js",
        }),
      )

      fs.writeFileSync(
        path.join(reactDir, "index.js"),
        "module.exports = { createElement: () => {} }",
      )

      // Create a component that imports from node_modules
      const componentPath = path.join(tmpDir, "component.tsx")
      fs.writeFileSync(
        componentPath,
        `import React from "react"\n\nexport default () => <board width={10} height={10} />`,
      )

      // Start the dev server
      const port = 8765 // Use a different port for testing
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

      // Check that react package.json was NOT uploaded (since it's not a local package)
      const reactPackageJson = fileList.find((f) =>
        f.file_path.includes("node_modules/react/package.json"),
      )
      expect(reactPackageJson).toBeUndefined()

      // Check that react index.js was NOT uploaded
      const reactIndex = fileList.find((f) =>
        f.file_path.includes("node_modules/react/index.js"),
      )
      expect(reactIndex).toBeUndefined()

      await devServer.stop()
    } finally {
      // Cleanup
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  },
  { timeout: 10_000 },
)

test(
  "DevServer uploads yalc packages from node_modules",
  async () => {
    // Create a temporary directory for testing
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tsci-test-yalc-"))

    try {
      // Create a simple package.json
      fs.writeFileSync(
        path.join(tmpDir, "package.json"),
        JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          dependencies: {
            "@tscircuit/test": "file:.yalc/@tscircuit/test",
          },
        }),
      )

      // Simulate yalc installing a package to node_modules
      const nodeModulesDir = path.join(tmpDir, "node_modules")
      const tscircuitDir = path.join(nodeModulesDir, "@tscircuit")
      const testDir = path.join(tscircuitDir, "test")
      fs.mkdirSync(testDir, { recursive: true })

      fs.writeFileSync(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "@tscircuit/test",
          version: "0.0.1-local",
          main: "index.js",
        }),
      )

      fs.writeFileSync(
        path.join(testDir, "index.js"),
        "module.exports = { createBoard: () => {} }",
      )

      // Create a component that imports from the yalc package
      const componentPath = path.join(tmpDir, "component.tsx")
      fs.writeFileSync(
        componentPath,
        `import { createBoard } from "@tscircuit/test"\n\nexport default createBoard`,
      )

      // Start the dev server
      const port = 8766 // Use a different port for testing
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

      // Check that @tscircuit/test package.json was uploaded
      const testPackageJson = fileList.find((f) =>
        f.file_path.includes("node_modules/@tscircuit/test/package.json"),
      )
      expect(testPackageJson).toBeDefined()

      // Check that @tscircuit/test index.js was uploaded
      const testIndex = fileList.find((f) =>
        f.file_path.includes("node_modules/@tscircuit/test/index.js"),
      )
      expect(testIndex).toBeDefined()

      await devServer.stop()
    } finally {
      // Cleanup
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  },
  { timeout: 10_000 },
)
