import { expect, spyOn, test } from "bun:test"
import { Command } from "commander"
import { registerImport } from "cli/import/register"
import { findBoardFiles } from "lib/shared/find-board-files"
import { readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { temporaryDirectory } from "tempy"
import rawRegulator from "tests/fixtures/assets/datasheets/C460327.raweasy.json"

const partNumber = "AP2127K-2.8TRG1"
const packageName = "author/reference-regulator"
const releaseId = "successful-build"
const designSource = "export default () => <board />\n"
const componentSource = "export const AP2127K_2_8TRG1 = () => <chip />\n"

for (const scenario of ["supplier", "datasheet", "failed-download"] as const) {
  test(`tsci import handles reference design source (${scenario})`, async () => {
    const projectDir = temporaryDirectory()
    const previousCwd = process.cwd()
    const destination = path.join(projectDir, "reference-designs", packageName)
    const boardFile = path.join(destination, "index.circuit.tsx")
    const componentFile = path.join(projectDir, "imports/AP2127K_2_8TRG1.tsx")
    const requestedFiles: string[] = []
    const mock = spyOn(globalThis, "fetch").mockImplementation(
      Object.assign(
        async (input: Parameters<typeof fetch>[0]) => {
          const url = new URL(input instanceof Request ? input.url : input)
          if (url.pathname.endsWith("/reference-design-packages.json")) {
            return Response.json({
              packages: [packageName, "author/other-design"],
            })
          }
          if (url.pathname.endsWith("/packages/get")) {
            return Response.json({
              package: {
                is_private: false,
                last_built_release_id:
                  url.searchParams.get("name") === packageName
                    ? releaseId
                    : "other-build",
              },
            })
          }
          if (url.pathname.endsWith("/package_files/get")) {
            expect(url.searchParams.get("file_path")).toBe("dist/preview.json")
            const part =
              url.searchParams.get("package_release_id") === releaseId
                ? ` ${partNumber.toLowerCase()} `
                : "AP2127K-3.3TRG1"
            return Response.json({
              package_file: {
                content_text: JSON.stringify({
                  version: 2,
                  componentPartNumbers: [part],
                }),
              },
            })
          }
          if (url.pathname.endsWith("/package_files/list")) {
            expect(url.searchParams.get("package_release_id")).toBe(releaseId)
            return Response.json({
              package_files: [
                { file_path: "index.circuit.tsx", package_file_id: "source" },
                {
                  file_path: "imports/regulator.tsx",
                  package_file_id: "component",
                },
                { file_path: "dist/preview.json", package_file_id: "preview" },
              ],
            })
          }
          if (url.pathname.endsWith("/package_files/download")) {
            const fileId = url.searchParams.get("package_file_id")!
            requestedFiles.push(fileId)
            if (fileId === "source") return new Response(designSource)
            if (scenario === "failed-download")
              return new Response(null, { status: 502 })
            return new Response(componentSource)
          }
          if (url.hostname === "jlcsearch.tscircuit.com") {
            return Response.json({
              components:
                scenario === "datasheet"
                  ? []
                  : [{ lcsc: 460327, mfr: partNumber }],
            })
          }
          if (url.pathname.endsWith("/datasheets/get")) {
            return Response.json({
              datasheet: {
                chip_name: partNumber,
                pin_attributes: null,
                generated_tsx: componentSource,
              },
            })
          }
          if (url.pathname === "/api/components/search") {
            return Response.json({
              success: true,
              result: { lists: { lcsc: [rawRegulator] } },
            })
          }
          if (url.pathname === `/api/components/${rawRegulator.uuid}`) {
            return Response.json({ success: true, result: rawRegulator })
          }
          return new Response(null, { status: 404 })
        },
        { preconnect: fetch.preconnect },
      ),
    )
    const runImport = async () => {
      const program = new Command()
      registerImport(program)
      await program.parseAsync(
        ["import", scenario === "datasheet" ? partNumber : "C460327"],
        { from: "user" },
      )
    }
    try {
      process.chdir(projectDir)
      await runImport()
      expect(await Bun.file(componentFile).exists()).toBe(true)
      expect(requestedFiles).toEqual(["source", "component"])
      if (scenario === "failed-download") {
        expect(await Bun.file(boardFile).exists()).toBe(false)
        return
      }
      expect(await readFile(boardFile, "utf8")).toBe(designSource)
      expect(
        await readFile(path.join(destination, "imports/regulator.tsx"), "utf8"),
      ).toBe(componentSource)
      expect(findBoardFiles({ projectDir })).toEqual([])
      await writeFile(boardFile, "// local edit\n")
      await runImport()
      expect(await readFile(boardFile, "utf8")).toBe("// local edit\n")
      expect(requestedFiles).toEqual(["source", "component"])
    } finally {
      process.chdir(previousCwd)
      mock.mockRestore()
      await rm(projectDir, { recursive: true, force: true })
    }
  }, 20_000)
}
