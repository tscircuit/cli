import { expect, test } from "bun:test"
import { projectConfigSchema } from "lib/project-config/project-config-schema"

test("config rejects an unsafe or relative iframe URL: data:text/html,hello", () => {
  const iframeUrl = "data:text/html,hello"
  expect(
    projectConfigSchema.safeParse({
      extraRunFrameTabs: [{ tabName: "Sysconfig", iframeUrl }],
    }).success,
  ).toBeFalse()
})
