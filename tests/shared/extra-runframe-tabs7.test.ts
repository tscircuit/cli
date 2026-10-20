import { expect, test } from "bun:test"
import { projectConfigSchema } from "lib/project-config/project-config-schema"
import { tabs } from "../fixtures/extra-runframe-tabs"

test("config rejects empty tab names and circuit paths", () => {
  for (const tab of [
    { ...tabs[0], tabName: "  " },
    { ...tabs[0], mainComponentPath: "  " },
  ]) {
    expect(
      projectConfigSchema.safeParse({ extraRunFrameTabs: [tab] }).success,
    ).toBeFalse()
  }
})
