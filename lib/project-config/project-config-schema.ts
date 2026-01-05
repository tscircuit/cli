import { z } from "zod"

export const projectConfigSchema = z.object({
  mainEntrypoint: z.string().optional(),
  previewComponentPath: z.string().optional(),
  ignoredFiles: z.array(z.string()).optional(),
  includeBoardFiles: z.array(z.string()).optional(),
  snapshotsDir: z.string().optional(),
  build: z
    .object({
      circuitJson: z.boolean().optional(),
      kicadLibrary: z.boolean().optional(),
      previewImages: z.boolean().optional(),
      typescriptLibrary: z.boolean().optional(),
    })
    .optional(),
})

export type TscircuitProjectConfigInput = z.input<typeof projectConfigSchema>
export type TscircuitProjectConfig = z.infer<typeof projectConfigSchema>
