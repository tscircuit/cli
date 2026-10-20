import { expect, test } from "bun:test"
import { projectConfigSchema } from "lib/project-config/project-config-schema"

test("config rejects an unsafe or relative iframe URL: https://user:pass@example.com/", () => {
  const iframeUrl = "https://user:pass@example.com/"
  expect(
    projectConfigSchema.safeParse({
      extraRunFrameTabs: [{ tabName: "Sysconfig", iframeUrl }],
    }).success,
  ).toBeFalse()
})
