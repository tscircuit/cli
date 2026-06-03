import { afterEach, expect, test } from "bun:test"
import { mkdir, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import getPort from "get-port"
import { temporaryDirectory } from "tempy"
import { createHttpServer } from "lib/server/createHttpServer"
import { DEV_RUNTIME_CONFIG_FUNCTION_REF_KEY } from "lib/server/dev-runtime-config"

const tempDirs: string[] = []

afterEach(async () => {
  delete process.env.TEST_TI_PARTNER_TOKEN
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  )
})

const closeServer = (server: { close: (callback: () => void) => void }) =>
  new Promise<void>((resolve) => server.close(resolve))

test("dev runtime-config API proxies function-valued platform config without serializing closures", async () => {
  const tmpDir = temporaryDirectory()
  tempDirs.push(tmpDir)
  const port = await getPort()

  await mkdir(join(tmpDir, "boards"), { recursive: true })
  await writeFile(join(tmpDir, ".env"), "TEST_TI_PARTNER_TOKEN=secret-token\n")
  await writeFile(
    join(tmpDir, "tscircuit.config.ts"),
    [
      "export default {",
      '  includeBoardFiles: ["boards/**/*.board.tsx"],',
      "  platformConfig: {",
      "    partsEngineDisabled: true,",
      "    footprintLibraryMap: {",
      "      ti: async (partName: string) => {",
      "        if (process.env.TEST_TI_PARTNER_TOKEN !== 'secret-token') {",
      "          throw new Error('missing token')",
      "        }",
      "        return {",
      "          footprintCircuitJson: [",
      "            { type: 'source_component', name: partName },",
      "          ],",
      "        }",
      "      },",
      "    },",
      "  },",
      "}",
      "",
    ].join("\n"),
  )

  const { server } = await createHttpServer({ port, projectDir: tmpDir })
  try {
    const runtimeConfigResponse = await fetch(
      `http://localhost:${port}/api/dev/runtime-config`,
    )
    const runtimeConfigPayload = await runtimeConfigResponse.json()
    const serializedPayload = JSON.stringify(runtimeConfigPayload)

    expect(runtimeConfigResponse.ok).toBe(true)
    expect(serializedPayload).not.toContain("secret-token")
    expect(runtimeConfigPayload.platformConfig.includeBoardFiles).toEqual([
      "boards/**/*.board.tsx",
    ])
    expect(runtimeConfigPayload.platformConfig.partsEngineDisabled).toBe(true)

    const tiLoader =
      runtimeConfigPayload.platformConfig.footprintLibraryMap.ti[
        DEV_RUNTIME_CONFIG_FUNCTION_REF_KEY
      ]
    expect(tiLoader).toBe(true)

    const rpcResponse = await fetch(
      `http://localhost:${port}/api/dev/runtime-config/rpc`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target:
            runtimeConfigPayload.platformConfig.footprintLibraryMap.ti.target,
          args: ["MSP430"],
        }),
      },
    )
    const rpcPayload = await rpcResponse.json()

    expect(rpcResponse.ok).toBe(true)
    expect(rpcPayload.result.footprintCircuitJson).toEqual([
      { type: "source_component", name: "MSP430" },
    ])
  } finally {
    await closeServer(server)
  }
})
