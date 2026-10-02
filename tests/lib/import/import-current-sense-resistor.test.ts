import { expect, spyOn, test } from "bun:test"
import { readFile, rm } from "node:fs/promises"
import { temporaryDirectory } from "tempy"
import { importComponentFromJlcpcb } from "lib/import/import-component-from-jlcpcb"
import rawResistor from "../../fixtures/assets/C5127775.raweasy.json"

for (const useExactFootprint of [true, false]) {
  test(`current-sense resistor import retains 180mΩ (${useExactFootprint ? "exact" : "compact"})`, async () => {
    const directory = temporaryDirectory()
    const fetchMock = spyOn(globalThis, "fetch").mockImplementation(
      Object.assign(
        async (input: Parameters<typeof fetch>[0]) => {
          const url = new URL(String(input))
          if (url.pathname === "/api/components/search") {
            return Response.json({
              success: true,
              result: { lists: { lcsc: [rawResistor] } },
            })
          }
          if (url.pathname === `/api/components/${rawResistor.uuid}`) {
            return Response.json({ success: true, result: rawResistor })
          }
          if (url.hostname === "modelcdn.tscircuit.com") {
            return new Response(null, { status: 404 })
          }
          throw new Error(`Unexpected fetch: ${url}`)
        },
        { preconnect: fetch.preconnect },
      ),
    )

    try {
      expect(rawResistor.dataStr.head.c_para.pre).toBe("U?")
      expect(rawResistor.dataStr.head.c_para.Value).toBe("180mΩ")
      const { filePath } = await importComponentFromJlcpcb(
        "C5127775",
        directory,
        { useExactFootprint, excludePinAttributes: true },
      )
      const source = await readFile(filePath, "utf8")
      expect(source).toContain("<resistor")
      expect(source).toContain('resistance="180mohm"')
      expect(source).toContain('"C5127775"')
      expect(source).not.toContain("<chip")
      if (useExactFootprint) {
        expect(source).toContain('pcbX="-1.478788mm"')
        expect(source).toContain('pcbX="1.478788mm"')
        expect(source.match(/<smtpad\b/g)).toHaveLength(2)
      }
    } finally {
      fetchMock.mockRestore()
      await rm(directory, { recursive: true, force: true })
    }
  })
}
