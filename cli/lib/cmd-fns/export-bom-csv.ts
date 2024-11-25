import fs from "fs/promises"
import kleur from "kleur"
import { z } from "zod"
import { exportBomCsvToBuffer } from "../export-fns/export-bom-csv"
import { AppContext } from "../util/app-context"

export const exportBomCsv = async (ctx: AppContext, args: any) => {
  const params = z
    .object({
      input: z.string(),
      export: z.string().optional(),
      outputfile: z.string().default("bom.csv"),
    })
    .refine((data) => data.input, {
      message: "'input' must be provided",
    })
    .parse(args)

  const bomCsvBuffer = await exportBomCsvToBuffer(
    {
      example_file_path: params.input!,
      export_name: params.export,
    },
    ctx,
  )

  console.log(kleur.gray(`[writing to ${params.outputfile}]...`))
  await fs.writeFile(params.outputfile, bomCsvBuffer)
  console.log(
    kleur.green(`Bill of Material CSV file exported to ${params.outputfile}`),
  )
}
