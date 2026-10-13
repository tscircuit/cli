import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

/** Runtime modules requested by RunFrame's optional import/export features. */
export const BUNDLED_BROWSER_MODULE_NAMES = [
  "circuit-json-to-bom-csv",
  "circuit-json-to-fdm-component-box",
  "circuit-json-to-gerber",
  "circuit-json-to-gltf",
  "circuit-json-to-kicad",
  "circuit-json-to-lbrn",
  "circuit-json-to-pnp-csv",
  "circuit-json-to-step",
  "circuit-to-svg",
  "kicad-to-circuit-json",
] as const

export type BundledBrowserModuleName =
  (typeof BUNDLED_BROWSER_MODULE_NAMES)[number]
export type BundledBrowserModuleManifest = Record<
  BundledBrowserModuleName,
  { version: string }
>

export const getBundledBrowserModulesDirectory = () => {
  let directory = path.dirname(fileURLToPath(import.meta.url))
  while (!fs.existsSync(path.join(directory, "package.json"))) {
    const parent = path.dirname(directory)
    if (parent === directory) {
      throw new Error("Could not locate the CLI's bundled browser modules")
    }
    directory = parent
  }
  return path.join(directory, "dist", "jscdn")
}

export const copyBundledBrowserModules = (
  outputDirectory: string,
  sourceDirectory = getBundledBrowserModulesDirectory(),
) => {
  if (!fs.existsSync(path.join(sourceDirectory, "manifest.json"))) {
    throw new Error(
      "Bundled browser modules are missing. Run `bun run build` in the CLI repository first.",
    )
  }
  const destination = path.join(outputDirectory, "jscdn")
  if (path.resolve(sourceDirectory) === path.resolve(destination)) return
  fs.rmSync(destination, { recursive: true, force: true })
  fs.cpSync(sourceDirectory, destination, {
    recursive: true,
  })
}
