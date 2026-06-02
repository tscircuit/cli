import type { PlatformConfig } from "@tscircuit/props"

export const mergePlatformConfigs = (
  ...configs: Array<PlatformConfig | null | undefined>
): PlatformConfig | undefined => {
  const definedConfigs = configs.filter(Boolean) as PlatformConfig[]

  if (definedConfigs.length === 0) {
    return undefined
  }

  return definedConfigs.reduce<PlatformConfig>((mergedConfig, config) => {
    return {
      ...mergedConfig,
      ...config,
      footprintLibraryMap: {
        ...mergedConfig.footprintLibraryMap,
        ...config.footprintLibraryMap,
      },
      footprintFileParserMap: {
        ...mergedConfig.footprintFileParserMap,
        ...config.footprintFileParserMap,
      },
      staticFileLoaderMap: {
        ...mergedConfig.staticFileLoaderMap,
        ...config.staticFileLoaderMap,
      },
      autorouterMap: {
        ...mergedConfig.autorouterMap,
        ...config.autorouterMap,
      },
      spiceEngineMap: {
        ...mergedConfig.spiceEngineMap,
        ...config.spiceEngineMap,
      },
    }
  }, {})
}
