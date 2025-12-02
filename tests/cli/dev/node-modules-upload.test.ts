import { test, expect } from "bun:test"
import { DevServer } from "../../../cli/dev/DevServer"
import * as path from "node:path"
import * as fs from "node:fs"
import * as os from "node:os"
import ky from "ky"

test(
  "DevServer does NOT upload runtime-provided packages from node_modules",
  async () => {
    // Create a temporary directory for testing
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tsci-test-"))

    try {
      // Create a simple package.json with a runtime-provided package (react)
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

      // Check that react package.json was NOT uploaded (since it's runtime-provided)
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
  "DevServer uploads regular npm packages from node_modules",
  async () => {
    // Create a temporary directory for testing
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tsci-test-npm-"))

    try {
      // Create a simple package.json with a regular npm package (not runtime-provided)
      fs.writeFileSync(
        path.join(tmpDir, "package.json"),
        JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          dependencies: {
            "test-package": "^1.0.0",
          },
        }),
      )

      // Create node_modules with a minimal test package
      const nodeModulesDir = path.join(tmpDir, "node_modules")
      const testPkgDir = path.join(nodeModulesDir, "test-package")
      fs.mkdirSync(testPkgDir, { recursive: true })

      fs.writeFileSync(
        path.join(testPkgDir, "package.json"),
        JSON.stringify({
          name: "test-package",
          version: "1.0.0",
          main: "index.js",
        }),
      )

      fs.writeFileSync(
        path.join(testPkgDir, "index.js"),
        "module.exports = { testFunction: () => {} }",
      )

      // Create a component that imports from the test package
      const componentPath = path.join(tmpDir, "component.tsx")
      fs.writeFileSync(
        componentPath,
        `import { testFunction } from "test-package"\n\nexport default () => <board width={10} height={10} />`,
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

      // Check that test-package package.json WAS uploaded
      const testPackageJson = fileList.find((f) =>
        f.file_path.includes("node_modules/test-package/package.json"),
      )
      expect(testPackageJson).toBeDefined()

      // Check that test-package index.js WAS uploaded
      const testIndex = fileList.find((f) =>
        f.file_path.includes("node_modules/test-package/index.js"),
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

test(
  "DevServer uploads symlinked (link:) packages from node_modules",
  async () => {
    // Create a temporary directory for testing
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tsci-test-link-"))

    try {
      // Create a separate directory to simulate an external linked package
      const externalPkgDir = path.join(
        tmpDir,
        "external-packages",
        "my-linked-package",
      )
      fs.mkdirSync(externalPkgDir, { recursive: true })

      fs.writeFileSync(
        path.join(externalPkgDir, "package.json"),
        JSON.stringify({
          name: "my-linked-package",
          version: "1.0.0",
          main: "index.js",
        }),
      )

      fs.writeFileSync(
        path.join(externalPkgDir, "index.js"),
        "module.exports = { linkedFunction: () => {} }",
      )

      // Create project with a link: dependency
      const projectDir = path.join(tmpDir, "project")
      fs.mkdirSync(projectDir, { recursive: true })

      fs.writeFileSync(
        path.join(projectDir, "package.json"),
        JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          dependencies: {
            "my-linked-package": "link:../external-packages/my-linked-package",
          },
        }),
      )

      // Create node_modules with a symlink to the external package
      const nodeModulesDir = path.join(projectDir, "node_modules")
      fs.mkdirSync(nodeModulesDir, { recursive: true })

      // Create symlink in node_modules pointing to external package
      fs.symlinkSync(
        externalPkgDir,
        path.join(nodeModulesDir, "my-linked-package"),
        "dir",
      )

      // Create a component that imports from the linked package
      const componentPath = path.join(projectDir, "component.tsx")
      fs.writeFileSync(
        componentPath,
        `import { linkedFunction } from "my-linked-package"\n\nexport default () => <board width={10} height={10} />`,
      )

      // Start the dev server
      const port = 8766 // Use a different port for testing
      const devServer = new DevServer({
        port,
        componentFilePath: componentPath,
        projectDir: projectDir,
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

      // Check that my-linked-package package.json was uploaded
      const pkgPackageJson = fileList.find((f) =>
        f.file_path.includes("my-linked-package/package.json"),
      )
      expect(pkgPackageJson).toBeDefined()

      // Check that my-linked-package index.js was uploaded
      const pkgIndex = fileList.find((f) =>
        f.file_path.includes("my-linked-package/index.js"),
      )
      expect(pkgIndex).toBeDefined()

      await devServer.stop()
    } finally {
      // Cleanup
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  },
  { timeout: 10_000 },
)
