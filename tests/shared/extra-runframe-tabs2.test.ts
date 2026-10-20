import { expect, test } from "bun:test"
import { projectConfigSchema } from "lib/project-config/project-config-schema"

test("config rejects an unsafe or relative iframe URL: javascript:alert(1)", () => {
  const iframeUrl = "javascript:alert(1)"
  expect(
    projectConfigSchema.safeParse({
      extraRunFrameTabs: [{ tabName: "Sysconfig", iframeUrl }],
    }).success,
  ).toBeFalse()
})
