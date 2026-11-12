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
const releaseId = "88ae1129-961b-43dc-8e68-d66c8d5a6b27"
const designSource = "export default () => <board />\n"
const componentSource = "export const AP2127K_2_8TRG1 = () => <chip />\n"

for (const scenario of [
  "supplier",
  "datasheet",
  "failed-download",
  "no-reference",
] as const) {
  test(`tsci import handles reference design source (${scenario})`, async () => {
    const projectDir = temporaryDirectory()
    const previousCwd = process.cwd()
    const importsDir = path.join(projectDir, "imports")
    const componentDir = path.join(importsDir, "AP2127K_2_8TRG1")
    const destination = path.join(
      componentDir,
      "references",
      "author.reference-regulator",
    )
    const boardFile = path.join(destination, "index.circuit.tsx")
    const componentFile = path.join(
      scenario === "no-reference" ? importsDir : componentDir,
      "AP2127K_2_8TRG1.tsx",
    )
    const requestedFiles: string[] = []
    const mock = spyOn(globalThis, "fetch").mockImplementation(
      Object.assign(
        async (input: Parameters<typeof fetch>[0]) => {
          const url = new URL(input instanceof Request ? input.url : input)
          if (url.pathname.endsWith("/datasheets/list_reference_designs")) {
            expect(url.searchParams.get("chip_name")).toBe(partNumber)
            return Response.json({
              reference_designs:
                scenario === "no-reference"
                  ? []
                  : [{ name: packageName, package_release_id: releaseId }],
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
      if (scenario === "no-reference") {
        expect(requestedFiles).toEqual([])
        return
      }
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
      expect(findBoardFiles({ projectDir: destination })).toEqual([boardFile])
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
