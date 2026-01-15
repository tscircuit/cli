/**
 * Bun Plugin for Static Asset Imports
 *
 * This plugin intercepts imports of static asset files (like .glb, .step, .stp)
 * and returns the file path as a string export instead of trying to parse binary content.
 *
 * Usage:
 *   import { plugin } from 'bun'
 *   import { staticAssetPlugin } from './static-asset-loader'
 *   plugin(staticAssetPlugin)
 */

import { plugin, type BunPlugin } from "bun"

export const STATIC_ASSET_EXTENSIONS = [
  ".glb",
  ".gltf",
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".step",
  ".stp",
  ".stl",
  ".obj",
  ".kicad_mod",
  ".kicad_pcb",
  ".kicad_pro",
  ".kicad_sch",
]

export const staticAssetPlugin: BunPlugin = {
  name: "static-asset-loader",
  setup(build) {
    // Create a regex pattern that matches all static asset extensions
    const extensionPattern = STATIC_ASSET_EXTENSIONS.map((ext) =>
      ext.replace(".", "\\."),
    ).join("|")
    const filter = new RegExp(`(${extensionPattern})$`, "i")

    build.onLoad({ filter }, (args) => {
      // Return the file path as the default export
      // This matches the behavior of bundlers like webpack/esbuild file-loader
      return {
        contents: `export default ${JSON.stringify(args.path)};`,
        loader: "js",
      }
    })
  },
}

// Auto-register the plugin when this file is loaded as a preload script
plugin(staticAssetPlugin)
