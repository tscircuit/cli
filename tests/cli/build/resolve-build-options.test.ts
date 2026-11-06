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

test("resolveBuildOptions applies disableSchematicRouting from build and root config", () => {
  const fromBuildConfig = resolveBuildOptions({
    projectConfig: {
      build: {
        disableSchematicRouting: true,
      },
    },
  })

  expect(fromBuildConfig.options.disableSchematicRouting).toBe(true)
  expect(fromBuildConfig.configAppliedOpts).toContain(
    "disable-schematic-routing",
  )

  const fromRootConfig = resolveBuildOptions({
    projectConfig: {
      schematicTraceRoutingDisabled: true,
    },
  })

  expect(fromRootConfig.options.disableSchematicRouting).toBe(true)
  expect(fromRootConfig.configAppliedOpts).toContain(
    "disable-schematic-routing",
  )
})

test("resolveBuildOptions gives CLI disableSchematicRouting precedence over config", () => {
  const { options, configAppliedOpts } = resolveBuildOptions({
    cliOptions: {
      disableSchematicRouting: false,
    },
    projectConfig: {
      build: {
        disableSchematicRouting: true,
      },
    },
  })

  expect(options.disableSchematicRouting).toBe(false)
  expect(configAppliedOpts).not.toContain("disable-schematic-routing")
})
