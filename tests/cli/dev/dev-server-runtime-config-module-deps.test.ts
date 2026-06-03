import { expect, test } from "bun:test"
import { DevServer } from "cli/dev/DevServer"
import getPort from "get-port"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("dev server uploads node_modules dependencies imported by tscircuit.config.ts", async () => {
  const fixture = await getCliTestFixture()
  const projectDir = fixture.tmpDir

  await writeFile(
    join(projectDir, "index.circuit.tsx"),
    `
export default () => (
  <board width="10mm" height="10mm">
    <resistor name="R1" resistance="10k" />
  </board>
)
`,
  )

  await writeFile(
    join(projectDir, "tscircuit.config.ts"),
    `
import { createTiPlatformConfig } from "@tscircuit/ti-parts-engine"

export default {
  platformConfig: createTiPlatformConfig({
    partnerToken: "secret-token",
  }),
}
`,
  )

  await writeFile(
    join(projectDir, "package.json"),
    JSON.stringify(
      {
        name: "test-project",
        version: "1.0.0",
        dependencies: {
          "@tscircuit/ti-parts-engine": "1.0.0",
        },
      },
      null,
      2,
    ),
  )

  const pkgDir = join(projectDir, "node_modules", "@tscircuit", "ti-parts-engine")
  const libDir = join(pkgDir, "lib", "ti-parts-engine")
  await mkdir(libDir, { recursive: true })

  await writeFile(
    join(pkgDir, "package.json"),
    JSON.stringify(
      {
        name: "@tscircuit/ti-parts-engine",
        version: "1.0.0",
        main: "./index.ts",
        module: "./index.ts",
        exports: {
          ".": {
            import: "./index.ts",
            types: "./index.ts",
          },
        },
      },
      null,
      2,
    ),
  )

  await writeFile(
    join(pkgDir, "index.ts"),
    `
export { createTiPlatformConfig } from "./lib/ti-parts-engine/createTiPlatformConfig"
`,
  )

  await writeFile(
    join(libDir, "createTiPlatformConfig.ts"),
    `
export const createTiPlatformConfig = (options: { partnerToken: string }) => ({
  footprintLibraryMap: {
    ti: async () => ({
      footprintCircuitJson: [],
      partnerToken: options.partnerToken,
    }),
  },
})
`,
  )

  const devServer = new DevServer({
    port: await getPort(),
    componentFilePath: join(projectDir, "index.circuit.tsx"),
  })

  try {
    await devServer.start()

    const { file_list } = (await devServer.fsKy
      .get("api/files/list")
      .json()) as { file_list: Array<{ file_path: string }> }

    const filePaths = file_list.map((f) => f.file_path)

    expect(filePaths).toContain("tscircuit.config.ts")
    expect(filePaths).toContain("node_modules/@tscircuit/ti-parts-engine/index.ts")
    expect(filePaths).toContain(
      "node_modules/@tscircuit/ti-parts-engine/lib/ti-parts-engine/createTiPlatformConfig.ts",
    )
  } finally {
    await devServer.stop()
  }
}, 30_000)
