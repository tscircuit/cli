import { expect, spyOn, test } from "bun:test"
import { readFile, rm } from "node:fs/promises"
import path from "node:path"
import { temporaryDirectory } from "tempy"
import { Command } from "commander"
import { registerImport } from "cli/import/register"

for (const withModel of [false, true]) {
  test(`standalone CC2564CRVMR import ${withModel ? "with" : "without"} a model`, async () => {
    const generatedTsx = `export const CC2564CRVMR = () => <chip footprint="qfn76" ${withModel ? 'cadModel={{ stepUrl: "./chip.step" }}' : ""} />`
    const fetchMock = spyOn(globalThis, "fetch").mockImplementation(
      Object.assign(
        async (input: Parameters<typeof fetch>[0]) => {
          expect(new URL(String(input)).pathname).toEndWith("/datasheets/get")
          return Response.json({
            datasheet: {
              chip_name: "CC2564CRVMR",
              generated_tsx: generatedTsx,
            },
          })
        },
        { preconnect: fetch.preconnect },
      ),
    )
    const warning = spyOn(console, "warn").mockImplementation(() => {})
    const directory = temporaryDirectory()
    const previousDirectory = process.cwd()
    const previousStandalone = process.env.TSCIRCUIT_STANDALONE
    try {
      process.env.TSCIRCUIT_STANDALONE = "1"
      process.chdir(directory)
      const program = new Command()
      registerImport(program)
      await program.parseAsync(["import", "CC2564CRVMR"], { from: "user" })
      expect(
        await readFile(path.join(directory, "imports/CC2564CRVMR.tsx"), "utf8"),
      ).toBe(generatedTsx)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(warning).toHaveBeenCalledTimes(withModel ? 0 : 1)
      if (!withModel)
        expect(warning.mock.calls[0][0]).toContain(
          "CC2564CRVMR was imported without an explicit 3D model",
        )
    } finally {
      process.chdir(previousDirectory)
      if (previousStandalone === undefined)
        delete process.env.TSCIRCUIT_STANDALONE
      else process.env.TSCIRCUIT_STANDALONE = previousStandalone
      fetchMock.mockRestore()
      warning.mockRestore()
      await rm(directory, { recursive: true, force: true })
    }
  })
}
