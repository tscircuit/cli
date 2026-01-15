const STATIC_ASSET_EXTENSIONS = [
  ".glb",
  ".gltf",
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".webp",
  ".gif",
  ".bmp",
  ".step",
  ".kicad_mod",
  ".kicad_pcb",
  ".kicad_pro",
  ".kicad_sch",
]

const staticAssetFilter = new RegExp(
  `(${STATIC_ASSET_EXTENSIONS.map((ext) => ext.replace(".", "\\.")).join(
    "|",
  )})$`,
  "i",
)

let registered = false

export const registerStaticAssetLoaders = () => {
  if (registered) return
  registered = true

  if (typeof Bun !== "undefined" && typeof Bun.plugin === "function") {
    Bun.plugin({
      name: "tsci-static-assets",
      setup(build) {
        build.onLoad({ filter: staticAssetFilter }, (args) => {
          return {
            contents: `export default ${JSON.stringify(args.path)};`,
            loader: "js",
          }
        })
      },
    })
  }
}
