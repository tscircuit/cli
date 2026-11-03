import { createHash } from "node:crypto"
import { writeFile } from "node:fs/promises"
import JSZip from "jszip"
import type { DependencyBundleManifest } from "../../lib/shared/standalone-dependencies"

export async function createDependencyBundle(file: string, corrupt = false) {
  const zip = new JSZip()
  const starter = {
    tscircuit: "1.2.3",
    typescript: "5.9.3",
    "@types/react": "19.0.8",
  }
  const manifest: DependencyBundleManifest = {
    format: 1,
    starter,
    packages: starter,
    files: {},
    links: {},
  }
  for (const [name, version] of Object.entries(starter)) {
    const filename = `${name}/package.json`
    const bytes = Buffer.from(JSON.stringify({ name, version }))
    manifest.files[filename] = {
      sha256: createHash("sha256").update(bytes).digest("hex"),
    }
    zip.file(`node_modules/${filename}`, corrupt ? "corrupt" : bytes)
  }
  zip.file("manifest.json", JSON.stringify(manifest))
  await writeFile(file, await zip.generateAsync({ type: "nodebuffer" }))
  return manifest
}
