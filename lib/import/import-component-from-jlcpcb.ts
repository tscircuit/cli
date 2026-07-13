import { fetchEasyEDAComponent, convertRawEasyToTsx } from "easyeda/browser"
import {
  EasyEdaJsonSchema,
  normalizeManufacturerPartNumber,
  convertEasyEdaJsonToCircuitJson,
} from "easyeda"
import fs from "node:fs/promises"
import path from "node:path"
import { getPlatformConfigWithCliDefaults } from "lib/shared/get-platform-config-with-cli-defaults"
import {
  convertImportedFootprintToFootprinter,
  getEasyEdaFootprinterSourceHints,
  type ImportedFootprintConversion,
} from "./convert-imported-footprint-to-footprinter"

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

interface CadModelExpressions {
  objUrl?: string
  stepUrl?: string
}

interface ImportedCadComponent {
  model_obj_url?: string
  model_origin_position?: { x: number; y: number; z: number }
  model_step_url?: string
  rotation?: { z?: number }
}

const addCadModelToTsx = (
  tsx: string,
  cadModel: CadModelExpressions,
  cadComponent: ImportedCadComponent,
) => {
  if (tsx.includes("cadModel={{") || (!cadModel.objUrl && !cadModel.stepUrl)) {
    return tsx
  }

  const cadModelLines = [
    cadModel.objUrl ? `        objUrl: ${cadModel.objUrl},` : undefined,
    cadModel.stepUrl ? `        stepUrl: ${cadModel.stepUrl},` : undefined,
    `        pcbRotationOffset: ${cadComponent.rotation?.z ?? 0},`,
    cadComponent.model_origin_position
      ? `        modelOriginPosition: ${JSON.stringify(cadComponent.model_origin_position)},`
      : undefined,
  ]
    .filter(Boolean)
    .join("\n")

  const propsSpreadPattern = /^(\s*)\{\.\.\.(props|restProps)\}/m
  if (!propsSpreadPattern.test(tsx)) return tsx

  return tsx.replace(
    propsSpreadPattern,
    (_, indentation: string, propsName: string) =>
      `${indentation}cadModel={{\n${cadModelLines}\n${indentation}}}\n${indentation}{...${propsName}}`,
  )
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
    const platformConfig = getPlatformConfigWithCliDefaults()
    const platformFetch = platformConfig.platformFetch ?? globalThis.fetch
    const downloadedCadModel: CadModelExpressions = {}

    if (cadComponent?.model_step_url) {
      const stepFileName = `${componentName}.step`
      const stepResp = await platformFetch(cadComponent.model_step_url)
      await fs.writeFile(
        path.join(componentDir, stepFileName),
        Buffer.from(await stepResp.arrayBuffer()),
      )
      tsx = `import stepPath from "./${stepFileName}"\n` + tsx
      tsx = tsx.replace(`"${cadComponent.model_step_url}"`, "stepPath")
      downloadedCadModel.stepUrl = "stepPath"
    }

    if (cadComponent?.model_obj_url) {
      const objFileName = `${componentName}.obj`
      const objResp = await platformFetch(cadComponent.model_obj_url)
      await fs.writeFile(
        path.join(componentDir, objFileName),
        Buffer.from(await objResp.arrayBuffer()),
      )
      tsx = `import objPath from "./${objFileName}"\n` + tsx
      tsx = tsx.replace(`"${cadComponent.model_obj_url}"`, "objPath")
      downloadedCadModel.objUrl = "objPath"
    }

    if (cadComponent) {
      tsx = addCadModelToTsx(tsx, downloadedCadModel, cadComponent)
    }
  }

  const filePath = path.join(componentDir, `${componentName}.tsx`)
  await fs.writeFile(filePath, tsx)
  return { filePath, footprintConversion }
}
