import { expect, test } from "bun:test"
import { DevServer } from "../../../cli/dev/DevServer"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import getPort from "get-port"

/**
 * Reproduces a bug where the dev server uploads packages from node_modules
 * even when they are not listed in the project's dependencies. The presence
 * of a local/linked package triggers node_modules uploads, and an unrelated
 * package ("left-pad") gets sent to the file server even though it shouldn't.
 */
test(
  "DevServer uploads node_modules packages that are not project dependencies",
  async () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "tsci-test-unneeded-node-modules-"),
    )

    try {
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

      const nodeModulesDir = path.join(tmpDir, "node_modules")

      // Local/linked package to trigger the local package path
      const localLibDir = path.join(nodeModulesDir, "my-local-lib")
      fs.mkdirSync(localLibDir, { recursive: true })
      fs.writeFileSync(
        path.join(localLibDir, "package.json"),
        JSON.stringify({
          name: "my-local-lib",
          version: "0.0.1",
          main: "index.js",
        }),
      )
      fs.writeFileSync(
        path.join(localLibDir, "index.js"),
        "module.exports = {}",
      )

      // Package that is NOT in dependencies but exists in node_modules
      const leftPadDir = path.join(nodeModulesDir, "left-pad")
      fs.mkdirSync(leftPadDir, { recursive: true })
      fs.writeFileSync(
        path.join(leftPadDir, "package.json"),
        JSON.stringify({
          name: "left-pad",
          version: "1.0.0",
          main: "index.js",
        }),
      )
      fs.writeFileSync(
        path.join(leftPadDir, "index.js"),
        "module.exports = (s) => s",
      )

      const componentPath = path.join(tmpDir, "component.tsx")
      fs.writeFileSync(
        componentPath,
        `import "left-pad"
import "./local"

export default () => <board width={10} height={10} />`,
      )

      fs.writeFileSync(
        path.join(tmpDir, "local.ts"),
        "export const localValue = 1",
      )

      const port = await getPort()
      const devServer = new DevServer({
        port,
        componentFilePath: componentPath,
        projectDir: tmpDir,
      })

      await devServer.start()

      await new Promise((resolve) => setTimeout(resolve, 500))

      const fileListResponse = (await devServer.fsKy
        .get("api/files/list")
        .json()) as { file_list: Array<{ file_path: string }> }

      const uploadedPaths = fileListResponse.file_list.map(
        (file) => file.file_path,
      )

      // This assertion currently fails: left-pad should not be uploaded because
      // it's not declared in the project's dependencies, but it is present.
      expect(uploadedPaths).not.toContain("node_modules/left-pad/package.json")
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  },
  { timeout: 10_000 },
)
