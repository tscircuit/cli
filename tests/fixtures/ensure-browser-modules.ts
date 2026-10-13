import fs from "node:fs"
import path from "node:path"
import { getBundledBrowserModulesDirectory } from "lib/shared/bundled-browser-modules"
import { buildBundledBrowserModules } from "../../scripts/build-bundled-browser-modules"

let building: Promise<void> | undefined

/** Source-checkout tests need the same assets shipped by the package build. */
export const ensureBrowserModules = async () => {
  const directory = getBundledBrowserModulesDirectory()
  if (fs.existsSync(path.join(directory, "manifest.json"))) return
  building ??= buildBundledBrowserModules(directory)
  await building
}
