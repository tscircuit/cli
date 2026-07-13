import { fetchEasyEDAComponent, convertRawEasyToTsx } from "easyeda/browser"
import {
  EasyEdaJsonSchema,
  normalizeManufacturerPartNumber,
  convertEasyEdaJsonToCircuitJson,
} from "easyeda"
import fs from "node:fs/promises"
import path from "node:path"
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

export interface ImportComponentFromJlcpcbOptions {
  download?: boolean
  useExactFootprint?: boolean
}

export interface ImportComponentFromJlcpcbResult {
  filePath: string
  footprintConversion:
    | ImportedFootprintConversion
    | {
        mode: "exact-requested"
        tsx: string
      }
}

export const importComponentFromJlcpcb = async (
  jlcpcbPartNumber: string,
  projectDir: string = process.cwd(),
  options: ImportComponentFromJlcpcbOptions = {},
): Promise<ImportComponentFromJlcpcbResult> => {
  const rawEasy = await fetchEasyEDAComponent(jlcpcbPartNumber)
  const betterEasy = EasyEdaJsonSchema.parse(rawEasy)

  const rawPn = betterEasy.dataStr.head.c_para["Manufacturer Part"]
  const componentName = rawPn
    ? normalizeManufacturerPartNumber(rawPn)
    : jlcpcbPartNumber

  let tsx = await convertRawEasyToTsx({ rawEasy })
  const circuitJson = convertEasyEdaJsonToCircuitJson(betterEasy, {
    useModelCdn: true,
  })
  const footprintConversion = options.useExactFootprint
    ? ({ mode: "exact-requested", tsx } as const)
    : convertImportedFootprintToFootprinter({
        circuitJson,
        sourceHints: getEasyEdaFootprinterSourceHints(rawEasy),
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
  return { filePath, footprintConversion }
}
