import path from "node:path"
import { pathToFileURL } from "node:url"
import { z, type ZodType } from "zod"
import { referenceDesignName } from "@tscircuit/runframe-reference-designs/reference-designs"
import { importFromUserLand } from "lib/shared/importFromUserLand"
import { registerStaticAssetLoaders } from "lib/shared/register-static-asset-loaders"

import type { ReferenceDesignDefinition } from "lib/project-config/reference-design-definition"
export type { ReferenceDesignDefinition } from "lib/project-config/reference-design-definition"

const componentExportsSchema = z.object({
  propsSchema: z.custom<ZodType<Record<string, unknown>>>(
    (schema) =>
      typeof schema === "object" &&
      schema !== null &&
      "parse" in schema &&
      typeof schema.parse === "function",
    { message: "Export a Zod object as propsSchema" },
  ),
  presets: z
    .record(referenceDesignName, z.record(z.unknown()))
    .refine(
      (presets) => Object.keys(presets).length > 0,
      "Export at least one preset",
    ),
  presetLabels: z.record(referenceDesignName, z.string().min(1)).optional(),
})

export async function loadReferenceDesign(request: {
  definition: ReferenceDesignDefinition
  projectDir: string
}) {
  const { definition, projectDir } = request
  const componentPath = path.resolve(projectDir, definition.componentPath)
  const relativePath = path.relative(projectDir, componentPath)
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath))
    throw new Error("Reference design must be inside the project")
  const React = await importFromUserLand("react", projectDir)
  Object.assign(globalThis, { React })
  await registerStaticAssetLoaders(undefined, projectDir)
  return componentExportsSchema.parse(
    await import(pathToFileURL(componentPath).href),
  )
}
