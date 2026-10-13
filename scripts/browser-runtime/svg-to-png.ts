import { Resvg, initWasm } from "@resvg/resvg-wasm"
import tscircuitFont from "@tscircuit/alphabet/base64font"
// The build plugin embeds these bytes in the ESM bundle.
// @ts-ignore
import wasmBytes from "@resvg/resvg-wasm/index_bg.wasm?inline-bytes"

let initialized: Promise<void> | undefined

export const svgToPng = async (
  svgString: string,
  options: { background?: string; width?: number; height?: number } = {},
) => {
  initialized ??= initWasm(wasmBytes)
  await initialized
  const renderer = new Resvg(svgString, {
    background: options.background,
    font: {
      loadSystemFonts: false,
      fontBuffers: [
        Uint8Array.from(atob(tscircuitFont), (char) => char.charCodeAt(0)),
      ],
      defaultFontFamily: "TscircuitAlphabet",
      monospaceFamily: "TscircuitAlphabet",
      sansSerifFamily: "TscircuitAlphabet",
    },
    fitTo: options.width
      ? { mode: "width", value: options.width }
      : options.height
        ? { mode: "height", value: options.height }
        : undefined,
  })
  try {
    return renderer.render().asPng()
  } finally {
    renderer.free()
  }
}

export const svgToPngDataUrl = async (
  svgString: string,
  options?: Parameters<typeof svgToPng>[1],
) => {
  const png = await svgToPng(svgString, options)
  let binary = ""
  for (const byte of png) binary += String.fromCharCode(byte)
  return `data:image/png;base64,${btoa(binary)}`
}
