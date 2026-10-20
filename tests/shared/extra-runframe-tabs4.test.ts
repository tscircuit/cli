import { expect, test } from "bun:test"
import { projectConfigSchema } from "lib/project-config/project-config-schema"

test("config rejects an unsafe or relative iframe URL: file:///tmp/viewer.html", () => {
  const iframeUrl = "file:///tmp/viewer.html"
  expect(
    projectConfigSchema.safeParse({
      extraRunFrameTabs: [{ tabName: "Sysconfig", iframeUrl }],
    }).success,
  ).toBeFalse()
})
