import kleur from "kleur"
import fs from "node:fs"
import path from "node:path"
import { getEntrypoint } from "lib/shared/get-entrypoint"

export const resolveMainComponentPath = async (
  projectDir: string,
  providedPath?: string,
) => {
  if (providedPath) {
    const absolutePath = path.isAbsolute(providedPath)
      ? providedPath
      : path.join(projectDir, providedPath)

    if (!fs.existsSync(absolutePath)) {
      console.error(
        kleur.red(
          `Main component path does not exist: ${path.relative(projectDir, absolutePath)}`,
        ),
      )
      return null
    }

    return absolutePath
  }

  const detectedEntrypoint = await getEntrypoint({
    projectDir,
    onError: (message) => console.error(message),
    onSuccess: (message) => console.log(message),
  })

  if (!detectedEntrypoint) {
    console.error(kleur.red("Could not determine a main component path."))
    return null
  }

  return detectedEntrypoint
}
