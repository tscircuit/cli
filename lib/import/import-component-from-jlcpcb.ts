import { fetchEasyEDAComponent, convertRawEasyToTsx } from "easyeda/browser"
import {
  EasyEdaJsonSchema,
  normalizeManufacturerPartNumber,
  convertEasyEdaJsonToCircuitJson,
} from "easyeda"
import fs from "node:fs/promises"
import path from "node:path"

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

  const importsDir = path.join(projectDir, "imports")
  await fs.mkdir(importsDir, { recursive: true })

  if (options.download) {
    const circuitJson = convertEasyEdaJsonToCircuitJson(betterEasy, {
      useModelCdn: true,
    })
    const cadComponent = circuitJson.find(
      (item) => item.type === "cad_component",
    ) as { model_step_url?: string; model_obj_url?: string } | undefined

    if (cadComponent?.model_step_url) {
      const stepFileName = `${componentName}.step`
      const stepResp = await fetch(cadComponent.model_step_url)
      await fs.writeFile(
        path.join(importsDir, stepFileName),
        Buffer.from(await stepResp.arrayBuffer()),
      )
      tsx = tsx.replace(cadComponent.model_step_url, `./${stepFileName}`)
    }

    if (cadComponent?.model_obj_url) {
      const objFileName = `${componentName}.obj`
      const objResp = await fetch(cadComponent.model_obj_url)
      await fs.writeFile(
        path.join(importsDir, objFileName),
        Buffer.from(await objResp.arrayBuffer()),
      )
      tsx = tsx.replace(cadComponent.model_obj_url, `./${objFileName}`)
    }
  }

  const filePath = path.join(importsDir, `${componentName}.tsx`)
  await fs.writeFile(filePath, tsx)
  return { filePath }
}
