import fs from "node:fs/promises"
import path from "node:path"
import { getPlatformConfigWithCliDefaults } from "lib/shared/get-platform-config-with-cli-defaults"
import type { ImportedCadComponent } from "./add-cad-model-to-tsx"

export const downloadCadModelAssets = async ({
  cadComponent,
  componentDir,
  componentName,
  tsx,
}: {
  cadComponent?: ImportedCadComponent
  componentDir: string
  componentName: string
  tsx: string
}) => {
  const platformConfig = getPlatformConfigWithCliDefaults()
  const platformFetch = platformConfig.platformFetch ?? globalThis.fetch

  if (cadComponent?.model_step_url) {
    const stepFileName = `${componentName}.step`
    const stepResp = await platformFetch(cadComponent.model_step_url)
    await fs.writeFile(
      path.join(componentDir, stepFileName),
      Buffer.from(await stepResp.arrayBuffer()),
    )
    tsx = `import stepPath from "./${stepFileName}"\n` + tsx
    tsx = tsx.replace(`"${cadComponent.model_step_url}"`, "stepPath")
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
  }

  return tsx
}
