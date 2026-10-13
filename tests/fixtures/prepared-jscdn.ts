import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

export const preparedJscdnFiles = {
  "circuit-json-to-step/latest/+esm":
    'export { value } from "../../_modules/shared.js";\n',
  "_modules/shared.js": "export const value = 42;\n",
  "@tscircuit/example/0.1.0/dist/browser.js": "export const scoped = true;\n",
  "wasm/model.wasm": new Uint8Array([0, 97, 115, 109]),
}

export const writePreparedJscdn = async (directory: string) => {
  for (const [file, content] of Object.entries(preparedJscdnFiles)) {
    const destination = path.join(directory, file)
    await mkdir(path.dirname(destination), { recursive: true })
    await writeFile(destination, content)
  }
}
