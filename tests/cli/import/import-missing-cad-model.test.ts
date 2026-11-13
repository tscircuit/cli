import { expect, spyOn, test } from "bun:test"
import { readFile, rm } from "node:fs/promises"
import path from "node:path"
import { temporaryDirectory } from "tempy"
import { importJlcpcbPart } from "cli/import/import-jlcpcb-part"
import rawRegulator from "tests/fixtures/assets/datasheets/C460327.raweasy.json"

for (const useExactFootprint of [false, true]) {
  for (const withModel of [false, true]) {
    for (const download of [false, true]) {
      test(`JLCPCB import ${withModel ? "with" : "without"} a model (download=${download}, exact=${useExactFootprint})`, async () => {
        const raw = structuredClone(rawRegulator)
        if (!withModel) {
          raw.packageDetail.dataStr.shape =
            raw.packageDetail.dataStr.shape.filter(
              (shape) => !shape.startsWith("SVGNODE~"),
            )
          delete (raw.packageDetail.dataStr.head as Record<string, unknown>)
            .uuid_3d
          delete (
            raw.packageDetail.dataStr.head.c_para as Record<string, unknown>
          )["3DModel"]
        }
        const fetchMock = spyOn(globalThis, "fetch").mockImplementation(
          Object.assign(
            async (input: Parameters<typeof fetch>[0]) => {
              const url = new URL(String(input))
              if (url.pathname === "/api/components/search") {
                return Response.json({
                  success: true,
                  result: { lists: { lcsc: [raw] } },
                })
              }
              if (url.pathname === `/api/components/${raw.uuid}`) {
                return Response.json({ success: true, result: raw })
              }
              if (url.hostname === "modelcdn.tscircuit.com")
                return new Response("model fixture")
              throw new Error(`Unexpected request: ${url}`)
            },
            { preconnect: fetch.preconnect },
          ),
        )
        const warning = spyOn(console, "warn").mockImplementation(() => {})
        const directory = temporaryDirectory()
        const previousDirectory = process.cwd()
        try {
          process.chdir(directory)
          await importJlcpcbPart({
            partNumber: "C460327",
            download,
            useExactFootprint,
            excludePinAttributes: true,
          })
          const component = "AP2127K_2_8TRG1"
          const filePath = path.join(
            directory,
            "imports",
            ...(download ? [component] : []),
            `${component}.tsx`,
          )
          const source = await readFile(filePath, "utf8")
          expect(source).toContain("<chip")
          expect(source.includes("cadModel")).toBe(withModel)
          expect(warning).toHaveBeenCalledTimes(withModel ? 0 : 1)
          if (!withModel) {
            expect(warning.mock.calls[0][0]).toContain(
              "Warning: No 3D model found for C460327.",
            )
          }
        } finally {
          process.chdir(previousDirectory)
          warning.mockRestore()
          fetchMock.mockRestore()
          await rm(directory, { recursive: true, force: true })
        }
      })
    }
  }
}
