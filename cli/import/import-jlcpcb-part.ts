import kleur from "kleur"
import { importComponentFromJlcpcb } from "lib/import/import-component-from-jlcpcb"
import ora from "ora"
import { logFootprintConversion } from "./log-footprint-conversion"
import { logMissing3dModelWarning } from "./log-missing-3d-model-warning"

export const importJlcpcbPart = async ({
  download,
  partNumber,
  useExactFootprint,
  excludePinAttributes,
}: {
  download?: boolean
  partNumber: string
  useExactFootprint?: boolean
  excludePinAttributes?: boolean
}) => {
  const spinner = ora({
    text: `Importing "${partNumber}" from JLCPCB...`,
    stream: process.stdout,
  }).start()

  try {
    const { filePath, footprintConversion, has3dModel, closestFootprinter } =
      await importComponentFromJlcpcb(partNumber, process.cwd(), {
        download,
        useExactFootprint,
        excludePinAttributes,
      })
    spinner.succeed(kleur.green(`Imported ${filePath}`))
    logFootprintConversion(footprintConversion)
    if (!has3dModel) {
      logMissing3dModelWarning({ filePath, closestFootprinter })
    }
  } catch (error) {
    spinner.fail(kleur.red("Failed to import part"))
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
