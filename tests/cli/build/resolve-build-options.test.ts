import { expect, test } from "bun:test"
import { resolveBuildOptions } from "cli/build/resolve-build-options"

test("resolveBuildOptions applies build.routingDisabled from config", () => {
  const { options, configAppliedOpts } = resolveBuildOptions({
    projectConfig: {
      build: {
        routingDisabled: true,
      },
    },
  })

  expect(options.routingDisabled).toBe(true)
  expect(configAppliedOpts).toContain("routing-disabled")
})

test("resolveBuildOptions gives CLI routingDisabled precedence over config", () => {
  const { options, configAppliedOpts } = resolveBuildOptions({
    cliOptions: {
      routingDisabled: false,
    },
    projectConfig: {
      build: {
        routingDisabled: true,
      },
    },
  })

  expect(options.routingDisabled).toBe(false)
  expect(configAppliedOpts).not.toContain("routing-disabled")
})
