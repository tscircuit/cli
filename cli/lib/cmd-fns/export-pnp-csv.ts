import { z } from "zod";
import { exportPnpCsvToBuffer } from "../export-fns/export-pnp-csv";
import { AppContext } from "../util/app-context";
import fs from "fs/promises"
import kleur from "kleur";

export const exportPnpCsv = async (ctx: AppContext, args: any) => {
  const params = z
    .object({
      file: z.string().optional(),
      input: z.string().optional(),
      export: z.string().optional(),
      outputfile: z.string().optional().default("pnp.csv"),
    })
    .refine((data) => data.file || data.input, {
      message: "Either 'file' or 'input' must be provided",
    })
    .parse(args)

  const inputFile = params.input || params.file

  const pnpCsvBuffer = await exportPnpCsvToBuffer(
    {
      example_file_path: inputFile!,
      export_name: params.export,
    },
    ctx,
  );
  console.log(kleur.gray(`[writing to ${params.outputfile}]...`))
  await fs.writeFile(params.outputfile, pnpCsvBuffer);
  console.log(kleur.green(`Pnp CSV file exported to ${params.outputfile}`))
}