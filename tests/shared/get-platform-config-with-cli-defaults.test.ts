import { expect, test } from "bun:test"
import type { PlatformConfig } from "@tscircuit/props"
import { getPlatformConfigWithCliDefaults } from "lib/shared/get-platform-config-with-cli-defaults"
import { mergePlatformConfigs } from "lib/shared/platform-config-utils"

const withBunVersion = (version: string | undefined, run: () => void) => {
  const descriptor = Object.getOwnPropertyDescriptor(process.versions, "bun")
  Object.defineProperty(process.versions, "bun", {
    configurable: true,
    value: version,
  })
  try {
    run()
  } finally {
    if (descriptor) Object.defineProperty(process.versions, "bun", descriptor)
    else Reflect.deleteProperty(process.versions, "bun")
  }
}

test.each([
  [undefined, 4],
  ["1.3.11", 1],
  ["1.4.1", 1],
  ["1.4.2-canary.1", 1],
  ["1.4.2", 4],
  ["1.4.4", 4],
  ["invalid", 1],
] as const)(
  "CLI routing thread default for Bun %s is %i",
  (version, threads) => {
    withBunVersion(version, () => {
      expect(getPlatformConfigWithCliDefaults().autorouterThreads).toBe(threads)
    })
  },
)

test.each(["1.3.11", "1.4.4"])(
  "explicit thread overrides take precedence on Bun %s",
  (version) => {
    withBunVersion(version, () => {
      for (const autorouterThreads of [1, 2, 4]) {
        expect(
          getPlatformConfigWithCliDefaults({ autorouterThreads })
            .autorouterThreads,
        ).toBe(autorouterThreads)
      }
    })
  },
)

test("a pipeline-merged SPICE-only override preserves every default platform map", () => {
  const customSpiceEngine = {
    simulate: async () => ({ simulationResultCircuitJson: [] }),
  }

  const projectConfig = mergePlatformConfigs(
    { spiceEngineMap: { custom: customSpiceEngine } },
    undefined,
  )
  expect(projectConfig?.footprintLibraryMap).toEqual({})

  const platformConfig = getPlatformConfigWithCliDefaults(projectConfig)

  expect(typeof platformConfig.footprintLibraryMap?.kicad).toBe("function")
  expect(typeof platformConfig.footprintLibraryMap?.jlcpcb).toBe("function")
  expect(platformConfig.footprintFileParserMap?.kicad_mod).toBeDefined()
  expect(typeof platformConfig.staticFileLoaderMap?.kicad_pcb).toBe("function")
  expect(typeof platformConfig.staticFileLoaderMap?.kicad_sym).toBe("function")
  expect(platformConfig.autorouterMap?.krt).toBeDefined()
  expect(platformConfig.spiceEngineMap?.ngspice).toBeDefined()
  expect(platformConfig.spiceEngineMap?.custom).toBe(customSpiceEngine)
})

test("custom platform map entries merge with defaults and override matching keys", () => {
  const footprintOverride = async () => ({ footprintCircuitJson: [] })
  const customFootprint = async () => ({ footprintCircuitJson: [] })
  const parserOverride = {
    loadFromUrl: async () => ({ footprintCircuitJson: [] }),
  }
  const customParser = {
    loadFromUrl: async () => ({ footprintCircuitJson: [] }),
  }
  const staticLoaderOverride = async () => ({
    __esModule: true as const,
    default: [],
  })
  const customStaticLoader = async () => ({
    __esModule: true as const,
    default: [],
  })
  const autorouterOverride = {
    createAutorouter: () => ({
      run: async () => {},
      getOutputSimpleRouteJson: async () => ({}),
    }),
  }
  const customAutorouter = {
    createAutorouter: () => ({
      run: async () => {},
      getOutputSimpleRouteJson: async () => ({}),
    }),
  }
  const spiceEngineOverride = {
    simulate: async () => ({ simulationResultCircuitJson: [] }),
  }
  const customSpiceEngine = {
    simulate: async () => ({ simulationResultCircuitJson: [] }),
  }
  const userConfig: PlatformConfig = {
    footprintLibraryMap: {
      kicad: footprintOverride,
      custom: customFootprint,
    },
    footprintFileParserMap: {
      kicad_mod: parserOverride,
      custom_footprint: customParser,
    },
    staticFileLoaderMap: {
      kicad_sym: staticLoaderOverride,
      custom_asset: customStaticLoader,
    },
    autorouterMap: {
      krt: autorouterOverride,
      custom: customAutorouter,
    },
    spiceEngineMap: {
      ngspice: spiceEngineOverride,
      custom: customSpiceEngine,
    },
  }

  const platformConfig = getPlatformConfigWithCliDefaults(userConfig)

  expect(platformConfig.footprintLibraryMap?.kicad).toBe(footprintOverride)
  expect(platformConfig.footprintLibraryMap?.custom).toBe(customFootprint)
  expect(typeof platformConfig.footprintLibraryMap?.jlcpcb).toBe("function")
  expect(platformConfig.footprintFileParserMap?.kicad_mod).toBe(parserOverride)
  expect(platformConfig.footprintFileParserMap?.custom_footprint).toBe(
    customParser,
  )
  expect(platformConfig.staticFileLoaderMap?.kicad_sym).toBe(
    staticLoaderOverride,
  )
  expect(platformConfig.staticFileLoaderMap?.custom_asset).toBe(
    customStaticLoader,
  )
  expect(typeof platformConfig.staticFileLoaderMap?.kicad_pcb).toBe("function")
  expect(platformConfig.autorouterMap?.krt).toBe(autorouterOverride)
  expect(platformConfig.autorouterMap?.custom).toBe(customAutorouter)
  expect(platformConfig.spiceEngineMap?.ngspice).toBe(spiceEngineOverride)
  expect(platformConfig.spiceEngineMap?.custom).toBe(customSpiceEngine)
})
