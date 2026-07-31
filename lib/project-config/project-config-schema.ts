import { z } from "zod"

export const pcbSnapshotSettingsSchema = z.object({
  showCourtyards: z.boolean().optional(),
  showPcbNotes: z.boolean().optional(),
  showFabricationNotes: z.boolean().optional(),
})

export const kicadPcmSettingsSchema = z.object({
  schemaVersion: z
    .union([z.literal("auto"), z.literal(1), z.literal(2)])
    .optional(),
  license: z.string().trim().min(1).optional(),
})

export type PcbSnapshotSettings = z.infer<typeof pcbSnapshotSettingsSchema>

export const projectConfigSchema = z.object({
  mainEntrypoint: z.string().optional(),
  libraryEntrypoint: z.string().optional(),
  previewComponentPath: z.string().optional(),
  siteDefaultComponentPath: z.string().optional(),
  ignoredFiles: z.array(z.string()).optional(),
  includeBoardFiles: z.array(z.string()).optional(),
  snapshotsDir: z.string().optional(),
  pcbSnapshotSettings: pcbSnapshotSettingsSchema.optional(),
  prebuildCommand: z.string().optional(),
  buildCommand: z.string().optional(),
  kicadProjectEntrypointPath: z.string().optional(),
  kicadLibraryEntrypointPath: z.string().optional(),
  kicadLibraryName: z.string().optional(),
  kicadPcm: kicadPcmSettingsSchema.optional(),
  alwaysUseLatestTscircuitOnCloud: z.boolean().optional(),
  build: z
    .object({
      circuitJson: z.boolean().optional(),
      kicadProject: z.boolean().optional(),
      kicadLibrary: z.boolean().optional(),
      kicadPcm: z.boolean().optional(),
      previewImages: z.boolean().optional(),
      glbs: z.boolean().optional(),
      step: z.boolean().optional(),
      workerTimeoutMs: z.number().int().positive().optional(),
      routingDisabled: z.boolean().optional(),
      typescriptLibrary: z.boolean().optional(),
    })
    .optional(),
})

export type TscircuitProjectConfigInput = z.input<typeof projectConfigSchema>
export type TscircuitProjectConfig = z.infer<typeof projectConfigSchema>
