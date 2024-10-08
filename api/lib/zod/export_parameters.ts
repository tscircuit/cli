import { z } from "zod"

export const export_parameters = z.object({
  should_export_gerber_zip: z.boolean().default(false),
  should_export_pnp_csv: z.boolean().default(false),
  should_export_bom_csv: z.boolean().default(false),
  should_export_soup_json: z.boolean().default(false),
  should_export_kicad_pcb: z.boolean().default(false),
  gerbers_zip_file_name: z
    .string()
    .nullable()
    .optional()
    .default("gerbers.zip"),
  pnp_csv_file_name: z.string().nullable().optional().default("pnp.csv"),
  bom_csv_file_name: z.string().nullable().optional().default("bom.csv"),
  soup_json_file_name: z.string().nullable().optional().default("soup.json"),
  kicad_pcb_file_name: z
    .string()
    .nullable()
    .optional()
    .default("output.kicad_pcb"),
})

export type ExportParametersInput = z.input<typeof export_parameters>
export type ExportParameters = z.infer<typeof export_parameters>
