import { expect, test } from "bun:test"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import ky from "ky"
import { DevServer } from "../../../cli/dev/DevServer"

test("DevServer uploads node_modules/tscircuit/package.json but not tscircuit's code", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tsci-test-"))

  try {
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({
        name: "test-project",
        devDependencies: { tscircuit: "*" },
      }),
    )

    const tscircuitDir = path.join(tmpDir, "node_modules", "tscircuit")
    fs.mkdirSync(path.join(tscircuitDir, "dist"), { recursive: true })
    fs.writeFileSync(
      path.join(tscircuitDir, "package.json"),
      JSON.stringify({
        name: "tscircuit",
        main: "dist/index.js",
        dependencies: { "@tscircuit/ngspice-spice-engine": "^0.0.20" },
      }),
    )
    fs.writeFileSync(path.join(tscircuitDir, "dist", "index.js"), "")

    const componentPath = path.join(tmpDir, "index.circuit.tsx")
    fs.writeFileSync(
      componentPath,
      `export default () => <board width="10mm" height="10mm" />`,
    )

    const port = 8771
    const devServer = new DevServer({
      port,
      componentFilePath: componentPath,
      projectDir: tmpDir,
    })
    await devServer.start()

    const fsKy = ky.create({ prefixUrl: `http://localhost:${port}` }) as any
    const { file_list } = (await fsKy.get("api/files/list").json()) as {
      file_list: Array<{ file_path: string }>
    }
    const filePaths = file_list.map((f) => f.file_path)

    expect(filePaths).toContain("node_modules/tscircuit/package.json")
    expect(filePaths).not.toContain("node_modules/tscircuit/dist/index.js")

    await devServer.stop()
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}, 20_000)
