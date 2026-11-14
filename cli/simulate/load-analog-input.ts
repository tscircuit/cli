import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { gunzipSync } from "node:zlib"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"

export const loadAnalogInput = async ({
  file,
  projectDir,
  platformConfig,
}: {
  file: string
  projectDir: string
  platformConfig: PlatformConfig
}) => {
  if (!file.endsWith(".json") && !file.endsWith(".json.gz")) {
    return generateCircuitJson({
      filePath: resolve(file),
      projectDir,
      platformConfig: {
        ...platformConfig,
        platformFetch: Object.assign(
          async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
            if (typeof input === "string" && !URL.canParse(input))
              return new Response(await readFile(resolve(projectDir, input)))
            return (platformConfig.platformFetch ?? fetch)(input, init)
          },
          {
            preconnect:
              platformConfig.platformFetch?.preconnect ?? fetch.preconnect,
          },
        ),
      },
    })
  }

  const bytes = await readFile(resolve(file))
  const circuitJson = JSON.parse(
    (file.endsWith(".gz") ? gunzipSync(bytes) : bytes).toString(),
  )
  if (!Array.isArray(circuitJson)) {
    throw new Error("Expected an array of Circuit JSON records")
  }
  return {
    circuitJson: circuitJson as AnyCircuitElement[],
  }
}
