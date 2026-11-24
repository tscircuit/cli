import type { PlatformConfig } from "@tscircuit/props"

export function withSpiceSimulationStatus(
  spiceEngineMap: PlatformConfig["spiceEngineMap"],
  log: (message: string) => void,
): PlatformConfig["spiceEngineMap"] {
  if (!spiceEngineMap) return spiceEngineMap

  return Object.fromEntries(
    Object.entries(spiceEngineMap).map(([engineName, spiceEngine]) => [
      engineName,
      {
        ...spiceEngine,
        async simulate(spiceString: string) {
          const startedAt = performance.now()
          log(`Running ${engineName} simulation...`)
          const interval = setInterval(() => {
            const elapsedSeconds = Math.floor(
              (performance.now() - startedAt) / 1000,
            )
            log(
              `Still running ${engineName} simulation (${elapsedSeconds}s wall-clock elapsed)...`,
            )
          }, 30_000)
          interval.unref?.()

          try {
            return await spiceEngine.simulate(spiceString)
          } finally {
            clearInterval(interval)
          }
        },
      },
    ]),
  )
}
