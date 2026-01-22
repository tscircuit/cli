import type { z } from "zod"

import { projectConfigSchema } from "../lib/project-config/project-config-schema"
import schemaJson from "./tscircuit.config.schema.json"

/**
 * Ensure every property defined in the TypeScript config schema
 * is represented in the JSON schema.
 */
type Config = z.infer<typeof projectConfigSchema>
type ConfigKeys = keyof Config
type JsonSchemaKeys = keyof typeof schemaJson.properties

type MissingTopLevelKeys = Exclude<ConfigKeys, JsonSchemaKeys>
type AssertNoMissingTopLevelKeys = MissingTopLevelKeys extends never
  ? true
  : never

const _assertTopLevelKeys: AssertNoMissingTopLevelKeys = true

/**
 * Ensure nested build options stay in sync too.
 */
type ConfigBuildKeys = keyof NonNullable<Config["build"]>
type JsonBuildKeys = keyof typeof schemaJson.properties.build.properties

type MissingBuildKeys = Exclude<ConfigBuildKeys, JsonBuildKeys>
type AssertNoMissingBuildKeys = MissingBuildKeys extends never ? true : never

const _assertBuildKeys: AssertNoMissingBuildKeys = true

void [_assertTopLevelKeys, _assertBuildKeys]
