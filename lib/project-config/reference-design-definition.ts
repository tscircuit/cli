import { z } from "zod"
import {
  referenceDesignName,
  referenceDesignFilePath,
} from "@tscircuit/runframe-reference-designs/reference-designs"

export const referenceDesignDefinitionSchema = z.object({
  name: referenceDesignName,
  displayName: z.string().min(1),
  componentPath: referenceDesignFilePath,
  chipNames: z.array(z.string().trim().min(1)).min(1),
})

export type ReferenceDesignDefinition = z.infer<
  typeof referenceDesignDefinitionSchema
>
