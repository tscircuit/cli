import { fetchEasyEDAComponent, convertRawEasyToTsx } from "easyeda/browser"
import {
  EasyEdaJsonSchema,
  normalizeManufacturerPartNumber,
  convertEasyEdaJsonToCircuitJson,
} from "easyeda"
import fs from "node:fs/promises"
import path from "node:path"
import { fetchDatasheetMetadata } from "./fetch-datasheet-pin-attributes"
import {
  addCadModelToTsx,
  type ImportedCadComponent,
} from "./add-cad-model-to-tsx"
import { downloadCadModelAssets } from "./download-cad-model-assets"
import {
  convertImportedFootprintToFootprinter,
  type ImportedFootprintConversion,
} from "./footprinter/convert-imported-footprint-to-footprinter"
import { getEasyEdaFootprinterSourceHints } from "./footprinter/get-easyeda-footprinter-source-hints"
import { getPlatformFetch } from "lib/shared/get-platform-fetch"
import {
  circuitJsonToFootprinter,
  type FootprinterDiscoveryCandidate,
} from "lib/shared/circuit-json-to-footprinter"
import { tsxHas3dModel } from "./tsx-has-3d-model"

export interface ImportComponentFromJlcpcbOptions {
  download?: boolean
  useExactFootprint?: boolean
  excludePinAttributes?: boolean
}

export interface ImportComponentFromJlcpcbResult {
  filePath: string
  footprintConversion:
    | ImportedFootprintConversion
    | {
        mode: "exact-requested"
        tsx: string
      }
  /** False when the imported component has neither a cadModel nor a footprinter footprint */
  has3dModel: boolean
  /** Closest footprinter match, usable as a `cadModel` string when `has3dModel` is false */
  closestFootprinter?: FootprinterDiscoveryCandidate
}

export const importComponentFromJlcpcb = async (
  jlcpcbPartNumber: string,
  projectDir: string = process.cwd(),
  options: ImportComponentFromJlcpcbOptions = {},
): Promise<ImportComponentFromJlcpcbResult> => {
  const rawEasy = await fetchEasyEDAComponent(jlcpcbPartNumber, {
    fetch: getPlatformFetch(),
  })
  const betterEasy = EasyEdaJsonSchema.parse(rawEasy)

  const rawPn = betterEasy.dataStr.head.c_para["Manufacturer Part"]
  const datasheetAttributesPromise = options.excludePinAttributes
    ? undefined
    : fetchDatasheetMetadata(rawPn)
  const componentName = rawPn
    ? normalizeManufacturerPartNumber(rawPn)
    : jlcpcbPartNumber

  const datasheetMetadata = await datasheetAttributesPromise
  const datasheetAttributes = datasheetMetadata?.pinAttributes
  const circuitJson = convertEasyEdaJsonToCircuitJson(betterEasy, {
    useModelCdn: true,
    pinAttributes: datasheetAttributes,
  })
  let tsx = await convertRawEasyToTsx({
    rawEasy,
    pinAttributes: datasheetAttributes,
    internallyConnectedPins: datasheetMetadata?.internallyConnectedPins,
  })
  const sourceHints = getEasyEdaFootprinterSourceHints(rawEasy)
  const footprintConversion = options.useExactFootprint
    ? ({ mode: "exact-requested", tsx } as const)
    : convertImportedFootprintToFootprinter({
        circuitJson,
        sourceHints,
        tsx,
      })
  tsx = footprintConversion.tsx

  const cadComponent = circuitJson.find(
    (item) => item.type === "cad_component",
  ) as ImportedCadComponent | undefined
  if (cadComponent) {
    tsx = addCadModelToTsx(
      tsx,
      {
        objUrl: cadComponent.model_obj_url
          ? JSON.stringify(cadComponent.model_obj_url)
          : undefined,
        stepUrl: cadComponent.model_step_url
          ? JSON.stringify(cadComponent.model_step_url)
          : undefined,
      },
      cadComponent,
    )
  }

  const componentDir = options.download
    ? path.join(projectDir, "imports", componentName)
    : path.join(projectDir, "imports")
  await fs.mkdir(componentDir, { recursive: true })

  if (options.download) {
    tsx = await downloadCadModelAssets({
      cadComponent,
      componentDir,
      componentName,
      tsx,
    })
  }

  const filePath = path.join(componentDir, `${componentName}.tsx`)
  await fs.writeFile(filePath, tsx)

  const has3dModel = tsxHas3dModel(tsx)
  let closestFootprinter: FootprinterDiscoveryCandidate | undefined
  if (!has3dModel) {
    if (footprintConversion.mode === "exact-requested") {
      try {
        closestFootprinter =
          circuitJsonToFootprinter(circuitJson, {
            maxCandidates: 5,
            sourceHints,
          }).best ?? undefined
      } catch {}
    } else {
      closestFootprinter = footprintConversion.candidate
    }
  }

  return { filePath, footprintConversion, has3dModel, closestFootprinter }
}
