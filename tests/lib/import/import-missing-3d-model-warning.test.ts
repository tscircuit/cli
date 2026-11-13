import { expect, spyOn, test } from "bun:test"
import { rm } from "node:fs/promises"
import { registerImport } from "cli/import/register"
import { Command } from "commander"
import { tsxHas3dModel } from "lib/import/tsx-has-3d-model"
import { temporaryDirectory } from "tempy"
import rawRegulator from "../../fixtures/assets/datasheets/C460327.raweasy.json"

// The same SOT-23-5 regulator, with EasyEDA's 3D model reference removed
const rawWithout3dModel = {
  ...rawRegulator,
  packageDetail: {
    ...rawRegulator.packageDetail,
    dataStr: {
      ...rawRegulator.packageDetail.dataStr,
      shape: rawRegulator.packageDetail.dataStr.shape.filter(
        (shape) => !shape.startsWith("SVGNODE"),
      ),
    },
  },
}

const runImport = async (raw: typeof rawRegulator, args: string[]) => {
  const directory = temporaryDirectory()
  const previousCwd = process.cwd()
  const fetchMock = spyOn(globalThis, "fetch").mockImplementation(
    Object.assign(
      async (input: Parameters<typeof fetch>[0]) => {
        const url = new URL(String(input))
        if (url.pathname === "/api/search")
          return Response.json({ components: [] })
        if (url.pathname === "/api/components/search")
          return Response.json({
            success: true,
            result: { lists: { lcsc: [raw] } },
          })
        if (url.pathname === `/api/components/${raw.uuid}`)
          return Response.json({ success: true, result: raw })
        return new Response(null, { status: 404 })
      },
      { preconnect: fetch.preconnect },
    ),
  )
  const warnMock = spyOn(console, "warn").mockImplementation(() => {})
  try {
    process.chdir(directory)
    const program = new Command()
    registerImport(program)
    await program.parseAsync(
      ["import", "--jlcpcb", "--exclude-pin-attributes", ...args, "C460327"],
      { from: "user" },
    )
    return {
      source: await Bun.file(`${directory}/imports/AP2127K_2_8TRG1.tsx`).text(),
      warnings: warnMock.mock.calls.map((call) => call.join(" ")).join("\n"),
    }
  } finally {
    process.chdir(previousCwd)
    warnMock.mockRestore()
    fetchMock.mockRestore()
    await rm(directory, { recursive: true, force: true })
  }
}

test("tsci import warns and recommends a footprinter model when a chip has no 3D model", async () => {
  const { source, warnings } = await runImport(rawWithout3dModel, [
    "--use-exact-footprint",
  ])

  expect(source).not.toContain("cadModel")
  expect(source).toContain("footprint={<footprint>")
  expect(warnings).toContain("No 3D model is available")
  expect(warnings).toContain("AP2127K_2_8TRG1.tsx")
  expect(warnings).toMatch(/cadModel="sot25[^"]*"\n/)
  expect(warnings).toMatch(
    /"sot25[^"]*" is the closest footprinter match \(99\.\d\d% copper IoU\)/,
  )
})

test("tsci import does not warn when the part has a 3D model", async () => {
  const { source, warnings } = await runImport(rawRegulator, [
    "--use-exact-footprint",
  ])

  expect(source).toContain("cadModel={{")
  expect(warnings).toBe("")
})

test("tsci import does not warn when a footprinter footprint supplies the 3D model", async () => {
  const { source, warnings } = await runImport(rawWithout3dModel, [])

  expect(source).not.toContain("cadModel")
  expect(source).toMatch(/footprint="sot25/)
  expect(warnings).toBe("")
})

test("tsxHas3dModel", () => {
  expect(tsxHas3dModel(`<chip footprint={<footprint></footprint>} />`)).toBe(
    false,
  )
  expect(tsxHas3dModel(`<chip footprint="soic8" />`)).toBe(true)
  expect(
    tsxHas3dModel(`<chip footprint={<footprint />} cadModel="soic8" />`),
  ).toBe(true)
  expect(
    tsxHas3dModel(`<chip footprint={<footprint />} cadModel={{ objUrl }} />`),
  ).toBe(true)
})

test("tsci import warns when standalone generated TSX has no 3D model", async () => {
  const directory = temporaryDirectory()
  const previousCwd = process.cwd()
  const previousStandalone = process.env.TSCIRCUIT_STANDALONE
  const fetchMock = spyOn(globalThis, "fetch").mockImplementation(
    Object.assign(
      async () =>
        Response.json({
          datasheet: {
            chip_name: "AP2127K-2.8TRG1",
            pin_attributes: null,
            generated_tsx:
              "export const AP2127K_2_8TRG1 = () => <chip footprint={<footprint />} />\n",
          },
        }),
      { preconnect: fetch.preconnect },
    ),
  )
  const warnMock = spyOn(console, "warn").mockImplementation(() => {})
  try {
    process.env.TSCIRCUIT_STANDALONE = "1"
    process.chdir(directory)
    const program = new Command()
    registerImport(program)
    await program.parseAsync(["import", "AP2127K-2.8TRG1"], { from: "user" })
    const warnings = warnMock.mock.calls
      .map((call) => call.join(" "))
      .join("\n")
    expect(warnings).toContain("No 3D model is available")
    expect(warnings).toContain('cadModel="soic8"\n')
    expect(warnings).toContain("Replace")
  } finally {
    if (previousStandalone === undefined)
      delete process.env.TSCIRCUIT_STANDALONE
    else process.env.TSCIRCUIT_STANDALONE = previousStandalone
    process.chdir(previousCwd)
    warnMock.mockRestore()
    fetchMock.mockRestore()
    await rm(directory, { recursive: true, force: true })
  }
})
