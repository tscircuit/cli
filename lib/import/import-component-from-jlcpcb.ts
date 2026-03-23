import { fetchEasyEDAComponent, convertRawEasyToTsx } from "easyeda/browser"
import {
  EasyEdaJsonSchema,
  normalizeManufacturerPartNumber,
  convertEasyEdaJsonToCircuitJson,
} from "easyeda"
import fs from "node:fs/promises"
import path from "node:path"
import { getCompletePlatformConfig } from "lib/shared/get-complete-platform-config"

export const importComponentFromJlcpcb = async (
  jlcpcbPartNumber: string,
  projectDir: string = process.cwd(),
  options: { download?: boolean } = {},
) => {
  const rawEasy = await fetchEasyEDAComponent(jlcpcbPartNumber)
  const betterEasy = EasyEdaJsonSchema.parse(rawEasy)

  const rawPn = betterEasy.dataStr.head.c_para["Manufacturer Part"]
  const componentName = rawPn
    ? normalizeManufacturerPartNumber(rawPn)
    : jlcpcbPartNumber

  let tsx = await convertRawEasyToTsx({ rawEasy })

  const componentDir = options.download
    ? path.join(projectDir, "imports", componentName)
    : path.join(projectDir, "imports")
  await fs.mkdir(componentDir, { recursive: true })

  if (options.download) {
    const platformConfig = getCompletePlatformConfig()
    const platformFetch = platformConfig.platformFetch ?? globalThis.fetch
    const circuitJson = convertEasyEdaJsonToCircuitJson(betterEasy, {
      useModelCdn: true,
    })
    const cadComponent = circuitJson.find(
      (item) => item.type === "cad_component",
    ) as { model_step_url?: string; model_obj_url?: string } | undefined

    if (cadComponent?.model_step_url) {
      const stepFileName = `${componentName}.step`
      const stepResp = await platformFetch(cadComponent.model_step_url)
      await fs.writeFile(
        path.join(componentDir, stepFileName),
        Buffer.from(await stepResp.arrayBuffer()),
      )
      tsx = tsx.replace(cadComponent.model_step_url, `./${stepFileName}`)
    }

    if (cadComponent?.model_obj_url) {
      const objFileName = `${componentName}.obj`
      const objResp = await platformFetch(cadComponent.model_obj_url)
      await fs.writeFile(
        path.join(componentDir, objFileName),
        Buffer.from(await objResp.arrayBuffer()),
      )
      tsx = tsx.replace(cadComponent.model_obj_url, `./${objFileName}`)
    }
  }

  const filePath = path.join(componentDir, `${componentName}.tsx`)
  await fs.writeFile(filePath, tsx)
  return { filePath }
}
