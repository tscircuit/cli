import fs from "node:fs"
import path from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToGltf } from "circuit-json-to-gltf"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSchematicSvg,
} from "circuit-to-svg"
import { renderGLTFToPNGBufferFromGLBBuffer } from "poppygl"
import { getCircuitJsonToGltfOptions } from "../../lib/shared/get-circuit-json-to-gltf-options"
import type { PcbSnapshotSettings } from "../../lib/project-config/project-config-schema"
import { convertModelUrlsToFileUrls } from "./convert-model-urls-to-file-urls"
import {
  normalizeToArrayBuffer,
  normalizeToUint8Array,
} from "./worker-binary-utils"
import type { BuildImageFormatSelection } from "./image-format-selection"
import { convertSvgToPngBuffer } from "./svg-to-png"

export const writeGlbFromCircuitJson = async (
  circuitJson: AnyCircuitElement[],
  glbOutputPath: string,
) => {
  const circuitJsonWithFileUrls = convertModelUrlsToFileUrls(circuitJson)
  const glbBuffer = await convertCircuitJsonToGltf(
    circuitJsonWithFileUrls,
    getCircuitJsonToGltfOptions({ format: "glb" }),
  )

  const glbData = normalizeToUint8Array(glbBuffer)
  fs.mkdirSync(path.dirname(glbOutputPath), { recursive: true })
  fs.writeFileSync(glbOutputPath, Buffer.from(glbData))
}

export const writeImageAssetsFromCircuitJson = async (
  circuitJson: AnyCircuitElement[],
  options: {
    outputDir: string
    imageFormats: BuildImageFormatSelection
    pcbSnapshotSettings?: PcbSnapshotSettings
  },
) => {
  const { outputDir, imageFormats, pcbSnapshotSettings } = options
  fs.mkdirSync(outputDir, { recursive: true })

  if (imageFormats.pcbSvgs) {
    const pcbSvg = convertCircuitJsonToPcbSvg(circuitJson, pcbSnapshotSettings)
    fs.writeFileSync(path.join(outputDir, "pcb.svg"), pcbSvg, "utf-8")
  }

  if (imageFormats.pcbPngs) {
    const pcbSvg = convertCircuitJsonToPcbSvg(circuitJson, pcbSnapshotSettings)
    fs.writeFileSync(
      path.join(outputDir, "pcb.png"),
      await convertSvgToPngBuffer(pcbSvg),
    )
  }

  if (imageFormats.schematicSvgs) {
    const schematicSvg = convertCircuitJsonToSchematicSvg(circuitJson)
    fs.writeFileSync(
      path.join(outputDir, "schematic.svg"),
      schematicSvg,
      "utf-8",
    )
  }

  if (imageFormats.threeDPngs) {
    const circuitJsonWithFileUrls = convertModelUrlsToFileUrls(circuitJson)
    const glbBuffer = await convertCircuitJsonToGltf(
      circuitJsonWithFileUrls,
      getCircuitJsonToGltfOptions({ format: "glb" }),
    )
    const glbArrayBuffer = await normalizeToArrayBuffer(glbBuffer)
    const pngBuffer = await renderGLTFToPNGBufferFromGLBBuffer(glbArrayBuffer)

    fs.writeFileSync(
      path.join(outputDir, "3d.png"),
      Buffer.from(normalizeToUint8Array(pngBuffer)),
    )
  }
}
