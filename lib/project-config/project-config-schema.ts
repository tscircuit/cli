import { z } from "zod"

export const projectConfigSchema = z.object({
  mainEntrypoint: z.string().optional(),
})

export type TscircuitProjectConfigInput = z.input<typeof projectConfigSchema>
export type TscircuitProjectConfig = z.infer<typeof projectConfigSchema>
