import { expect, test } from "bun:test"
import { projectConfigSchema } from "lib/project-config/project-config-schema"
import { tabs } from "../fixtures/extra-runframe-tabs"
import schemaJson from "../../types/tscircuit.config.schema.json"

test("config preserves scoped and global iframe tabs", () => {
  expect(
    projectConfigSchema.parse({ extraRunFrameTabs: tabs }).extraRunFrameTabs,
  ).toEqual(tabs)
  expect(projectConfigSchema.parse({}).extraRunFrameTabs).toBeUndefined()
  expect(schemaJson.properties.extraRunFrameTabs.items.required).toEqual([
    "tabName",
    "iframeUrl",
  ])
})
