import { z } from "zod"

export const projectConfigSchema = z.object({
  mainEntrypoint: z.string().optional(),
  ignoredFiles: z.array(z.string()).optional(),
  includeBoardFiles: z.array(z.string()).optional(),
})

export type TscircuitProjectConfigInput = z.input<typeof projectConfigSchema>
export type TscircuitProjectConfig = z.infer<typeof projectConfigSchema>
