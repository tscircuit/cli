import { expect, test } from "bun:test"
import { DevServer } from "cli/dev/DevServer"
import getPort from "get-port"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"

test(
  "DevServer watches node_modules dist/index.js for changes",
  async () => {
    // Create a temporary directory for testing
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tsci-test-nm-watch-"))

    try {
      // Create package.json
      fs.writeFileSync(
        path.join(tmpDir, "package.json"),
        JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          dependencies: {
            "my-local-lib": "file:./my-local-lib",
          },
        }),
      )

      // Create the node_modules structure with a local package
      const nodeModulesDir = path.join(tmpDir, "node_modules")
      const myLibDir = path.join(nodeModulesDir, "my-local-lib")
      const distDir = path.join(myLibDir, "dist")
      fs.mkdirSync(distDir, { recursive: true })

      fs.writeFileSync(
        path.join(myLibDir, "package.json"),
        JSON.stringify({
          name: "my-local-lib",
          version: "1.0.0",
          main: "dist/index.js",
        }),
      )

      fs.writeFileSync(
        path.join(distDir, "index.js"),
        "module.exports = { version: 1 }",
      )

      // Create a component that imports from the local package
      const componentPath = path.join(tmpDir, "component.tsx")
      fs.writeFileSync(
        componentPath,
        `import { version } from "my-local-lib"\n\nexport default () => <board width={10} height={10} />`,
      )

      // Start the dev server
      const port = await getPort()
      const devServer = new DevServer({
        port,
        componentFilePath: componentPath,
        projectDir: tmpDir,
      })

      await devServer.start()

      // Wait a bit for initial upload
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Get the initial file content
      const fsKy = devServer.fsKy
      const initialResponse = await fsKy
        .get("api/files/get", {
          searchParams: {
            file_path: "node_modules/my-local-lib/dist/index.js",
          },
        })
        .json()

      expect((initialResponse as any).file?.text_content).toBe(
        "module.exports = { version: 1 }",
      )

      // Update the dist/index.js file (simulating a build)
      fs.writeFileSync(
        path.join(distDir, "index.js"),
        "module.exports = { version: 2 }",
      )

      // Wait for the watcher to pick up the change and upload
      // Chokidar can be slow to detect changes, especially in CI environments
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Check if the updated file was uploaded
      const updatedResponse = await fsKy
        .get("api/files/get", {
          searchParams: {
            file_path: "node_modules/my-local-lib/dist/index.js",
          },
        })
        .json()

      expect((updatedResponse as any).file?.text_content).toBe(
        "module.exports = { version: 2 }",
      )

      await devServer.stop()
    } finally {
      // Cleanup
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  },
  { timeout: 15_000 },
)

test(
  "DevServer watches scoped node_modules dist/index.js for changes",
  async () => {
    // Create a temporary directory for testing
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "tsci-test-nm-watch-scoped-"),
    )

    try {
      // Create package.json
      fs.writeFileSync(
        path.join(tmpDir, "package.json"),
        JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          dependencies: {
            "@my-scope/my-lib": "file:./.yalc/@my-scope/my-lib",
          },
        }),
      )

      // Create the node_modules structure with a scoped package
      const nodeModulesDir = path.join(tmpDir, "node_modules")
      const scopeDir = path.join(nodeModulesDir, "@my-scope")
      const myLibDir = path.join(scopeDir, "my-lib")
      const distDir = path.join(myLibDir, "dist")
      fs.mkdirSync(distDir, { recursive: true })

      fs.writeFileSync(
        path.join(myLibDir, "package.json"),
        JSON.stringify({
          name: "@my-scope/my-lib",
          version: "1.0.0",
          main: "dist/index.js",
        }),
      )

      fs.writeFileSync(
        path.join(distDir, "index.js"),
        "module.exports = { scopedVersion: 1 }",
      )

      // Create a component that imports from the scoped package
      const componentPath = path.join(tmpDir, "component.tsx")
      fs.writeFileSync(
        componentPath,
        `import { scopedVersion } from "@my-scope/my-lib"\n\nexport default () => <board width={10} height={10} />`,
      )

      // Start the dev server
      const port = await getPort()
      const devServer = new DevServer({
        port,
        componentFilePath: componentPath,
        projectDir: tmpDir,
      })

      await devServer.start()

      // Wait a bit for initial upload
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Get the initial file content
      const fsKy = devServer.fsKy
      const initialResponse = await fsKy
        .get("api/files/get", {
          searchParams: {
            file_path: "node_modules/@my-scope/my-lib/dist/index.js",
          },
        })
        .json()

      expect((initialResponse as any).file?.text_content).toBe(
        "module.exports = { scopedVersion: 1 }",
      )

      // Update the dist/index.js file (simulating a build)
      fs.writeFileSync(
        path.join(distDir, "index.js"),
        "module.exports = { scopedVersion: 2 }",
      )

      // Wait for the watcher to pick up the change and upload
      // Chokidar can be slow to detect changes, especially in CI environments
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Check if the updated file was uploaded
      const updatedResponse = await fsKy
        .get("api/files/get", {
          searchParams: {
            file_path: "node_modules/@my-scope/my-lib/dist/index.js",
          },
        })
        .json()

      expect((updatedResponse as any).file?.text_content).toBe(
        "module.exports = { scopedVersion: 2 }",
      )

      await devServer.stop()
    } finally {
      // Cleanup
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  },
  { timeout: 15_000 },
)
