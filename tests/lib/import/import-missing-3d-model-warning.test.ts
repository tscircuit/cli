import { expect, spyOn, test } from "bun:test"
import { rm } from "node:fs/promises"
import { registerImport } from "cli/import/register"
import { Command } from "commander"
import { importComponentFromJlcpcb } from "lib/import/import-component-from-jlcpcb"
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

const mockEasyEda = (raw: typeof rawRegulator) =>
  spyOn(globalThis, "fetch").mockImplementation(
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

const getModel3d = async (
  raw: typeof rawRegulator,
  useExactFootprint: boolean,
) => {
  const directory = temporaryDirectory()
  const fetchMock = mockEasyEda(raw)
  try {
    const { model3d } = await importComponentFromJlcpcb("C460327", directory, {
      excludePinAttributes: true,
      useExactFootprint,
    })
    return model3d
  } finally {
    fetchMock.mockRestore()
    await rm(directory, { recursive: true, force: true })
  }
}

const runImportCommand = async (raw: typeof rawRegulator, args: string[]) => {
  const directory = temporaryDirectory()
  const previousCwd = process.cwd()
  const fetchMock = mockEasyEda(raw)
  const warnMock = spyOn(console, "warn").mockImplementation(() => {})
  try {
    process.chdir(directory)
    const program = new Command()
    registerImport(program)
    await program.parseAsync(
      ["import", "--jlcpcb", "--exclude-pin-attributes", ...args, "C460327"],
      { from: "user" },
    )
    return warnMock.mock.calls.map((call) => call.join(" ")).join("\n")
  } finally {
    process.chdir(previousCwd)
    warnMock.mockRestore()
    fetchMock.mockRestore()
    await rm(directory, { recursive: true, force: true })
  }
}

test("import result reports a supplier cad model as an available 3D model", async () => {
  expect(await getModel3d(rawRegulator, true)).toEqual({
    isAvailable: true,
    source: "cad-model",
  })
})

test("import result reports a footprinter string as an available 3D model", async () => {
  expect(await getModel3d(rawWithout3dModel, false)).toEqual({
    isAvailable: true,
    source: "footprinter-string",
    footprinterString: expect.stringMatching(/^sot25/),
  })
})

test("import result reports no 3D model for an exact footprint without a cad model", async () => {
  const model3d = await getModel3d(rawWithout3dModel, true)
  if (model3d.isAvailable) throw new Error("Expected no 3D model")
  expect(model3d.closestFootprinter?.footprinterString).toMatch(/^sot25/)
})

test("tsci import warns and recommends a footprinter model when a chip has no 3D model", async () => {
  const warnings = await runImportCommand(rawWithout3dModel, [
    "--use-exact-footprint",
  ])

  expect(warnings).toContain("No 3D model is available")
  expect(warnings).toContain("AP2127K_2_8TRG1.tsx")
  expect(warnings).toMatch(/cadModel="sot25[^"]*"\n/)
  expect(warnings).toMatch(
    /"sot25[^"]*" is the closest footprinter match \(99\.\d\d% copper IoU\)/,
  )
})

test("tsci import does not warn when a 3D model is available", async () => {
  expect(await runImportCommand(rawRegulator, ["--use-exact-footprint"])).toBe(
    "",
  )
  expect(await runImportCommand(rawWithout3dModel, [])).toBe("")
})
